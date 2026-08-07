/**
 * Phase 3 full CMS import: all active hau_cms rows with usable content → ccshau_pages.
 *
 * - content_type 1/2 with HTML (≥80 chars): sanitize → content_en
 * - content_type 2 file-only: stub HTML with legacy filename (Phase 4 attaches file)
 * - Upsert by slug (aliases + unique fallback `slug-legacy-{id}`)
 * - Preserve richer existing content (no wipe)
 * - Attach under college root when page_college maps to a known microsite
 *
 * Usage:
 *   node apply-phase3-full.mjs --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");

const MIN_HTML_LEN = 80;
const PRESERVE_RICHER_DELTA = 200;
const PROGRESS_EVERY = 50;

/** Prefer existing live pages when legacy slug differs. */
const SLUG_ALIASES = {
  "about-us": "about",
  "about-us-1": "about",
  "about-us-3": "about",
  "college-of-basic-sciences-humanities": "college-basic-sciences-humanities",
  "ic-college-of-home-science": "ic-college-of-community-science",
  library: "nehru-library",
  "scholarship-fellowships": "scholarships-fellowships",
  "university-calander-volume-i-i": "university-calendar-volume-ii",
  "land-scape-unit": "landscape-unit",
  "land-scape-unit-1": "landscape-unit",
  "human-resources": "human-resource-management",
  "international-mo-u": "international-linkage",
  "admission2020-21": "admissions",
  "a-d-m-i-s-s-i-o-n": "admissions",
  "awards-3": "awards",
  "awards-2": "awards",
};

const COLLEGE_SLUG_BY_LEGACY_ID = {
  2: "college-of-agriculture-hisar",
  6: "college-of-agriculture-kaul",
  7: "college-of-agriculture-bawal",
  8: "centre-of-food-science-technology",
  9: "ic-college-of-community-science",
  10: "college-basic-sciences-humanities",
  11: "college-of-agricultural-engineering-and-technology",
  5: "directorate-of-research",
  13: "directorate-of-extension-education",
  19: null, // skip unknown
  21: "directorate-of-students-welfare",
  54: "nehru-library",
  55: "registrar-office",
  56: "comptroller-office",
  65: "college-of-fisheries-science",
  67: "college-of-biotechnology",
};

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
  return createRequire(join(ROOT, "apps/web/package.json"))(name);
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

function prepareHtml(raw) {
  if (!raw) return "";
  return sanitizeHtml(normalizeCmsHtml(raw), SANITIZE_OPTIONS);
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function resolveSlug(row) {
  const raw = String(row.page_slug || "").trim();
  if (!raw) return `legacy-cms-${row.id}`;
  const aliased = SLUG_ALIASES[raw] || raw;
  return slugify(aliased) || `legacy-cms-${row.id}`;
}

function fileStubHtml(row) {
  const file = basename(String(row.file || "document.bin").replace(/\\/g, "/"));
  const title = row.page_title || file;
  const pending = `legacy-pending/cms/${row.id}/${file}`;
  return [
    `<p><strong>${sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} })}</strong></p>`,
    `<p>Legacy document <code>${sanitizeHtml(file, { allowedTags: [], allowedAttributes: {} })}</code> — pending Phase 4 upload (<code>${pending}</code>).</p>`,
  ].join("\n");
}

function buildContent(row) {
  const html = prepareHtml(row.page_content);
  const hasHtml = html.length >= MIN_HTML_LEN;
  const hasFile = row.file && String(row.file).trim();

  if (hasHtml && hasFile) {
    return `${html}\n<hr />\n${fileStubHtml(row)}`;
  }
  if (hasHtml) return html;
  if (hasFile) return fileStubHtml(row);
  return "";
}

async function main() {
  if (!CONFIRM) {
    console.error("Refusing to run without --confirm (live Supabase writes).");
    console.error("Usage: node apply-phase3-full.mjs --confirm");
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
    mode: "phase3-full-cms-upsert",
    wipe: false,
    candidates: 0,
    inserted: 0,
    updated: 0,
    preserved: 0,
    skipped: 0,
    attachedToCollege: 0,
    errors: [],
    sample: [],
  };

  console.log("Phase 3 full CMS import (upsert, no wipe)");
  console.log(`MySQL ${mysqlConfig.host}/${mysqlConfig.database}`);
  console.log(`Supabase ${url.replace(/^https?:\/\//, "").split("/")[0]}`);

  const conn = await mysql.createConnection(mysqlConfig);
  try {
    // Load college page ids for parent attachment
    const collegePageIdByLegacy = new Map();
    const collegeSlugs = [...new Set(Object.values(COLLEGE_SLUG_BY_LEGACY_ID).filter(Boolean))];
    if (collegeSlugs.length) {
      const { data: colleges, error } = await supabase
        .from("ccshau_pages")
        .select("id, slug")
        .in("slug", collegeSlugs);
      if (error) throw new Error(error.message);
      const idBySlug = new Map((colleges || []).map((c) => [c.slug, c.id]));
      for (const [legacyId, slug] of Object.entries(COLLEGE_SLUG_BY_LEGACY_ID)) {
        if (!slug) continue;
        const id = idBySlug.get(slug);
        if (id) collegePageIdByLegacy.set(Number(legacyId), id);
      }
    }

    // Also load any college microsite from Phase 2 map file if present
    const phase2Report = join(REPORT_DIR, "phase2-apply-latest.json");
    if (existsSync(phase2Report)) {
      try {
        const p2 = JSON.parse(readFileSync(phase2Report, "utf8"));
        const map = p2?.maps?.collegeLegacyToPageId || {};
        for (const [lid, pid] of Object.entries(map)) {
          if (!collegePageIdByLegacy.has(Number(lid))) {
            collegePageIdByLegacy.set(Number(lid), pid);
          }
        }
      } catch {
        /* ignore */
      }
    }

    const [rows] = await conn.query(
      `SELECT id, content_type, file, page_title, page_slug, page_college, page_content, page_parent
       FROM hau_cms
       WHERE page_status = '1'
         AND (
           (page_content IS NOT NULL AND CHAR_LENGTH(TRIM(page_content)) >= ?)
           OR (file IS NOT NULL AND TRIM(file) <> '')
         )
       ORDER BY id`,
      [MIN_HTML_LEN],
    );

    summary.candidates = rows.length;
    console.log(`Candidates: ${rows.length}`);

    // Track which target slugs we already wrote this run (first wins for alias collisions)
    const claimedSlugs = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let content = buildContent(row);
        if (!content || content.replace(/<[^>]+>/g, "").trim().length < 20) {
          summary.skipped += 1;
          continue;
        }

        let targetSlug = resolveSlug(row);
        // If this preferred slug was already claimed by another legacy row this run,
        // or would collide with a different intended page, use unique slug.
        if (claimedSlugs.has(targetSlug) && SLUG_ALIASES[String(row.page_slug || "").trim()] !== targetSlug) {
          targetSlug = `${slugify(row.page_slug) || "cms"}-legacy-${row.id}`.slice(0, 80);
        } else if (claimedSlugs.has(targetSlug)) {
          // Alias already filled (e.g. about-us → about) — skip duplicates
          summary.preserved += 1;
          if (summary.sample.length < 40) {
            summary.sample.push({
              id: row.id,
              action: "skipped-alias-already-filled",
              slug: targetSlug,
              sourceSlug: row.page_slug,
            });
          }
          continue;
        }

        const collegeLegacyId =
          row.page_college != null ? Number(row.page_college) : null;
        // Do NOT parent CMS pages under college microsite roots — that floods
        // college top nav (Home | Departments | Gallery | Contact). Keep standalone.
        const parentId = null;
        void collegeLegacyId;
        void collegePageIdByLegacy;

        const { data: existing, error: findErr } = await supabase
          .from("ccshau_pages")
          .select("id, slug, content_en, page_type, parent_id")
          .eq("slug", targetSlug)
          .maybeSingle();
        if (findErr) throw new Error(findErr.message);

        const existingLen = existing?.content_en
          ? String(existing.content_en).length
          : 0;
        const newLen = content.length;

        if (existing?.id) {
          if (existingLen >= newLen + PRESERVE_RICHER_DELTA) {
            summary.preserved += 1;
            claimedSlugs.add(targetSlug);
            if (summary.sample.length < 40) {
              summary.sample.push({
                id: row.id,
                action: "preserved-richer",
                slug: targetSlug,
                existingLen,
                newLen,
              });
            }
            continue;
          }

          const update = {
            content_en: content,
            status: "published",
            published_at: new Date().toISOString(),
          };
          // Attach orphan standard pages under college when helpful; never re-parent microsite roots
          if (
            parentId &&
            existing.page_type === "standard" &&
            !existing.parent_id
          ) {
            update.parent_id = parentId;
            summary.attachedToCollege += 1;
          }

          const { error } = await supabase
            .from("ccshau_pages")
            .update(update)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          summary.updated += 1;
          claimedSlugs.add(targetSlug);
          if (summary.sample.length < 40) {
            summary.sample.push({
              id: row.id,
              action: "updated",
              slug: targetSlug,
              existingLen,
              newLen,
            });
          }
        } else {
          // Ensure unique slug on insert
          let insertSlug = targetSlug;
          const { data: clash } = await supabase
            .from("ccshau_pages")
            .select("id")
            .eq("slug", insertSlug)
            .maybeSingle();
          if (clash?.id) {
            insertSlug = `${targetSlug}-legacy-${row.id}`.slice(0, 80);
          }

          const payload = {
            slug: insertSlug,
            title_en: row.page_title || insertSlug,
            title_hi: null,
            content_en: content,
            excerpt_en: `${row.page_title || insertSlug} — CCS HAU.`,
            page_type: "standard",
            layout_template: "standard",
            status: "published",
            published_at: new Date().toISOString(),
            office_cta_enabled: true,
            sort_order: Number(row.id) || 0,
            parent_id: parentId,
          };
          if (parentId) summary.attachedToCollege += 1;

          const { error } = await supabase.from("ccshau_pages").insert(payload);
          if (error) {
            // Unique race → retry with id suffix
            if (/duplicate|unique/i.test(error.message)) {
              payload.slug = `legacy-cms-${row.id}`;
              const { error: e2 } = await supabase.from("ccshau_pages").insert(payload);
              if (e2) throw new Error(e2.message);
              claimedSlugs.add(payload.slug);
            } else {
              throw new Error(error.message);
            }
          } else {
            claimedSlugs.add(insertSlug);
          }
          summary.inserted += 1;
          if (summary.sample.length < 40) {
            summary.sample.push({
              id: row.id,
              action: "inserted",
              slug: insertSlug,
              newLen,
              parentId: parentId || null,
            });
          }
        }
      } catch (e) {
        summary.skipped += 1;
        summary.errors.push(`id=${row.id} slug=${row.page_slug}: ${e.message || e}`);
        if (summary.errors.length > 200) {
          summary.errors.push("… truncated …");
          break;
        }
      }

      if ((i + 1) % PROGRESS_EVERY === 0 || i + 1 === rows.length) {
        console.log(
          `… ${i + 1}/${rows.length} inserted=${summary.inserted} updated=${summary.updated} preserved=${summary.preserved} skipped=${summary.skipped}`,
        );
      }
    }

    summary.finishedAt = new Date().toISOString();
    mkdirSync(REPORT_DIR, { recursive: true });
    const reportPath = join(REPORT_DIR, "phase3-full-apply-latest.json");
    writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log("\nPhase 3 full CMS complete (no wipe).");
    console.log(
      `inserted=${summary.inserted} updated=${summary.updated} preserved=${summary.preserved} skipped=${summary.skipped} college-attached=${summary.attachedToCollege}`,
    );
    console.log(`Report: ${reportPath}`);
    if (summary.errors.length) console.log(`Errors logged: ${summary.errors.length}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
