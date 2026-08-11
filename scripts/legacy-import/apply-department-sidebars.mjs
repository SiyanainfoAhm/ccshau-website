/**
 * Sync legacy left sidebars (hau_menu + hau_menu_detail + hau_cms)
 * into ccshau_page_sidebar_items for college / directorate department pages.
 *
 * NEVER removes or renames:
 *   - Head of Department
 *   - Faculty
 *
 * Usage:
 *   node apply-department-sidebars.mjs --dry-run
 *   node apply-department-sidebars.mjs --confirm
 *   node apply-department-sidebars.mjs --confirm --college=2 --department=1
 *   node apply-department-sidebars.mjs --confirm --menu=13
 *   node apply-department-sidebars.mjs --confirm --menu=13 --force-content
 *
 * Env: LEGACY_MYSQL_*, apps/web/.env.local (Supabase service role)
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
const DRY_RUN = process.argv.includes("--dry-run");

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}
const ONLY_COLLEGE = argValue("--college");
const ONLY_DEPARTMENT = argValue("--department");
const ONLY_MENU = argValue("--menu");
const FORCE_CONTENT = process.argv.includes("--force-content");

/** Legacy pages-pdf base used when hau_cms has file but empty page_content */
const LEGACY_PDF_BASE = "https://www.hau.ac.in/public/pages-pdf/";

/** Legacy college_id → live page slug */
const COLLEGE_SLUG_BY_LEGACY_ID = {
  2: "college-of-agriculture-hisar",
  5: "directorate-of-research",
  6: "college-of-agriculture-kaul",
  7: "college-of-agriculture-bawal",
  8: "centre-of-food-science-technology",
  9: "ic-college-of-community-science",
  10: "college-basic-sciences-humanities",
  11: "college-of-agricultural-engineering-and-technology",
  13: "directorate-of-extension-education",
  21: "directorate-of-students-welfare",
  65: "college-of-fisheries-science",
  67: "college-of-biotechnology",
};

const SLUG_ALIASES = {
  "college-of-basic-sciences-humanities": "college-basic-sciences-humanities",
  "ic-college-of-home-science": "ic-college-of-community-science",
};

const PROTECTED_LABELS = [
  { labelEn: "Head of Department", labelHi: "विभागाध्यक्ष", sortOrder: 1 },
  { labelEn: "Faculty", labelHi: "संकाय", sortOrder: 2 },
];

const KNOWN_HI = {
  "thrust area": "थ्रस्ट क्षेत्र",
  "teaching and research": "शिक्षण और अनुसंधान",
  "teaching research achievements": "शिक्षण और अनुसंधान",
  "awards and honors": "पुरस्कार और सम्मान",
  infrastructure: "अवसंरचना",
  "alumni of the department": "विभाग के पूर्व छात्र",
  "retiree of the department": "सेवानिवृत्त",
  "course structure": "पाठ्यक्रम संरचना",
  "digital library": "डिजिटल लाइब्रेरी",
};

const LABEL_CANONICAL = {
  "teaching research achievements": "Teaching and Research",
  "teaching and research achievements": "Teaching and Research",
  "infrastructure laboratories etc": "Infrastructure",
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
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "id", "align", "border", "cellpadding", "cellspacing", "width", "height"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "data"],
};

const HAS_HTML_TAG = /<\/?[a-z][\s\S]*>/i;

function normalizeCmsHtml(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) return "";
  if (!HAS_HTML_TAG.test(trimmed)) {
    return trimmed
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${sanitizeHtml(p)}</p>`)
      .join("\n");
  }
  return trimmed;
}

function prepareHtml(raw) {
  const normalized = normalizeCmsHtml(raw);
  if (!normalized) return "";
  return sanitizeHtml(normalized, SANITIZE_OPTIONS);
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

function normalizeTitle(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeLabel(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isProtectedLabel(labelEn) {
  const n = normalizeLabel(labelEn);
  return (
    n === "head of department" ||
    n === "hod" ||
    n === "faculty" ||
    n.includes("head of department")
  );
}

function canonicalLegacyLabel(label) {
  const n = normalizeLabel(label);
  if (LABEL_CANONICAL[n]) return LABEL_CANONICAL[n];
  // Title-case lightly from original label
  return String(label || "").trim();
}

function hiForLabel(labelEn) {
  const n = normalizeLabel(labelEn);
  return KNOWN_HI[n] || null;
}

function resolveCollegeSlug(legacyCollege) {
  const fromMap = COLLEGE_SLUG_BY_LEGACY_ID[Number(legacyCollege.college_id)];
  const raw = fromMap || legacyCollege.college_slug || slugify(legacyCollege.college_name);
  return SLUG_ALIASES[raw] || raw;
}

async function findCollegePage(supabase, slug) {
  const candidates = [slug, SLUG_ALIASES[slug]].filter(Boolean);
  for (const s of candidates) {
    const { data, error } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, page_type, college_root_id")
      .eq("slug", s)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data;
  }
  return null;
}

const PREFIX_BY_COLLEGE_SLUG = {
  "college-of-agriculture-hisar": "hisar",
  "college-of-agriculture-kaul": "kaul",
  "college-of-agriculture-bawal": "bawal",
  "college-of-agricultural-engineering-and-technology": "coaet",
  "college-basic-sciences-humanities": "cbs",
  "centre-of-food-science-technology": "cfst",
  "ic-college-of-community-science": "icccs",
  "college-of-fisheries-science": "cfs",
  "college-of-biotechnology": "cbt",
  "directorate-of-research": "dor",
  "directorate-of-extension-education": "dee",
  "directorate-of-students-welfare": "dsw",
};

async function findDepartmentPage(supabase, collegePage, deptName, legacyDeptId) {
  const base = slugify(deptName) || `dept-${legacyDeptId}`;
  const prefix = PREFIX_BY_COLLEGE_SLUG[collegePage.slug];
  const rootId = collegePage.college_root_id || collegePage.id;
  const wanted = normalizeTitle(deptName);

  function isCollegeRoot(page) {
    return page.id === collegePage.id || page.id === rootId;
  }

  function pickBest(candidates) {
    const list = (candidates || []).filter(
      (p) => !isCollegeRoot(p) && normalizeTitle(p.title_en) === wanted,
    );
    if (!list.length) return null;
    // Prefer real department portals over college_home / other templates.
    return (
      list.find((p) => String(p.layout_template || "") === "office_portal") ||
      list.find((p) => String(p.slug || "").startsWith(`${prefix}-`)) ||
      list[0]
    );
  }

  // Prefer pages under this college tree (avoids Kaul/Bawal cross-mapping)
  const { data: level1 } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, parent_id, layout_config, layout_template, college_root_id")
    .eq("parent_id", collegePage.id);
  const l1 = level1 || [];
  const direct = pickBest(l1);
  if (direct) return direct;

  for (const child of l1) {
    const { data: level2 } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, layout_config, layout_template, college_root_id")
      .eq("parent_id", child.id);
    const hit = pickBest(level2);
    if (hit) return hit;
  }

  if (rootId) {
    const { data: underRoot } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, layout_config, layout_template, college_root_id")
      .eq("college_root_id", rootId)
      .limit(200);
    const exact = pickBest(underRoot);
    if (exact) return exact;
  }

  // College-scoped slug guesses only
  const slugGuesses = [];
  if (prefix) {
    slugGuesses.push(`${prefix}-${base}`);
    slugGuesses.push(`${base}-${prefix}`);
  }
  if (collegePage.slug === "college-of-agriculture-hisar" && base === "agricultural-economics") {
    slugGuesses.push("agricultural-economics-hisar", "hisar-agricultural-economics");
  }
  slugGuesses.push(base);

  for (const slug of [...new Set(slugGuesses)]) {
    const { data } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, layout_config, layout_template, college_root_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data?.id || isCollegeRoot(data)) continue;
    const sameRoot =
      !rootId ||
      data.college_root_id === rootId ||
      data.parent_id === collegePage.id;
    if (!sameRoot) continue;
    if (normalizeTitle(data.title_en) === wanted) return data;
    if (prefix && slug.startsWith(`${prefix}-`) && base.length > 4) return data;
  }

  return null;
}

async function ensureLayoutLeftSidebar(supabase, page, summary) {
  const cfg = page.layout_config && typeof page.layout_config === "object" ? page.layout_config : {};
  if (cfg.leftSidebar === true) return;
  summary.layoutPatched += 1;
  if (DRY_RUN) return;
  const { error } = await supabase
    .from("ccshau_pages")
    .update({ layout_config: { ...cfg, leftSidebar: true } })
    .eq("id", page.id);
  if (error) throw new Error(`layout patch ${page.slug}: ${error.message}`);
}

async function syncSidebarForPage(supabase, page, legacyItems, summary, meta) {
  const { data: existing, error } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, label_hi, content_en, content_hi, href, sort_order, is_active, side")
    .eq("page_id", page.id)
    .eq("side", "left")
    .order("sort_order");
  if (error) throw new Error(error.message);

  const rows = existing || [];
  const usedIds = new Set();

  // 1) Ensure protected HOD + Faculty
  for (const prot of PROTECTED_LABELS) {
    let row = rows.find((r) => normalizeLabel(r.label_en) === normalizeLabel(prot.labelEn));
    if (!row && prot.labelEn === "Head of Department") {
      row = rows.find((r) => normalizeLabel(r.label_en).includes("head of department"));
    }
    if (!row && prot.labelEn === "Faculty") {
      row = rows.find((r) => normalizeLabel(r.label_en) === "faculty");
    }

    if (row) {
      usedIds.add(row.id);
      const needs =
        row.sort_order !== prot.sortOrder ||
        row.label_en !== prot.labelEn ||
        !row.is_active ||
        (!row.label_hi && prot.labelHi);
      if (needs) {
        summary.protectedKept += 1;
        if (!DRY_RUN) {
          const { error: uErr } = await supabase
            .from("ccshau_page_sidebar_items")
            .update({
              label_en: prot.labelEn,
              label_hi: row.label_hi || prot.labelHi,
              sort_order: prot.sortOrder,
              is_active: true,
              href: null,
            })
            .eq("id", row.id);
          if (uErr) throw new Error(uErr.message);
        }
      } else {
        summary.protectedKept += 1;
      }
    } else {
      summary.protectedInserted += 1;
      if (!DRY_RUN) {
        const { data: inserted, error: iErr } = await supabase
          .from("ccshau_page_sidebar_items")
          .insert({
            page_id: page.id,
            side: "left",
            label_en: prot.labelEn,
            label_hi: prot.labelHi,
            sort_order: prot.sortOrder,
            is_active: true,
            href: null,
          })
          .select("id")
          .single();
        if (iErr) throw new Error(iErr.message);
        usedIds.add(inserted.id);
      }
    }
  }

  // 2) Upsert legacy menu items (sort starts at 3)
  let sort = 3;
  for (const item of legacyItems) {
    const labelEn = canonicalLegacyLabel(item.label);
    if (!labelEn || isProtectedLabel(labelEn)) {
      sort += 1;
      continue;
    }
    const key = normalizeLabel(labelEn);
    const softKey = key.replace(/\bachievements\b/g, "").replace(/\s+/g, " ").trim();

    let row = rows.find((r) => {
      if (usedIds.has(r.id) || isProtectedLabel(r.label_en)) return false;
      const rn = normalizeLabel(r.label_en);
      return rn === key || rn === softKey || key.includes(rn) || rn.includes(softKey);
    });

    const contentEn = item.contentHtml || null;
    const labelHi = hiForLabel(labelEn);

    if (row) {
      usedIds.add(row.id);
      const existingLen = row.content_en ? String(row.content_en).length : 0;
      const newLen = contentEn ? contentEn.length : 0;
      const keepContent =
        !FORCE_CONTENT && existingLen > 0 && newLen > 0 && existingLen >= newLen + 200;
      const patch = {
        label_en: labelEn,
        label_hi: row.label_hi || labelHi,
        sort_order: sort,
        is_active: true,
        href: null,
      };
      if (contentEn && !keepContent) patch.content_en = contentEn;

      summary.itemsUpdated += 1;
      if (!DRY_RUN) {
        const { error: uErr } = await supabase
          .from("ccshau_page_sidebar_items")
          .update(patch)
          .eq("id", row.id);
        if (uErr) throw new Error(uErr.message);
      }
    } else {
      summary.itemsInserted += 1;
      if (!DRY_RUN) {
        const { data: inserted, error: iErr } = await supabase
          .from("ccshau_page_sidebar_items")
          .insert({
            page_id: page.id,
            side: "left",
            label_en: labelEn,
            label_hi: labelHi,
            content_en: contentEn,
            sort_order: sort,
            is_active: true,
            href: null,
          })
          .select("id")
          .single();
        if (iErr) throw new Error(iErr.message);
        usedIds.add(inserted.id);
      }
    }
    sort += 1;
  }

  // 3) Deactivate extras not in legacy (e.g. seeded "Course Structure").
  // Never touch Head of Department / Faculty.
  const extras = rows.filter((r) => !usedIds.has(r.id) && !isProtectedLabel(r.label_en));
  for (const extra of extras) {
    summary.itemsDeactivated += 1;
    if (!DRY_RUN && extra.is_active !== false) {
      const { error: uErr } = await supabase
        .from("ccshau_page_sidebar_items")
        .update({ is_active: false })
        .eq("id", extra.id);
      if (uErr) throw new Error(uErr.message);
    }
  }

  summary.pagesSynced += 1;
  summary.details.push({
    pageSlug: page.slug,
    pageId: page.id,
    legacyMenuId: meta.menuId,
    legacyDeptId: meta.deptId,
    legacyItems: legacyItems.length,
    protected: true,
  });
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Refusing without --confirm or --dry-run");
    console.error(
      "Usage: node apply-department-sidebars.mjs --dry-run\n       node apply-department-sidebars.mjs --confirm [--college=2] [--department=1] [--menu=13] [--force-content]",
    );
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
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  };

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const summary = {
    startedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run" : "apply",
    onlyCollege: ONLY_COLLEGE,
    onlyDepartment: ONLY_DEPARTMENT,
    onlyMenu: ONLY_MENU,
    forceContent: FORCE_CONTENT,
    menusSeen: 0,
    pagesSynced: 0,
    pagesMissing: 0,
    protectedKept: 0,
    protectedInserted: 0,
    itemsInserted: 0,
    itemsUpdated: 0,
    itemsDeactivated: 0,
    layoutPatched: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  console.log(`Department left-sidebars (${summary.mode})`);
  console.log(`MySQL ${mysqlConfig.host}/${mysqlConfig.database} as ${mysqlConfig.user}`);
  console.log(`Supabase ${new URL(url).hostname}`);

  const conn = await mysql.createConnection(mysqlConfig);
  try {
    let menuSql = `
      SELECT m.menu_id, m.menu_name, m.college_id, m.department_id, m.menu_type, m.menu_status,
             c.college_name, c.college_slug,
             d.department_name
      FROM hau_menu m
      LEFT JOIN hau_college c ON c.college_id = m.college_id
      LEFT JOIN hau_college_departments d ON d.id = m.department_id
      WHERE m.menu_status = 1
        AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
        AND m.department_id > 0
    `;
    const params = [];
    if (ONLY_COLLEGE) {
      menuSql += " AND m.college_id = ?";
      params.push(Number(ONLY_COLLEGE));
    }
    if (ONLY_DEPARTMENT) {
      menuSql += " AND m.department_id = ?";
      params.push(Number(ONLY_DEPARTMENT));
    }
    if (ONLY_MENU) {
      menuSql += " AND m.menu_id = ?";
      params.push(Number(ONLY_MENU));
    }
    menuSql += " ORDER BY m.college_id, m.department_id, m.menu_id";

    const [menus] = await conn.query(menuSql, params);
    summary.menusSeen = menus.length;
    console.log(`Legacy left menus: ${menus.length}`);

    for (const menu of menus) {
      try {
        if (!menu.department_name) {
          summary.skipped += 1;
          summary.errors.push(
            `menu ${menu.menu_id}: no department row for department_id=${menu.department_id}`,
          );
          continue;
        }

        const collegeSlug = resolveCollegeSlug(menu);
        const collegePage = await findCollegePage(supabase, collegeSlug);
        if (!collegePage) {
          summary.pagesMissing += 1;
          summary.errors.push(
            `menu ${menu.menu_id}: college page missing for slug=${collegeSlug} (legacy college ${menu.college_id})`,
          );
          continue;
        }

        const deptPage = await findDepartmentPage(
          supabase,
          collegePage,
          menu.department_name,
          menu.department_id,
        );
        if (!deptPage) {
          summary.pagesMissing += 1;
          summary.errors.push(
            `menu ${menu.menu_id}: department page missing for "${menu.department_name}" under ${collegeSlug}`,
          );
          continue;
        }

        const [details] = await conn.query(
          `SELECT
             md.id,
             md.label,
             md.link,
             md.page_id,
             md.display_order,
             md.menu_custom_link,
             cms.page_title,
             cms.page_content,
             cms.file,
             CASE
               WHEN cms.page_content IS NOT NULL
                    AND TRIM(cms.page_content) <> ''
                 THEN cms.page_content
               WHEN cms.file IS NOT NULL
                    AND TRIM(cms.file) <> ''
                 THEN CONCAT(
                   '<a href="${LEGACY_PDF_BASE}',
                   cms.file,
                   '" rel="noopener noreferrer" target="_blank">',
                   '<span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">',
                   '<strong>',
                   md.label,
                   '</strong></span></a>'
                 )
               ELSE NULL
             END AS tab_content
           FROM hau_menu_detail md
           LEFT JOIN hau_cms cms ON cms.id = md.page_id
           WHERE md.menu_id = ?
           ORDER BY md.display_order, md.id`,
          [menu.menu_id],
        );

        const legacyItems = details.map((d) => ({
          id: d.id,
          label: d.label,
          contentHtml: d.tab_content ? prepareHtml(d.tab_content) : "",
          displayOrder: d.display_order,
        }));

        await ensureLayoutLeftSidebar(supabase, deptPage, summary);
        await syncSidebarForPage(supabase, deptPage, legacyItems, summary, {
          menuId: menu.menu_id,
          deptId: menu.department_id,
          collegeId: menu.college_id,
        });

        console.log(
          `✓ ${collegeSlug} / ${deptPage.slug} ← menu ${menu.menu_id} (${legacyItems.length} legacy tabs)`,
        );
      } catch (e) {
        summary.skipped += 1;
        summary.errors.push(`menu ${menu.menu_id}: ${e.message || e}`);
        console.error(`✗ menu ${menu.menu_id}: ${e.message || e}`);
      }
    }
  } finally {
    await conn.end();
  }

  summary.finishedAt = new Date().toISOString();
  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "department-sidebars-latest.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log("---");
  console.log(
    `synced=${summary.pagesSynced} missingPages=${summary.pagesMissing} protectedKept=${summary.protectedKept} protectedInserted=${summary.protectedInserted}`,
  );
  console.log(
    `items inserted=${summary.itemsInserted} updated=${summary.itemsUpdated} deactivatedExtras=${summary.itemsDeactivated}`,
  );
  console.log(`Report: ${out}`);
  if (summary.errors.length) console.log(`Notes/errors: ${summary.errors.length} (see report)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
