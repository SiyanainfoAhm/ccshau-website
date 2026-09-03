#!/usr/bin/env node
/**
 * Phase 1 — CFS page headers (title_hi, excerpt_hi) + menu sync.
 *
 * Usage:
 *   node scripts/ops/apply-cfs-phase1-headers.mjs
 *   node scripts/ops/apply-cfs-phase1-headers.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-fisheries-science";
const COLLEGE_HI = "मत्स्य विज्ञान महाविद्यालय";

const CFS_HEADERS = {
  "college-of-fisheries-science": {
    title_hi: "मत्स्य विज्ञान महाविद्यालय",
    excerpt_hi: "मत्स्य विज्ञान महाविद्यालय — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।",
  },
  "cfs-department": {
    title_hi: "विभाग",
    excerpt_hi: "मत्स्य विज्ञान महाविद्यालय के विभाग।",
  },
  "cfs-gallery": {
    excerpt_hi: "मत्स्य विज्ञान महाविद्यालय की गैलरी।",
  },
};

const DEPT_TITLES_HI = {
  "cfs-aquaculture": "जलीय कृषि",
  "cfs-aquatic-animal-health-management": "जलीय पशु स्वास्थ्य प्रबंधन",
  "cfs-aquatic-environment-management": "जलीय पर्यावरण प्रबंधन",
  "cfs-fish-engineering": "मत्स्य अभियांत्रिकी",
  "cfs-fish-processing-technology": "मत्स्य प्रसंस्करण प्रौद्योगिकी",
  "cfs-fisheries-extension-economics-and-statistics": "मत्स्य विस्तार, अर्थशास्त्र और सांख्यिकी",
  "cfs-fisheries-resource-management": "मत्स्य संसाधन प्रबंधन",
};

const SUBPAGE_TITLES_HI = {
  aahmcourses: "जलीय पशु स्वास्थ्य प्रबंधन पाठ्यक्रम विवरण",
  academicactivities: "शैक्षणिक गतिविधियाँ",
  "alumni-of-the-department-54": "विभाग के पूर्व छात्र",
  "alumni-of-the-department-55": "विभाग के पूर्व छात्र",
  aquaculturecourse: "जलीय कृषि पाठ्यक्रम विवरण",
  "aquatic-animal-health-management": "जलीय पशु स्वास्थ्य प्रबंधन",
  "course-contents": "पाठ्यक्रम सामग्री",
  "course-details": "पाठ्यक्रम विवरण",
  "course-details-1": "पाठ्यक्रम विवरण",
  "courses-details": "पाठ्यक्रम विवरण",
  "courses-offered-29": "संचालित पाठ्यक्रम",
  "courses-offered-30": "संचालित पाठ्यक्रम",
  "degree-programe-mfsc-in-fisheries-resource-management":
    "एम.एफ.एससी. मत्स्य संसाधन प्रबंधन कार्यक्रम",
  "degree-programme-mfsc-in-fish-processing-technology":
    "एम.एफ.एससी. मत्स्य प्रसंस्करण प्रौद्योगिकी कार्यक्रम",
  "faculty-achievements": "संकाय उपलब्धियाँ",
  "faculty-achievements-1": "संकाय उपलब्धियाँ",
  "faculty-of-department": "विभाग के संकाय",
  "fish-processing-technology": "मत्स्य प्रसंस्करण प्रौद्योगिकी पाठ्यक्रम विवरण",
  fptcourses: "मत्स्य प्रसंस्करण प्रौद्योगिकी पाठ्यक्रम विवरण",
  frmcourses: "मत्स्य संसाधन प्रबंधन पाठ्यक्रम विवरण",
  "student-achievements-1": "छात्र उपलब्धियाँ",
  "student-achievements-2": "छात्र उपलब्धियाँ",
  "teaching-research-achievements-32": "शिक्षण और अनुसंधान उपलब्धियाँ",
  "thurst-area-35": "प्रमुख कार्य क्षेत्र",
  "thurst-area-36": "प्रमुख कार्य क्षेत्र",
  "thurst-area-37": "प्रमुख कार्य क्षेत्र",
  "thurst-area-38": "प्रमुख कार्य क्षेत्र",
  "thurst-area-39": "प्रमुख कार्य क्षेत्र",
  "thurst-areas-mission-and-vision": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-1": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-2": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-3": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-4": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-5": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-6": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
};

function subpageExcerptHi(titleHi) {
  return `${titleHi} — ${COLLEGE_HI}।`;
}

function deptExcerptHi(titleHi) {
  return `${titleHi} — ${COLLEGE_HI} का विभाग।`;
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

async function applyPatch(page, updates) {
  if (!Object.keys(updates).length) return;
  for (const [field, to] of Object.entries(updates)) {
    plans.push({
      slug: page.slug,
      field,
      from: page[field],
      to,
      mixed: field.endsWith("_hi") && isMixed(page[field]),
    });
  }
  if (APPLY) {
    await supabase.from("ccshau_pages").update(updates).eq("id", page.id);
    if (updates.title_hi) {
      await supabase.from("ccshau_menu_items").update({ label_hi: updates.title_hi }).eq("page_id", page.id);
    }
  }
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("College not found");

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi")
  .eq("college_root_id", college.id)
  .eq("status", "published");

for (const page of pages ?? []) {
  const updates = {};
  const header = CFS_HEADERS[page.slug];
  const subTitle = SUBPAGE_TITLES_HI[page.slug];
  const deptTitle = DEPT_TITLES_HI[page.slug];

  if (header?.title_hi && page.title_hi !== header.title_hi) updates.title_hi = header.title_hi;
  if (header?.excerpt_hi && needsExcerpt(page.excerpt_en ?? page.title_en, page.excerpt_hi)) {
    updates.excerpt_hi = header.excerpt_hi;
  }

  if (subTitle && page.title_hi !== subTitle) updates.title_hi = subTitle;
  if (subTitle && needsExcerpt(page.excerpt_en ?? page.title_en, page.excerpt_hi)) {
    updates.excerpt_hi = subpageExcerptHi(subTitle);
  }

  if (deptTitle) {
    if (page.title_hi !== deptTitle) updates.title_hi = deptTitle;
    if (needsExcerpt(page.excerpt_en ?? page.title_en, page.excerpt_hi)) {
      updates.excerpt_hi = deptExcerptHi(deptTitle);
    }
  }

  await applyPatch(page, updates);
}

console.log(`Phase 1 CFS: ${plans.length} field(s) | ${APPLY ? "APPLY" : "dry-run"}\n`);
for (const p of plans) {
  console.log(`  ${p.slug}.${p.field}${p.mixed ? " [was MIXED]" : ""}`);
  console.log(`    to: ${p.to}`);
}
if (!APPLY && plans.length) console.log("\nDry-run only. Pass --apply to write.");
