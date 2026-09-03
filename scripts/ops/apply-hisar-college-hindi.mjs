#!/usr/bin/env node
/**
 * Apply Hindi for College of Agriculture, Hisar:
 * news ticker + student corner (college page and all child pages).
 *
 * Usage:
 *   node scripts/ops/apply-hisar-college-hindi.mjs
 *   node scripts/ops/apply-hisar-college-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-agriculture-hisar";

const COLLEGE_TITLE_HI = "कृषि महाविद्यालय, हिसार";

const STUDENT_CORNER_TITLES_HI = {
  "Feedback Form for UG Students": "स्नातक छात्रों के लिए प्रतिक्रिया प्रपत्र",
  "Under Graduate Course Catalogue -2025": "स्नातक पाठ्यक्रम सूची - 2025",
  "Under Graduate Course Catalogue - 2025": "स्नातक पाठ्यक्रम सूची - 2025",
};

/** Titles with spelling variants not in shared map */
const NEWS_EXTRA_HI = {
  "Antiragging Committee": "रैगिंग विरोधी समिति",
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

function loadSharedNewsTitleMap() {
  const src = readFileSync(join(ROOT, "scripts/ops/apply-news-hindi-cursor.mjs"), "utf8");
  const map = {};
  for (const m of src.matchAll(/"((?:[^"\\]|\\.)+)":\s*\n?\s*"((?:[^"\\]|\\.)+)"/g)) {
    map[m[1]] = m[2];
  }
  return { ...map, ...NEWS_EXTRA_HI };
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const NEWS_MAP = loadSharedNewsTitleMap();
const DEVANAGARI = /[\u0900-\u097F]/;

function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (!DEVANAGARI.test(hi)) return true;
  return false;
}

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, title_en, title_hi")
    .eq("slug", COLLEGE_SLUG)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

  const { data: pages } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .or(`id.eq.${college.id},college_root_id.eq.${college.id}`);

  const pageById = Object.fromEntries((pages ?? []).map((p) => [p.id, p]));
  const pageIds = (pages ?? []).map((p) => p.id);
  const plans = [];

  if (college.title_hi !== COLLEGE_TITLE_HI) {
    plans.push({
      table: "ccshau_pages",
      id: college.id,
      patch: { title_hi: COLLEGE_TITLE_HI },
      label: `college title → ${COLLEGE_TITLE_HI}`,
    });
  }

  const { data: news } = await supabase
    .from("ccshau_page_news_ticker_items")
    .select("id, page_id, title_en, title_hi")
    .in("page_id", pageIds)
    .eq("is_active", true);

  const missingNews = new Set();
  for (const row of news ?? []) {
    if (!needsHi(row.title_en, row.title_hi)) continue;
    const titleHi = NEWS_MAP[row.title_en];
    if (!titleHi || !DEVANAGARI.test(titleHi)) {
      missingNews.add(`[${pageById[row.page_id]?.slug}] ${row.title_en}`);
      continue;
    }
    if (row.title_hi === titleHi) continue;
    plans.push({
      table: "ccshau_page_news_ticker_items",
      id: row.id,
      patch: { title_hi: titleHi },
      label: `news [${pageById[row.page_id]?.slug}]: ${row.title_en.slice(0, 60)}…`,
    });
  }

  const { data: corner } = await supabase
    .from("ccshau_page_student_corner_items")
    .select("id, page_id, title_en, title_hi")
    .in("page_id", pageIds)
    .eq("is_active", true);

  const missingCorner = new Set();
  for (const row of corner ?? []) {
    if (!needsHi(row.title_en, row.title_hi)) continue;
    const titleHi = STUDENT_CORNER_TITLES_HI[row.title_en];
    if (!titleHi) {
      missingCorner.add(`[${pageById[row.page_id]?.slug}] ${row.title_en}`);
      continue;
    }
    if (row.title_hi === titleHi) continue;
    plans.push({
      table: "ccshau_page_student_corner_items",
      id: row.id,
      patch: { title_hi: titleHi },
      label: `student corner [${pageById[row.page_id]?.slug}]: ${row.title_en} → ${titleHi}`,
    });
  }

  console.log(`Pages scanned: ${pageIds.length}`);
  console.log(`Plans: ${plans.length}`);
  for (const p of plans) console.log(`  - ${p.label}`);

  if (missingNews.size) {
    console.log(`\nUnmapped news titles: ${missingNews.size}`);
    for (const t of [...missingNews].sort()) console.log(`  ! ${t}`);
  }
  if (missingCorner.size) {
    console.log(`\nUnmapped student corner: ${missingCorner.size}`);
    for (const t of [...missingCorner].sort()) console.log(`  ! ${t}`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  for (const p of plans) {
    const { error } = await supabase.from(p.table).update(p.patch).eq("id", p.id);
    if (error) throw new Error(`${p.label}: ${error.message}`);
  }

  console.log(`\nUpdated ${plans.length} record(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
