/**
 * Phase 3 priority CMS import: hau_cms → ccshau_pages (upsert by slug, no wipe).
 *
 * Scope (priority only — not all 1.6k rows):
 *   1. Header/menu university pages (About, History, Admissions, Awards, …)
 *   2. Academic college “About” bodies (longest about-* per college)
 *
 * HTML is sanitized before write. Existing longer content is preserved.
 *
 * Usage:
 *   node apply-phase3-priority.mjs --confirm
 *
 * Env (MySQL): LEGACY_MYSQL_*
 * Env (Supabase): apps/web/.env.local — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");

/** Target slug → candidate legacy page_slug values (pick longest HTML). */
const PRIORITY_PAGE_MAP = [
  { target: "about", sources: ["home"], preferred: "home" },
  { target: "history", sources: ["history"] },
  {
    target: "vision-mission",
    sources: ["vision", "vision-extension", "mandate"],
    combine: true,
  },
  { target: "admissions", sources: ["admission2020-21", "a-d-m-i-s-s-i-o-n"] },
  { target: "awards", sources: ["awards-3", "awards-2", "awards-and-honors"] },
  { target: "hostel", sources: ["hostel"] },
  { target: "sports", sources: ["sports", "sports-facilities"] },
  { target: "hospital", sources: ["hospital"] },
  { target: "board-of-management", sources: ["board-of-management"] },
  { target: "vice-chancellor", sources: ["vice-chancellor"] },
  {
    target: "directorate-of-research",
    sources: ["directorate-of-research"],
  },
  {
    target: "directorate-of-extension-education",
    sources: ["directorate-of-extension-education"],
  },
  { target: "nehru-library", sources: ["library", "nehru-library"] },
  { target: "ug-studies", sources: ["ug-studies"] },
  {
    target: "scholarships-fellowships",
    sources: ["scholarship-fellowships", "scholarships-and-stipends"],
  },
  {
    target: "university-calendar-volume-ii",
    sources: ["university-calander-volume-i-i", "university-calendar-volume-ii"],
  },
  // Prefer land-scape-unit-1 (college_id 21 on live API) — land-scape-unit dump often loses Hindi as "????".
  { target: "landscape-unit", sources: ["land-scape-unit-1", "land-scape-unit"], preferred: "land-scape-unit-1" },
  {
    target: "human-resource-management",
    sources: ["human-resources", "human-resource-management", "hrm"],
  },
  {
    target: "international-linkage",
    sources: [
      "international-mo-u",
      "international-collaboration",
      "international-collaboration-1",
    ],
  },
  { target: "pg-studies", sources: ["p-g-course-catalogue", "pg-studies"] },
];

/** Legacy college_id → preferred live page slug (Phase 2 aliases applied). */
const COLLEGE_SLUG_BY_LEGACY_ID = {
  2: "college-of-agriculture-hisar",
  6: "college-of-agriculture-kaul",
  7: "college-of-agriculture-bawal",
  8: "centre-of-food-science-technology",
  9: "ic-college-of-community-science",
  10: "college-basic-sciences-humanities",
  11: "college-of-agricultural-engineering-and-technology",
  65: "college-of-fisheries-science",
  67: "college-of-biotechnology",
};

const MIN_HTML_LEN = 80;
/** Don't replace existing content that is already this much longer than source. */
const PRESERVE_RICHER_DELTA = 200;

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

function loadFromWeb(name) {
  const req = createRequire(join(ROOT, "apps/web/package.json"));
  return req(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");
const sanitizeHtml = loadFromWeb("sanitize-html");

const SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "span",
    "div",
    "section",
    "article",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    "iframe",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "style", "title", "lang", "dir"],
    a: ["href", "name", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "width", "height", "class", "loading"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "class",
      "style",
      "allow",
      "allowfullscreen",
      "loading",
      "referrerpolicy",
      "sandbox",
      "frameborder",
      "name",
    ],
    td: ["colspan", "rowspan", "class", "style"],
    th: ["colspan", "rowspan", "class", "style", "scope"],
    col: ["span", "width", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

const HAS_HTML_TAG = /<[a-z][\s\S]*>/i;
const HAS_BLOCK_HTML =
  /<(p|div|ul|ol|li|h[1-6]|table|thead|tbody|tr|td|th|section|article|blockquote|pre|br|iframe)\b/i;

function normalizeCmsHtml(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) return "";
  if (!HAS_HTML_TAG.test(trimmed)) {
    return trimmed
      .split(/\r?\n\s*\r?\n/)
      .filter(Boolean)
      .map((block) => `<p>${block.trim().replace(/\r?\n/g, "<br />")}</p>`)
      .join("\n");
  }
  if (HAS_BLOCK_HTML.test(trimmed)) return trimmed;
  return trimmed
    .split(/\r?\n\s*\r?\n/)
    .filter(Boolean)
    .map((block) => `<p>${block.trim().replace(/\r?\n/g, "<br />")}</p>`)
    .join("\n");
}

function sanitizeCmsHtml(html) {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

function prepareHtml(raw) {
  return sanitizeCmsHtml(normalizeCmsHtml(raw));
}

function pickLongest(rows) {
  let best = null;
  for (const row of rows) {
    const len = row.page_content ? String(row.page_content).length : 0;
    if (len < MIN_HTML_LEN) continue;
    if (!best || len > best.len) {
      best = { row, len };
    }
  }
  return best;
}

async function upsertPageContent(supabase, targetSlug, html, titleHint, summary, meta) {
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en")
    .eq("slug", targetSlug)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  const existingLen = existing?.content_en ? String(existing.content_en).length : 0;
  const newLen = html.length;

  if (existing?.id) {
    if (existingLen >= newLen + PRESERVE_RICHER_DELTA) {
      summary.preserved += 1;
      summary.details.push({
        target: targetSlug,
        action: "preserved-richer",
        existingLen,
        newLen,
        ...meta,
      });
      return "preserved";
    }
    const update = {
      content_en: html,
      status: "published",
      published_at: new Date().toISOString(),
    };
    // Only fill empty title_en edge cases — keep live titles
    if (!existing.title_en && titleHint) update.title_en = titleHint;

    const { error } = await supabase.from("ccshau_pages").update(update).eq("id", existing.id);
    if (error) throw new Error(error.message);
    summary.updated += 1;
    summary.details.push({
      target: targetSlug,
      action: "updated",
      existingLen,
      newLen,
      ...meta,
    });
    return "updated";
  }

  // Insert only for missing priority pages (standard published)
  const { error } = await supabase.from("ccshau_pages").insert({
    slug: targetSlug,
    title_en: titleHint || targetSlug,
    title_hi: null,
    content_en: html,
    excerpt_en: `${titleHint || targetSlug} — CCS HAU.`,
    page_type: "standard",
    layout_template: "standard",
    status: "published",
    published_at: new Date().toISOString(),
    office_cta_enabled: true,
    sort_order: 0,
  });
  if (error) throw new Error(error.message);
  summary.inserted += 1;
  summary.details.push({
    target: targetSlug,
    action: "inserted",
    existingLen: 0,
    newLen,
    ...meta,
  });
  return "inserted";
}

async function main() {
  if (!CONFIRM) {
    console.error("Refusing to run without --confirm (live Supabase writes).");
    console.error("Usage: node apply-phase3-priority.mjs --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const mysqlConfig = {
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "root",
    password: process.env.LEGACY_MYSQL_PASSWORD || "",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  };

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const summary = {
    startedAt: new Date().toISOString(),
    mode: "phase3-priority-cms-upsert",
    wipe: false,
    menuPages: { inserted: 0, updated: 0, preserved: 0, skipped: 0, details: [] },
    collegeAbout: { inserted: 0, updated: 0, preserved: 0, skipped: 0, details: [] },
    errors: [],
  };

  console.log("Phase 3 priority CMS import (upsert, no wipe)");
  console.log(`MySQL ${mysqlConfig.host}/${mysqlConfig.database}`);
  console.log(`Supabase ${url.replace(/^https?:\/\//, "").split("/")[0]}`);

  const conn = await mysql.createConnection(mysqlConfig);
  try {
    // --- Menu / university priority pages ---
    for (const entry of PRIORITY_PAGE_MAP) {
      try {
        const [rows] = await conn.query(
          `SELECT id, page_title, page_slug, page_content, page_college
           FROM hau_cms
           WHERE page_status = '1' AND page_slug IN (?)`,
          [entry.sources],
        );

        let html = "";
        let titleHint = null;
        let sourceMeta = {};

        if (entry.combine) {
          const parts = [];
          for (const src of entry.sources) {
            const row = rows.find((r) => r.page_slug === src);
            if (!row?.page_content || String(row.page_content).length < MIN_HTML_LEN) continue;
            const piece = prepareHtml(row.page_content);
            if (!piece) continue;
            parts.push(`<!-- legacy:${src} -->\n${piece}`);
            if (!titleHint) titleHint = row.page_title;
          }
          html = parts.join("\n<hr />\n");
          sourceMeta = { sources: entry.sources.filter((s) => parts.some((p) => p.includes(`legacy:${s}`))) };
        } else if (entry.preferred) {
          const preferred = rows.find((r) => r.page_slug === entry.preferred);
          const best = preferred?.page_content
            ? { row: preferred, len: String(preferred.page_content).length }
            : pickLongest(rows);
          if (!best) {
            summary.menuPages.skipped += 1;
            summary.menuPages.details.push({
              target: entry.target,
              action: "skipped-no-source",
              sources: entry.sources,
            });
            continue;
          }
          html = prepareHtml(best.row.page_content);
          titleHint = best.row.page_title;
          sourceMeta = {
            sourceSlug: best.row.page_slug,
            sourceId: best.row.id,
            sourceLen: best.len,
            preferred: entry.preferred,
          };
        } else {
          const best = pickLongest(rows);
          if (!best) {
            summary.menuPages.skipped += 1;
            summary.menuPages.details.push({
              target: entry.target,
              action: "skipped-no-source",
              sources: entry.sources,
            });
            continue;
          }
          html = prepareHtml(best.row.page_content);
          titleHint = best.row.page_title;
          sourceMeta = {
            sourceSlug: best.row.page_slug,
            sourceId: best.row.id,
            sourceLen: best.len,
          };
        }

        if (!html || html.length < MIN_HTML_LEN) {
          summary.menuPages.skipped += 1;
          summary.menuPages.details.push({
            target: entry.target,
            action: "skipped-empty-after-sanitize",
            ...sourceMeta,
          });
          continue;
        }

        await upsertPageContent(
          supabase,
          entry.target,
          html,
          titleHint,
          summary.menuPages,
          sourceMeta,
        );
      } catch (e) {
        summary.menuPages.skipped += 1;
        summary.errors.push(`${entry.target}: ${e.message || e}`);
      }
    }
    console.log(
      `✓ menu/priority pages inserted=${summary.menuPages.inserted} updated=${summary.menuPages.updated} preserved=${summary.menuPages.preserved} skipped=${summary.menuPages.skipped}`,
    );

    // --- Academic college About bodies ---
    for (const [legacyIdStr, targetSlug] of Object.entries(COLLEGE_SLUG_BY_LEGACY_ID)) {
      const legacyId = Number(legacyIdStr);
      try {
        const [rows] = await conn.query(
          `SELECT id, page_title, page_slug, page_content
           FROM hau_cms
           WHERE page_status = '1'
             AND page_college = ?
             AND (
               page_slug LIKE 'about%'
               OR LOWER(page_title) LIKE 'about%'
             )
             AND page_content IS NOT NULL
             AND CHAR_LENGTH(page_content) >= ?`,
          [legacyId, MIN_HTML_LEN],
        );
        const best = pickLongest(rows);
        if (!best) {
          summary.collegeAbout.skipped += 1;
          summary.collegeAbout.details.push({
            target: targetSlug,
            action: "skipped-no-college-about",
            collegeLegacyId: legacyId,
          });
          continue;
        }
        const html = prepareHtml(best.row.page_content);
        if (!html || html.length < MIN_HTML_LEN) {
          summary.collegeAbout.skipped += 1;
          continue;
        }
        await upsertPageContent(
          supabase,
          targetSlug,
          html,
          null,
          summary.collegeAbout,
          {
            collegeLegacyId: legacyId,
            sourceSlug: best.row.page_slug,
            sourceId: best.row.id,
            sourceLen: best.len,
          },
        );
      } catch (e) {
        summary.collegeAbout.skipped += 1;
        summary.errors.push(`college ${legacyId} → ${targetSlug}: ${e.message || e}`);
      }
    }
    console.log(
      `✓ college about inserted=${summary.collegeAbout.inserted} updated=${summary.collegeAbout.updated} preserved=${summary.collegeAbout.preserved} skipped=${summary.collegeAbout.skipped}`,
    );

    summary.finishedAt = new Date().toISOString();
    mkdirSync(REPORT_DIR, { recursive: true });
    const reportPath = join(REPORT_DIR, "phase3-priority-apply-latest.json");
    writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log("\nPhase 3 priority complete (no wipe).");
    console.log(`Report: ${reportPath}`);
    if (summary.errors.length) console.log(`Errors: ${summary.errors.length}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
