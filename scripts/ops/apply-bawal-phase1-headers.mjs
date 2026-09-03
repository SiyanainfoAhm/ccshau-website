#!/usr/bin/env node
/**
 * Phase 1 — Bawal college page headers (title_hi, excerpt_hi) + menu sync.
 * Does NOT touch content_hi (Phase 3).
 *
 * Usage:
 *   node scripts/ops/apply-bawal-phase1-headers.mjs
 *   node scripts/ops/apply-bawal-phase1-headers.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-agriculture-bawal";

/** Curated headers for hero, sub-menu, and department section. */
const BAWAL_HEADERS = {
  "college-of-agriculture-bawal": {
    title_hi: "कृषि महाविद्यालय, बावल",
    excerpt_hi: "कृषि महाविद्यालय, बावल — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।",
  },
  department: {
    title_hi: "विभाग",
    excerpt_hi: "कृषि महाविद्यालय, बावल के विभाग।",
  },
  "bawal-agriculture-college": {
    title_hi: "कृषि महाविद्यालय",
    excerpt_hi:
      "कृषि महाविद्यालय, बावल — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार का अंग।",
  },
};

/** Sub-page titles shown in departments dropdown / linked pages. */
const BAWAL_SUBPAGE_TITLES = {
  "academic-programmes-3": "शैक्षणिक कार्यक्रम और प्रवेश नीति",
  "annual-college-report": "वार्षिक महाविद्यालय रिपोर्ट",
  "awards-and-honors-41": "पुरस्कार और सम्मान",
  "college-magazine": "महाविद्यालय पत्रिका",
  "courses-offered-26": "संचालित पाठ्यक्रम",
  "courses-taught-1": "सिखाए गए पाठ्यक्रम",
  "cultural-activities": "सांस्कृतिक गतिविधियाँ",
  "curriculum-design": "पाठ्यक्रम डिज़ाइन",
  "details-of-students-enrolled-in-bsc-hons-ag-6-year-programme":
    "बी.एससी. (ऑनर्स) कृ. 6 वर्षीय कार्यक्रम में नामांकित छात्रों का विवरण",
  "details-of-students-placed": "प्लेस हुए छात्रों का विवरण",
  "facilities-infrastructure": "सुविधाएँ और अवसंरचना",
  "future-planning": "भविष्य की योजना",
  gallery: "गैलरी",
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

/** Standard excerpt for sub-pages: "{title} — CCSHAU, Bawal." pattern */
function subpageExcerptHi(titleHi) {
  return `${titleHi} — कृषि महाविद्यालय, बावल।`;
}

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function isMixed(t) {
  return /[\u0900-\u097F]/.test(t ?? "") && /[A-Za-z]/.test(t ?? "");
}
function needsExcerpt(en, hi) {
  if (!en?.trim()) return false;
  return !hi?.trim() || !/[\u0900-\u097F]/.test(hi);
}

const plans = [];

async function planUpdate(slug, patch, { collegeId } = {}) {
  let query = supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi")
    .eq("slug", slug);
  if (collegeId) query = query.eq("college_root_id", collegeId);
  const { data: page } = await query.maybeSingle();
  if (!page) {
    console.warn(`Missing: ${slug}`);
    return;
  }

  const updates = {};
  if (patch.title_hi && page.title_hi !== patch.title_hi) {
    updates.title_hi = patch.title_hi;
    plans.push({ slug, field: "title_hi", from: page.title_hi, to: patch.title_hi, mixed: isMixed(page.title_hi) });
  }
  if (patch.excerpt_hi && page.excerpt_hi !== patch.excerpt_hi) {
    updates.excerpt_hi = patch.excerpt_hi;
    plans.push({ slug, field: "excerpt_hi", from: page.excerpt_hi, to: patch.excerpt_hi });
  }

  if (!Object.keys(updates).length) return;

  if (APPLY) {
    await supabase.from("ccshau_pages").update(updates).eq("id", page.id);
    if (updates.title_hi) {
      await supabase.from("ccshau_menu_items").update({ label_hi: updates.title_hi }).eq("page_id", page.id);
    }
  }
}

const { data: college } = await supabase
  .from("ccshau_pages")
  .select("id")
  .eq("slug", COLLEGE_SLUG)
  .maybeSingle();
if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

for (const [slug, patch] of Object.entries(BAWAL_HEADERS)) {
  await planUpdate(slug, patch, { collegeId: college.id });
}

for (const [slug, titleHi] of Object.entries(BAWAL_SUBPAGE_TITLES)) {
  const patch = { title_hi: titleHi };
  const { data: page } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi")
    .eq("college_root_id", college.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!page) continue;

  const excerptHi = subpageExcerptHi(titleHi);
  if (page.title_hi !== titleHi) patch.title_hi = titleHi;
  if (needsExcerpt(page.excerpt_en ?? page.title_en, page.excerpt_hi)) patch.excerpt_hi = excerptHi;

  await planUpdate(slug, patch, { collegeId: college.id });
}

console.log(`\nPhase 1 Bawal: ${plans.length} field(s) | ${APPLY ? "APPLY" : "dry-run"}\n`);
for (const p of plans) {
  console.log(`  ${p.slug}.${p.field}${p.mixed ? " [was MIXED]" : ""}`);
  console.log(`    from: ${p.from ?? "(null)"}`);
  console.log(`    to:   ${p.to}`);
}

if (!APPLY && plans.length) console.log("\nDry-run only. Pass --apply to write.");
