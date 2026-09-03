#!/usr/bin/env node
/**
 * Apply Hindi for College of Basic Sciences & Humanities:
 * - College title, department submenu, news ticker, student corner
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-college-hindi.mjs
 *   node scripts/ops/apply-cobsh-college-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-basic-sciences-humanities";

const COLLEGE_TITLE_HI = "मूल विज्ञान और मानविकी महाविद्यालय";

/** Department submenu pages (cbs-*). */
const DEPARTMENT_TITLES_HI = {
  "cbs-biochemistry": "जैव रसायन",
  "cbs-botany-plant-physiology": "वनस्पति विज्ञान और पादप शरीर क्रिया विज्ञान",
  "cbs-chemistry": "रसायन विज्ञान",
  "cbs-languages-haryanvi-culture": "भाषाएँ और हरियाणवी संस्कृति",
  "cbs-mathematics-statistics": "गणित और सांख्यिकी",
  "cbs-microbiology": "सूक्ष्म जीव विज्ञान",
  "cbs-physics": "भौतिकी",
  "cbs-sociology": "समाजशास्त्र",
  "cbs-zoology": "प्राणि विज्ञान",
  "cbs-computer-section": "कंप्यूटर सेक्शन",
};

const STUDENT_CORNER_TITLES_HI = {
  "Post Graduate Course Catalogue": "स्नातकोत्तर पाठ्यक्रम सूची",
};

/** Titles not yet in apply-news-hindi-cursor.mjs */
const NEWS_EXTRA_HI = {
  "Coordinator of Project Review Committee": "परियोजना समीक्षा समिति के समन्वयक",
  "Constitute the following College Purchase Committee": "निम्नलिखित महाविद्यालय क्रय समिति का गठन",
  "Accreditation Team in COBS&H -2023": "सीओबीएसएच में प्रत्यायन दल -2023",
  "MoU Signing Ceremony between CCSHU and Warsaw University, Warsaw, Poland":
    "सीसीएसएचएयू और वार्सा विश्वविद्यालय, वार्सा, पोलैंड के बीच एमओयू हस्ताक्षर समारोह",
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

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, title_en, title_hi")
    .eq("slug", COLLEGE_SLUG)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

  const plans = [];

  if (college.title_hi !== COLLEGE_TITLE_HI) {
    plans.push({ table: "ccshau_pages", id: college.id, patch: { title_hi: COLLEGE_TITLE_HI }, label: `college → ${COLLEGE_TITLE_HI}` });
  }

  for (const [slug, titleHi] of Object.entries(DEPARTMENT_TITLES_HI)) {
    const { data: page } = await supabase
      .from("ccshau_pages")
      .select("id, title_en, title_hi")
      .eq("college_root_id", college.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!page) continue;
    if (page.title_hi === titleHi) continue;
    plans.push({ table: "ccshau_pages", id: page.id, patch: { title_hi: titleHi }, label: `${slug} → ${titleHi}` });
  }

  const { data: news } = await supabase
    .from("ccshau_page_news_ticker_items")
    .select("id, title_en, title_hi")
    .eq("page_id", college.id)
    .eq("is_active", true);

  const missingNews = new Set();
  for (const row of news ?? []) {
    const titleHi = NEWS_MAP[row.title_en];
    if (!titleHi || !DEVANAGARI.test(titleHi)) {
      missingNews.add(row.title_en);
      continue;
    }
    if (row.title_hi === titleHi) continue;
    plans.push({
      table: "ccshau_page_news_ticker_items",
      id: row.id,
      patch: { title_hi: titleHi },
      label: `news: ${row.title_en.slice(0, 50)}…`,
    });
  }

  const { data: corner } = await supabase
    .from("ccshau_page_student_corner_items")
    .select("id, title_en, title_hi")
    .eq("page_id", college.id)
    .eq("is_active", true);

  for (const row of corner ?? []) {
    const titleHi = STUDENT_CORNER_TITLES_HI[row.title_en];
    if (!titleHi) continue;
    if (row.title_hi === titleHi) continue;
    plans.push({
      table: "ccshau_page_student_corner_items",
      id: row.id,
      patch: { title_hi: titleHi },
      label: `student corner: ${row.title_en} → ${titleHi}`,
    });
  }

  console.log(`Plans: ${plans.length}`);
  for (const p of plans) console.log(`  - ${p.label}`);

  if (missingNews.size) {
    console.log(`\nUnmapped news titles: ${missingNews.size}`);
    for (const t of [...missingNews].sort()) console.log(`  ! ${t}`);
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
