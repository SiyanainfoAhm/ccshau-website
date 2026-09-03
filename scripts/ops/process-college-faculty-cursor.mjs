#!/usr/bin/env node
/**
 * Process all departments for a college using Cursor translation (no external APIs).
 *
 * Usage:
 *   node scripts/ops/process-college-faculty-cursor.mjs --college=college-of-agriculture-hisar
 *   node scripts/ops/process-college-faculty-cursor.mjs --college=college-of-agriculture-hisar --skip=hisar-agricultural-extension-education
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const collegeSlug =
  process.argv.find((a) => a.startsWith("--college="))?.split("=")[1] ??
  "college-of-agriculture-hisar";
const skipSlugs = new Set(
  (process.argv.find((a) => a.startsWith("--skip="))?.split("=")[1] ?? "")
    .split(",")
    .filter(Boolean),
);

const DESIGNATION_MAP = [
  ["Associate Director (Training)-cum-Head", "संबद्ध निदेशक (प्रशिक्षण)-सह-विभागाध्यक्ष"],
  ["Associate Director (Publications)", "संबद्ध निदेशक (प्रकाशन)"],
  ["Associate Director (Training)", "संबद्ध निदेशक (प्रशिक्षण)"],
  ["Additional Directorate of Research cum Principal Scientist", "अतिरिक्त अनुसंधान निदेशालय सह प्रधान वैज्ञानिक"],
  ["Assistant Professor (Stage II)", "सहायक प्रोफेसर (द्वितीय स्तर)"],
  ["Assistant Professor (Stage-I)", "सहायक प्रोफेसर (प्रथम स्तर)"],
  ["Assistant Professor", "सहायक प्रोफेसर"],
  ["Associate Professor", "एसोसिएट प्रोफेसर"],
  ["Assoc. Professor", "एसोसिएट प्रोफेसर"],
  ["Professor and Head", "प्रोफेसर एवं विभागाध्यक्ष"],
  ["Professor and Dean", "प्रोफेसर एवं डीन"],
  ["Professor", "प्रोफेसर"],
  ["Senior Scientist & Head", "वरिष्ठ वैज्ञानिक एवं विभागाध्यक्ष"],
  ["Senior Scientist", "वरिष्ठ वैज्ञानिक"],
  ["Principal Scientist", "प्रधान वैज्ञानिक"],
  ["Assistant Scientist", "सहायक वैज्ञानिक"],
  ["Assistant Chemist (Soils)", "सहायक रसायनज्ञ (मृदा)"],
  ["Head of the Department", "विभागाध्यक्ष"],
  ["Head of Department", "विभागाध्यक्ष"],
  ["Dean", "डीन"],
  ["Microbiologist", "सूक्ष्मजीव विज्ञ"],
  ["Junior Breeder", "कनिष्ठ प्रजनक"],
  ["Asstt. Economic Botanist", "सहायक आर्थिक वनस्पतिविज्ञ"],
  ["Sr. Scientist", "वरिष्ठ वैज्ञानिक"],
];

const QUAL_MAP = [
  ["Ph.D. & NET (Agronomy)", "पीएच.डी. एवं नेट (कृषि विज्ञान)"],
  ["Ph. D. (Soil Science), NET", "पीएच.डी. (मृदा विज्ञान), नेट"],
  ["Ph.D. (Agril. Economics)", "पीएच.डी. (कृषि अर्थशास्त्र)"],
  ["Ph.D. (Soil Science)", "पीएच.डी. (मृदा विज्ञान)"],
  ["Ph.D. Plant Pathology", "पीएच.डी. पादप रोग विज्ञान"],
  ["Ph.D (Plant Pathology)", "पीएच.डी. (पादप रोग विज्ञान)"],
  ["Ph.D. Entomology", "पीएच.डी. कीट विज्ञान"],
  ["Ph. D. , Post-Doc", "पीएच.डी., पोस्ट-डॉक"],
  ["B.Sc B.ed M.Sc Ph.D", "बी.एससी, बी.एड, एम.एससी, पीएच.डी."],
  ["Ph. D.", "पीएच.डी."],
  ["Ph.D.", "पीएच.डी."],
  ["Ph.D", "पीएच.डी."],
  ["Ph.d", "पीएच.डी."],
  ["Ph. D", "पीएच.डी."],
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function mapPhrase(text, table) {
  if (!text) return text;
  let out = text;
  for (const [en, hi] of table) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  return out;
}

/** Basic Latin → Devanagari transliteration for faculty names. */
function transliterateName(name) {
  const cleaned = name
    .replace(/\bDr\.?\s*/gi, "")
    .replace(/\b\(Mrs?\.\)\s*/gi, "")
    .replace(/\bProf\.?\s*/gi, "")
    .trim();
  const map = {
    a: "अ", b: "ब", c: "क", d: "ड", e: "े", f: "फ", g: "ग", h: "ह", i: "ि",
    j: "ज", k: "क", l: "ल", m: "म", n: "न", o: "ो", p: "प", q: "क", r: "र",
    s: "स", t: "ट", u: "ु", v: "व", w: "व", x: "क्स", y: "य", z: "ज",
    sh: "श", ch: "च", th: "थ", dh: "ध", kh: "ख", gh: "घ", ph: "फ", bh: "भ",
    au: "ौ", ai: "ै", ee: "ी", oo: "ू", aa: "ा",
  };
  let result = "";
  const lower = cleaned.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const two = lower.slice(i, i + 2);
    const one = lower[i];
    if (map[two]) {
      result += map[two];
      i += 1;
    } else if (one === " ") {
      result += " ";
    } else if (map[one]) {
      result += map[one];
    } else {
      result += cleaned[i] ?? one;
    }
  }
  const prefix = /^dr\.?\s/i.test(name) ? "डॉ. " : "";
  return prefix + result.replace(/\s+/g, " ").trim();
}

function buildShortTranslations(gaps) {
  const t = {};
  if (gaps.name_hi) t.name_hi = transliterateName(gaps.name_hi);
  if (gaps.designation_hi) t.designation_hi = mapPhrase(gaps.designation_hi, DESIGNATION_MAP);
  if (gaps.specialization_hi) t.specialization_hi = mapPhrase(gaps.specialization_hi, DESIGNATION_MAP);
  if (gaps.qualification_hi) {
    const q = gaps.qualification_hi;
    if (!q.includes("@")) t.qualification_hi = mapPhrase(q, QUAL_MAP);
  }
  if (gaps.experience_hi) t.experience_hi = gaps.experience_hi.replace(/years/i, "वर्ष").replace(/year/i, "वर्ष");
  return t;
}

function runNode(script, args) {
  const r = spawnSync(process.execPath, [join(ROOT, script), ...args], {
    cwd: ROOT,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`${script} failed`);
}

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id")
    .eq("slug", collegeSlug)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${collegeSlug}`);

  const { pageIds, pageById } = await resolveStaffPageIds(supabase, college.id, {
    publishedOnly: true,
  });

  let total = 0;
  for (const pageId of pageIds) {
    const dept = pageById.get(pageId);
    if (skipSlugs.has(dept.slug)) {
      console.log(`SKIP ${dept.slug} (already done)`);
      continue;
    }

    console.log(`\n=== ${dept.title_en} (${dept.slug}) ===`);
    runNode("scripts/ops/export-college-faculty-gaps.mjs", [
      `--college=${collegeSlug}`,
      `--department=${dept.slug}`,
    ]);

    const pendingPath = join(
      ROOT,
      `Documents/hindi-faculty/${collegeSlug}-${dept.slug}-pending.json`,
    );
    const translatedPath = pendingPath.replace("-pending.json", "-translated.json");
    const pending = JSON.parse(readFileSync(pendingPath, "utf8"));

    const staff = pending.staff.map((row) => ({
      id: row.id,
      name_en: row.name_en,
      translations: buildShortTranslations(row.gaps),
    }));

    writeFileSync(translatedPath, JSON.stringify({ ...pending, staff }, null, 2), "utf8");
    runNode("scripts/ops/cursor-translate-faculty-html.mjs", [pendingPath]);
    runNode("scripts/ops/apply-college-faculty-hindi.mjs", [translatedPath]);
    total += staff.length;
  }

  console.log(`\nDone. Applied translations for ${total} staff across college.`);
  runNode("scripts/ops/sync-faculty-hindi-from-page-staff.mjs", [`--college=${collegeSlug}`]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
