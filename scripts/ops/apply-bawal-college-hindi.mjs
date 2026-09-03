#!/usr/bin/env node
/**
 * Apply Hindi titles, excerpts, and main About content for College of Agriculture, Bawal.
 *
 * Usage:
 *   node scripts/ops/apply-bawal-college-hindi.mjs
 *   node scripts/ops/apply-bawal-college-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-agriculture-bawal";

/** slug → title_hi for Bawal college pages (top sub menu + hero). */
const BAWAL_PAGE_TITLES_HI = {
  "bawal-agriculture-college": "कृषि महाविद्यालय",
  "academic-programmes-3": "शैक्षणिक कार्यक्रम और प्रवेश नीति",
  "annual-college-report": "वार्षिक महाविद्यालय रिपोर्ट",
  "awards-and-honors-41": "पुरस्कार और सम्मान",
  "college-magazine": "महाविद्यालय पत्रिका",
  "courses-offered-26": "संचालित पाठ्यक्रम",
  "cultural-activities": "सांस्कृतिक गतिविधियाँ",
  "curriculum-design": "पाठ्यक्रम डिज़ाइन",
  "details-of-students-enrolled-in-bsc-hons-ag-6-year-programme":
    "बी.एससी. (ऑनर्स) कृ. 6 वर्षीय कार्यक्रम में नामांकित छात्रों का विवरण",
  "details-of-students-placed": "प्लेस हुए छात्रों का विवरण",
  "facilities-infrastructure": "सुविधाएँ और अवसंरचना",
  "future-planning": "भविष्य की योजना",
  "hostel-1": "छात्रावास",
  "infrastructure-31": "अवसंरचना",
  "mandate-6": "जनादेश",
  "national-seminar-1": "राष्ट्रीय सेमिनार",
  "nss-wing": "एन.एस.एस. विंग",
  "objectives-15": "उद्देश्य",
  "sports-activities-1": "खेल गतिविधियाँ",
  "students-achievements": "छात्र उपलब्धियाँ",
  "teaching-research-achievements-3": "शिक्षण और अनुसंधान उपलब्धियाँ",
};

const BAWAL_EXCERPTS_HI = {
  "bawal-agriculture-college": "कृषि महाविद्यालय, बावल में कृषि महाविद्यालय।",
};

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

const MAIN_CONTENT_HI = readFileSync(
  join(ROOT, "Documents/hindi-bawal/bawal-agriculture-college-hi.html"),
  "utf8",
);

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, title_en")
    .eq("slug", COLLEGE_SLUG)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

  const plans = [];

  for (const [slug, titleHi] of Object.entries(BAWAL_PAGE_TITLES_HI)) {
    const { data: page } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, title_hi, excerpt_hi")
      .eq("college_root_id", college.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!page) {
      console.warn(`Skip missing page: ${slug}`);
      continue;
    }

    const excerptHi = BAWAL_EXCERPTS_HI[slug];
    const patch = {};
    if (page.title_hi !== titleHi) patch.title_hi = titleHi;
    if (excerptHi && page.excerpt_hi !== excerptHi) patch.excerpt_hi = excerptHi;
    if (slug === "bawal-agriculture-college") patch.content_hi = MAIN_CONTENT_HI;

    if (Object.keys(patch).length === 0) {
      console.log(`= ${slug} (already set)`);
      continue;
    }

    plans.push({ id: page.id, slug, titleEn: page.title_en, patch });
    console.log(`→ ${slug} (${page.title_en})`);
    if (patch.title_hi) console.log(`    title_hi: ${patch.title_hi}`);
    if (patch.excerpt_hi) console.log(`    excerpt_hi: ${patch.excerpt_hi}`);
    if (patch.content_hi) console.log(`    content_hi: ${patch.content_hi.length} chars`);
  }

  console.log(`\nPages to update: ${plans.length}`);

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  for (const p of plans) {
    const { error } = await supabase.from("ccshau_pages").update(p.patch).eq("id", p.id);
    if (error) throw new Error(`${p.slug}: ${error.message}`);
  }

  console.log(`\nUpdated ${plans.length} page(s) for ${college.title_en}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
