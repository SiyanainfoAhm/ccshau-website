/**
 * Audit college/directorate structure after sidebar sync:
 * - college_home roots with active left sidebars (often wrong)
 * - office_portal depts with empty content tabs
 * - pages whose college_root_id may be wrong (title/prefix mismatch)
 *
 * Usage: node audit-college-sidebars.mjs
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

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

function normalizeTitle(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isProtected(label) {
  const n = normalizeTitle(label);
  return n === "faculty" || n.includes("head of department") || n === "hod";
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const report = {
  startedAt: new Date().toISOString(),
  colleges: [],
  rootsWithActiveLeftSidebars: [],
  deptsWithEmptyContent: [],
  missingDeptPages: [],
  suspiciousRootLinks: [],
  summary: {},
};

const knownSlugs = Object.values(COLLEGE_SLUG_BY_LEGACY_ID);
const { data: roots, error: rootErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, layout_template, layout_config, college_root_id")
  .in("slug", knownSlugs);
if (rootErr) throw new Error(rootErr.message);

const rootBySlug = new Map((roots || []).map((r) => [r.slug, r]));

for (const [legacyCollegeId, slug] of Object.entries(COLLEGE_SLUG_BY_LEGACY_ID)) {
  const root = rootBySlug.get(slug);
  if (!root) {
    report.colleges.push({ slug, legacyCollegeId: Number(legacyCollegeId), missingRoot: true });
    continue;
  }

  const { data: depts } = await sb
    .from("ccshau_pages")
    .select("id, slug, title_en, layout_template, parent_id, college_root_id, status")
    .eq("college_root_id", root.id)
    .eq("layout_template", "office_portal")
    .eq("status", "published");

  const realDepts = (depts || []).filter((d) => d.id !== root.id);

  const { data: rootLeft } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, is_active, content_en, sort_order")
    .eq("page_id", root.id)
    .eq("side", "left")
    .eq("is_active", true)
    .order("sort_order");

  const activeRootLeft = rootLeft || [];
  if (activeRootLeft.length > 0 && root.layout_template === "college_home") {
    report.rootsWithActiveLeftSidebars.push({
      slug: root.slug,
      title: root.title_en,
      leftSidebar: root.layout_config?.leftSidebar === true,
      items: activeRootLeft.map((i) => ({
        label: i.label_en,
        len: (i.content_en || "").length,
      })),
    });
  }

  const deptSummaries = [];
  for (const dept of realDepts) {
    const { data: sbItems } = await sb
      .from("ccshau_page_sidebar_items")
      .select("label_en, is_active, content_en, sort_order")
      .eq("page_id", dept.id)
      .eq("side", "left")
      .eq("is_active", true)
      .order("sort_order");

    const items = sbItems || [];
    const contentTabs = items.filter((i) => !isProtected(i.label_en));
    const withContent = contentTabs.filter((i) => (i.content_en || "").trim().length > 0);
    const emptyContent = contentTabs.filter((i) => !(i.content_en || "").trim());

    if (contentTabs.length > 0 && withContent.length === 0) {
      report.deptsWithEmptyContent.push({
        college: root.slug,
        deptSlug: dept.slug,
        deptTitle: dept.title_en,
        emptyLabels: emptyContent.map((i) => i.label_en),
      });
    }

    // prefix sanity
    const prefix = PREFIX_BY_COLLEGE_SLUG[root.slug];
    if (
      prefix &&
      dept.slug &&
      !dept.slug.startsWith(`${prefix}-`) &&
      !normalizeTitle(dept.title_en).includes(normalizeTitle(root.title_en).slice(0, 12))
    ) {
      // soft flag only when slug clearly belongs to another prefix
      const otherPrefixes = Object.entries(PREFIX_BY_COLLEGE_SLUG)
        .filter(([s]) => s !== root.slug)
        .map(([, p]) => p);
      const wrong = otherPrefixes.find((p) => dept.slug.startsWith(`${p}-`));
      if (wrong) {
        report.suspiciousRootLinks.push({
          pageSlug: dept.slug,
          title: dept.title_en,
          expectedCollege: root.slug,
          slugPrefixLooksLike: wrong,
        });
      }
    }

    deptSummaries.push({
      slug: dept.slug,
      title: dept.title_en,
      leftTabs: items.length,
      contentTabs: contentTabs.length,
      withContent: withContent.length,
      emptyContent: emptyContent.length,
    });
  }

  // legacy left menus vs live dept pages
  const [legacyMenus] = await conn.query(
    `SELECT m.menu_id, m.menu_name, m.department_id, d.department_name
     FROM hau_menu m
     LEFT JOIN hau_college_departments d ON d.id = m.department_id
     WHERE m.college_id = ?
       AND m.menu_status = 1
       AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
       AND m.department_id > 0
     ORDER BY m.menu_id`,
    [Number(legacyCollegeId)],
  );

  for (const menu of legacyMenus) {
    if (!menu.department_name) {
      report.missingDeptPages.push({
        college: root.slug,
        menuId: menu.menu_id,
        reason: `no legacy department row for department_id=${menu.department_id}`,
      });
      continue;
    }
    const wanted = normalizeTitle(menu.department_name);
    const hit = realDepts.find((d) => normalizeTitle(d.title_en) === wanted);
    if (!hit) {
      report.missingDeptPages.push({
        college: root.slug,
        menuId: menu.menu_id,
        department: menu.department_name,
        reason: "no matching office_portal department page",
      });
    }
  }

  report.colleges.push({
    slug: root.slug,
    title: root.title_en,
    legacyCollegeId: Number(legacyCollegeId),
    layout: root.layout_template,
    leftSidebarFlag: root.layout_config?.leftSidebar === true,
    activeRootLeftItems: activeRootLeft.length,
    deptCount: realDepts.length,
    legacyLeftMenus: legacyMenus.length,
    departments: deptSummaries,
  });
}

await conn.end();

report.summary = {
  collegesChecked: report.colleges.length,
  rootsWithActiveLeftSidebars: report.rootsWithActiveLeftSidebars.length,
  deptsWithEmptyContent: report.deptsWithEmptyContent.length,
  missingDeptPages: report.missingDeptPages.length,
  suspiciousRootLinks: report.suspiciousRootLinks.length,
};
report.finishedAt = new Date().toISOString();

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "college-sidebars-audit-latest.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log("\nRoots with active left sidebars:");
for (const r of report.rootsWithActiveLeftSidebars) {
  console.log(` - ${r.slug} (${r.items.length} items) leftSidebar=${r.leftSidebar}`);
}
console.log("\nDepts with only empty content tabs:");
for (const d of report.deptsWithEmptyContent) {
  console.log(` - ${d.college} / ${d.deptSlug}: ${d.emptyLabels.join(", ")}`);
}
console.log("\nMissing dept pages for legacy menus:");
for (const m of report.missingDeptPages.slice(0, 30)) {
  console.log(` - ${m.college} menu ${m.menuId}: ${m.department || m.reason}`);
}
if (report.missingDeptPages.length > 30) {
  console.log(` ... +${report.missingDeptPages.length - 30} more`);
}
console.log("\nSuspicious root links:");
for (const s of report.suspiciousRootLinks) {
  console.log(` - ${s.pageSlug} under ${s.expectedCollege} (prefix ${s.slugPrefixLooksLike})`);
}
console.log(`\nReport: ${out}`);
