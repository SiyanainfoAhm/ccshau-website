#!/usr/bin/env node
/**
 * Apply Hindi title_hi for news ticker + student corner across all college/directorate microsites.
 * Uses curated map from apply-news-hindi-cursor.mjs plus common student-corner titles.
 *
 * Usage:
 *   node scripts/ops/apply-all-college-news-hindi.mjs
 *   node scripts/ops/apply-all-college-news-hindi.mjs --apply
 *   node scripts/ops/apply-all-college-news-hindi.mjs --apply --college=college-of-agriculture-hisar
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const collegeFilter = process.argv.find((a) => a.startsWith("--college="))?.split("=")[1];

const STUDENT_CORNER_TITLES_HI = {
  "Post Graduate Course Catalogue": "स्नातकोत्तर पाठ्यक्रम सूची",
  "Feedback Form for UG Students": "स्नातक छात्रों के लिए प्रतिक्रिया प्रपत्र",
  "Under Graduate Course Catalogue -2025": "स्नातक पाठ्यक्रम सूची - 2025",
  "Under Graduate Course Catalogue - 2025": "स्नातक पाठ्यक्रम सूची - 2025",
  "Under Graduate Course Catalogue": "स्नातक पाठ्यक्रम सूची",
  "Under Graduate Course Catalogue -2026 (As per 5th Dean's committee)":
    "स्नातक पाठ्यक्रम सूची -2026 (5वीं डीन समिति के अनुसार)",
  "Under Graduate Course Catalogue -2026 (As per 6th Dean's committee)":
    "स्नातक पाठ्यक्रम सूची -2026 (6वीं डीन समिति के अनुसार)",
  "Academic Calendar 2025-26": "शैक्षणिक कैलेंडर 2025-26",
  "Anti Ragging Vigilance Committee 2024-25": "रैगिंग विरोधी सतर्कता समिति 2024-25",
  "Committee of Student Counselor 2024-25": "छात्र परामर्शदाता समिति 2024-25",
  "IVth Dean Committee": "चतुर्थ डीन समिति",
  "Institution Industry Cell Committee 2024-25": "संस्थान उद्योग प्रकोष्ठ समिति 2024-25",
  "Menance of ragging 2024-25": "रैगिंग की समस्या 2024-25",
  "Prevention of Sexual Harassment Committee 2024-25": "यौन उत्पीड़न रोकथाम समिति 2024-25",
  "UG Time table 1st Sem, 2025-26": "स्नातक समय सारणी प्रथम सेमेस्टर, 2025-26",
  "Vth Dean Committee": "पाँचवीं डीन समिति",
  "Details of students enrolled in B.Sc. (Hons) Ag. – 6 year programme":
    "बी.एस.सी. (ऑनर्स) कृषि — 6 वर्षीय कार्यक्रम में नामांकित छात्रों का विवरण",
  "Student on Roll (2018-19 to 2022-23)": "नामांकित छात्र (2018-19 से 2022-23)",
  "Students in take 2025-26": "छात्र प्रवेश 2025-26",
  "Time table (2nd Semester 2023 -24) - Revised - I":
    "समय सारणी (द्वितीय सेमेस्टर 2023-24) — संशोधित — I",
  "Central Disciplinary Committee 2024-25": "केंद्रीय अनुशासन समिति 2024-25",
  "Proforma for Bus Pass": "बस पास हेतु प्रपत्र",
  "Download Nomination Form": "नामांकन प्रपत्र डाउनलोड करें",
};

const NEWS_EXTRA_HI = {
  "Antiragging Committee": "रैगिंग विरोधी समिति",
  Brochure: "ब्रोशर",
  "Accreditation Team in COBS&H -2023": "सीओबीएसएच में प्रत्यायन दल -2023",
  "Constitute the following College Purchase Committee": "निम्नलिखित महाविद्यालय क्रय समिति का गठन",
  "Coordinator of Project Review Committee": "परियोजना समीक्षा समिति के समन्वयक",
  "MoU Signing Ceremony between CCSHU and Warsaw University, Warsaw, Poland":
    "सीसीएसएचएयू और वार्सा विश्वविद्यालय, वार्सा, पोलैंड के बीच एमओयू हस्ताक्षर समारोह",
  "Institution Innovation Council (IIC) Committee": "संस्थान नवाचार परिषद (आईआईसी) समिति",
  "Internal Quality Assurance Cell 2024-25": "आंतरिक गुणवत्ता आश्वासन प्रकोष्ठ 2024-25",
  "उड़ान College Magazine": "उड़ान महाविद्यालय पत्रिका",
  'Technical bulletin on "Trends in Area, Production and Productivity of Rice, Wheat, Pulses and Oilseeds-Global, India and Haryana Perspective"':
    '"धान, गेहूँ, दलहन और तिलहन के क्षेत्र, उत्पादन और उत्पादकता के रुझान — वैश्विक, भारत और हरियाणा परिप्रेक्ष्य" पर तकनीकी बुलेटिन',
  "National Ragging Prevention Programme": "राष्ट्रीय रैगिंग रोकथाम कार्यक्रम",
  "NIRF (COCS)-2026 (Overall category)": "एनआईआरएफ (सीओसीएस)-2026 (कुल श्रेणी)",
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
  const { data: allColleges } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, college_root_id")
    .eq("page_type", "college")
    .order("slug");

  let roots = (allColleges ?? []).filter((p) => p.college_root_id === p.id);
  if (collegeFilter) roots = roots.filter((r) => r.slug === collegeFilter);

  const plans = [];
  const missingNews = new Set();
  const missingCorner = new Set();

  for (const root of roots) {
    const { data: pages } = await supabase
      .from("ccshau_pages")
      .select("id, slug")
      .or(`id.eq.${root.id},college_root_id.eq.${root.id}`);

    const pageById = Object.fromEntries((pages ?? []).map((p) => [p.id, p]));
    const pageIds = (pages ?? []).map((p) => p.id);

    const { data: news } = await supabase
      .from("ccshau_page_news_ticker_items")
      .select("id, page_id, title_en, title_hi")
      .in("page_id", pageIds)
      .eq("is_active", true);

    for (const row of news ?? []) {
      if (!needsHi(row.title_en, row.title_hi)) continue;
      const titleHi = NEWS_MAP[row.title_en];
      if (!titleHi || !DEVANAGARI.test(titleHi)) {
        missingNews.add(`[${root.slug}/${pageById[row.page_id]?.slug}] ${row.title_en}`);
        continue;
      }
      if (row.title_hi === titleHi) continue;
      plans.push({
        table: "ccshau_page_news_ticker_items",
        id: row.id,
        patch: { title_hi: titleHi },
        label: `${root.slug}: ${row.title_en.slice(0, 55)}…`,
      });
    }

    const { data: corner } = await supabase
      .from("ccshau_page_student_corner_items")
      .select("id, page_id, title_en, title_hi")
      .in("page_id", pageIds)
      .eq("is_active", true);

    for (const row of corner ?? []) {
      if (!needsHi(row.title_en, row.title_hi)) continue;
      const titleHi = STUDENT_CORNER_TITLES_HI[row.title_en];
      if (!titleHi) {
        missingCorner.add(`[${root.slug}/${pageById[row.page_id]?.slug}] ${row.title_en}`);
        continue;
      }
      if (row.title_hi === titleHi) continue;
      plans.push({
        table: "ccshau_page_student_corner_items",
        id: row.id,
        patch: { title_hi: titleHi },
        label: `${root.slug} corner: ${row.title_en}`,
      });
    }
  }

  console.log(`Microsites: ${roots.length}`);
  console.log(`Plans: ${plans.length}`);
  for (const p of plans.slice(0, 40)) console.log(`  - ${p.label}`);
  if (plans.length > 40) console.log(`  … and ${plans.length - 40} more`);

  if (missingNews.size) {
    console.log(`\nUnmapped news: ${missingNews.size}`);
    for (const t of [...missingNews].sort().slice(0, 30)) console.log(`  ! ${t}`);
    if (missingNews.size > 30) console.log(`  … and ${missingNews.size - 30} more`);
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
