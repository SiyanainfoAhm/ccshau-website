/**
 * Sync college/directorate News ticker + Student Corner from legacy MySQL
 * (hau_notifications categories 5 / 27) into Supabase page item tables.
 *
 * Usage:
 *   node sync-college-news-student-corner.mjs           # dry-run
 *   node sync-college-news-student-corner.mjs --confirm  # write
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const NEWS_CATEGORY = 5;
const STUDENT_CATEGORY = 27;
const DOC_BASE = "https://hau.ac.in/public/notification-documents";

/** Legacy college_id → one or more live page slugs to update. */
const TARGETS = [
  { collegeId: 2, slugs: ["college-of-agriculture-hisar"] },
  { collegeId: 6, slugs: ["college-of-agriculture-kaul"] },
  { collegeId: 7, slugs: ["college-of-agriculture-bawal"] },
  { collegeId: 9, slugs: ["ic-college-of-community-science"] },
  {
    collegeId: 10,
    slugs: ["college-basic-sciences-humanities", "basic-sciences-humanities"],
  },
  {
    collegeId: 11,
    slugs: ["college-of-agricultural-engineering-and-technology"],
  },
  { collegeId: 65, slugs: ["college-of-fisheries-science"] },
  { collegeId: 67, slugs: ["college-of-biotechnology"] },
  { collegeId: 5, slugs: ["directorate-of-research"] },
  { collegeId: 13, slugs: ["directorate-of-extension-education"] },
  { collegeId: 18, slugs: ["directorate-of-farms"] },
  { collegeId: 21, slugs: ["directorate-of-students-welfare"] },
  { collegeId: 20, slugs: ["hrm", "human-resource-management"] },
  {
    collegeId: 15,
    slugs: ["extension-education-institute-nilokheri"],
  },
  { collegeId: 14, slugs: ["agricultural-technology-information-centre"] },
  {
    collegeId: 19,
    slugs: [
      "saina-nehwal-institute-of-agricultural-technology-training-education",
    ],
  },
  { collegeId: 54, slugs: ["nehru-library"] },
];

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
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function clean(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function rewriteHref(raw) {
  const href = clean(raw);
  if (!href) return null;
  try {
    const u = new URL(href);
    if (u.hostname === "hau.ac.in" || u.hostname === "www.hau.ac.in") {
      const path = u.pathname.replace(/\/+$/, "") || "/";
      if (path.startsWith("/college/") || path.startsWith("/page/")) {
        return `${path}${u.search || ""}`;
      }
    }
  } catch {
    if (href.startsWith("/")) return href;
  }
  return href;
}

function itemHref(row) {
  const file = clean(row.notification_file);
  if (file) {
    const base = file.split(/[\\/]/).pop();
    return `${DOC_BASE}/${row.id}/${base}`;
  }
  return rewriteHref(row.notification_link);
}

function toItems(rows) {
  return rows
    .map((row, index) => {
      const title = clean(row.notification_name);
      if (!title) return null;
      const href = itemHref(row);
      return {
        title_en: title,
        title_hi: null,
        href,
        file_path: null,
        expires_at: null,
        is_new: true,
        sort_order: index + 1,
        is_active: true,
      };
    })
    .filter(Boolean);
}

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const collegeIds = TARGETS.map((t) => t.collegeId);
const [legacyRows] = await conn.query(
  `SELECT id, college_id, category_id, notification_name, notification_link,
          notification_file, notification_order, created_at, updated_at
   FROM hau_notifications
   WHERE status = 1
     AND college_id IN (?)
     AND category_id IN (?, ?)
   ORDER BY college_id, category_id, id DESC`,
  [collegeIds, NEWS_CATEGORY, STUDENT_CATEGORY],
);
await conn.end();

const byCollege = new Map();
for (const row of legacyRows) {
  if (!byCollege.has(row.college_id)) {
    byCollege.set(row.college_id, { news: [], student: [] });
  }
  const bucket = byCollege.get(row.college_id);
  if (row.category_id === NEWS_CATEGORY) bucket.news.push(row);
  else if (row.category_id === STUDENT_CATEGORY) bucket.student.push(row);
}

const allSlugs = [...new Set(TARGETS.flatMap((t) => t.slugs))];
const { data: pages, error: pagesErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, layout_config, status")
  .in("slug", allSlugs);
if (pagesErr) throw new Error(pagesErr.message);

const pageBySlug = new Map((pages || []).map((p) => [p.slug, p]));
const report = {
  mode: CONFIRM ? "confirm" : "dry-run",
  generatedAt: new Date().toISOString(),
  pages: [],
};

for (const target of TARGETS) {
  const legacy = byCollege.get(target.collegeId) || { news: [], student: [] };
  const newsItems = toItems(legacy.news);
  const studentItems = toItems(legacy.student);

  for (const slug of target.slugs) {
    const page = pageBySlug.get(slug);
    const entry = {
      collegeId: target.collegeId,
      slug,
      pageId: page?.id || null,
      title: page?.title_en || null,
      found: Boolean(page),
      newsCount: newsItems.length,
      studentCount: studentItems.length,
      newsTitles: newsItems.map((i) => i.title_en),
      studentTitles: studentItems.map((i) => i.title_en),
      actions: [],
    };

    if (!page) {
      entry.actions.push("skip-missing-page");
      report.pages.push(entry);
      continue;
    }

    if (!CONFIRM) {
      entry.actions.push("dry-run-replace");
      report.pages.push(entry);
      continue;
    }

    const { error: delNewsErr } = await sb
      .from("ccshau_page_news_ticker_items")
      .delete()
      .eq("page_id", page.id);
    if (delNewsErr) throw new Error(`${slug} delete news: ${delNewsErr.message}`);

    const { error: delStudentErr } = await sb
      .from("ccshau_page_student_corner_items")
      .delete()
      .eq("page_id", page.id);
    if (delStudentErr) {
      throw new Error(`${slug} delete student: ${delStudentErr.message}`);
    }
    entry.actions.push("cleared-existing");

    if (newsItems.length) {
      const payload = newsItems.map((item) => ({ ...item, page_id: page.id }));
      const { error } = await sb
        .from("ccshau_page_news_ticker_items")
        .insert(payload);
      if (error) throw new Error(`${slug} insert news: ${error.message}`);
      entry.actions.push(`inserted-news:${newsItems.length}`);
    }

    if (studentItems.length) {
      const payload = studentItems.map((item) => ({
        ...item,
        page_id: page.id,
      }));
      const { error } = await sb
        .from("ccshau_page_student_corner_items")
        .insert(payload);
      if (error) throw new Error(`${slug} insert student: ${error.message}`);
      entry.actions.push(`inserted-student:${studentItems.length}`);
    }

    const layout = {
      ...(page.layout_config && typeof page.layout_config === "object"
        ? page.layout_config
        : {}),
      newsTicker: newsItems.length > 0,
      studentCorner: studentItems.length > 0,
    };
    const { error: layoutErr } = await sb
      .from("ccshau_pages")
      .update({ layout_config: layout })
      .eq("id", page.id);
    if (layoutErr) throw new Error(`${slug} layout: ${layoutErr.message}`);
    entry.actions.push(
      `layout newsTicker=${layout.newsTicker} studentCorner=${layout.studentCorner}`,
    );

    report.pages.push(entry);
  }
}

const outDir = join(__dirname, "reports");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "sync-college-news-student-corner-latest.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

const withItems = report.pages.filter((p) => p.newsCount || p.studentCount);
console.log(
  `${CONFIRM ? "APPLIED" : "DRY-RUN"} — ${report.pages.length} page targets, ${withItems.length} with legacy items`,
);
for (const p of report.pages) {
  console.log(
    `- ${p.slug}: news=${p.newsCount} student=${p.studentCount} [${p.actions.join(", ")}]`,
  );
}
console.log(`Report: ${outPath}`);
