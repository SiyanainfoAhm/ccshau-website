#!/usr/bin/env node
/**
 * Phase 3 — Apply Hindi about/content for College of Fisheries Science.
 *
 * Usage:
 *   node scripts/ops/apply-cfs-phase3-about.mjs
 *   node scripts/ops/apply-cfs-phase3-about.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari, translateAboutHtmlPhrase } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-fisheries-science";
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");
const CFS_DIR = join(ROOT, "Documents/hindi-cfs");

const DEPT_SLUGS = [
  "cfs-aquaculture",
  "cfs-aquatic-animal-health-management",
  "cfs-aquatic-environment-management",
  "cfs-fish-engineering",
  "cfs-fish-processing-technology",
  "cfs-fisheries-extension-economics-and-statistics",
  "cfs-fisheries-resource-management",
];

const PAGE_TITLE_HI = {
  "thurst-areas-mission-and-vision": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-1": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-2": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-3": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-4": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-5": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-areas-mission-and-vision-6": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "thurst-area-35": "प्रमुख कार्य क्षेत्र",
  "thurst-area-36": "प्रमुख कार्य क्षेत्र",
  "thurst-area-37": "प्रमुख कार्य क्षेत्र",
  "thurst-area-38": "प्रमुख कार्य क्षेत्र",
  "thurst-area-39": "प्रमुख कार्य क्षेत्र",
  "faculty-achievements": "संकाय उपलब्धियाँ",
  "faculty-achievements-1": "संकाय उपलब्धियाँ",
  "student-achievements-1": "छात्र उपलब्धियाँ",
  "student-achievements-2": "छात्र उपलब्धियाँ",
  "alumni-of-the-department-54": "विभाग के पूर्व छात्र",
  "alumni-of-the-department-55": "विभाग के पूर्व छात्र",
  "courses-offered-29": "संचालित पाठ्यक्रम",
  "courses-offered-30": "संचालित पाठ्यक्रम",
  "teaching-research-achievements-32": "शिक्षण और अनुसंधान उपलब्धियाँ",
  academicactivities: "शैक्षणिक गतिविधियाँ",
  aahmcourses: "जलीय पशु स्वास्थ्य प्रबंधन पाठ्यक्रम विवरण",
  aquaculturecourse: "जलीय कृषि पाठ्यक्रम विवरण",
  fptcourses: "मत्स्य प्रसंस्करण प्रौद्योगिकी पाठ्यक्रम विवरण",
  frmcourses: "मत्स्य संसाधन प्रबंधन पाठ्यक्रम विवरण",
  "course-contents": "पाठ्यक्रम सामग्री",
  "course-details": "पाठ्यक्रम विवरण",
  "course-details-1": "पाठ्यक्रम विवरण",
  "courses-details": "पाठ्यक्रम विवरण",
  "fish-processing-technology": "मत्स्य प्रसंस्करण प्रौद्योगिकी पाठ्यक्रम विवरण",
  "aquatic-animal-health-management": "जलीय पशु स्वास्थ्य प्रबंधन",
  "degree-programe-mfsc-in-fisheries-resource-management": "एम.एफ.एससी. मत्स्य संसाधन प्रबंधन कार्यक्रम",
  "degree-programme-mfsc-in-fish-processing-technology": "एम.एफ.एससी. मत्स्य प्रसंस्करण प्रौद्योगिकी कार्यक्रम",
  "faculty-of-department": "विभाग के संकाय",
};

const CURATED_HI = {
  "cfs-department":
    "<p>मत्स्य विज्ञान महाविद्यालय के अंतर्गत विभाग।</p>",
  "cfs-gallery":
    "<p>मत्स्य विज्ञान महाविद्यालय की फोटो गैलरी।</p>",
};

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

function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}
function isMixed(t) {
  return hasDevanagari(t) && hasLatin(t);
}
function needsContent(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim() || !hasDevanagari(hi)) return true;
  if (isMixed(hi)) return true;
  return false;
}

function readHiFile(slug) {
  for (const dir of [CFS_DIR, ABOUT_DIR]) {
    const hiFile = join(dir, `${slug}-hi.html`);
    if (existsSync(hiFile)) {
      const text = readFileSync(hiFile, "utf8").trim();
      if (hasDevanagari(text)) return text;
    }
  }
  return CURATED_HI[slug] ?? null;
}

function translateLegacyPdfHtml(html, slug) {
  const m = html.match(
    /Legacy document <code>([^<]+)<\/code> — pending Phase 4 upload \(<code>([^<]+)<\/code>\)\./,
  );
  if (!m) return null;
  const body = html.replace(/<hr\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
  if (body.length > 350) return null;

  const titleMatch = html.match(/<strong>([^<]+)<\/strong>/);
  const titleHi = PAGE_TITLE_HI[slug] ?? null;
  const titleBlock = titleHi
    ? `<p><strong>${titleHi}</strong></p>`
    : titleMatch
      ? `<p><strong>${titleMatch[1]}</strong></p>`
      : "";
  return `${titleBlock}<p>दस्तावेज़ <code>${m[1]}</code> शीघ्र उपलब्ध कराया जाएगा (<code>${m[2]}</code>)।</p>`;
}

function translatePlainHtml(html, slug) {
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain === "Departments under College of Fisheries Science.") {
    return CURATED_HI["cfs-department"];
  }
  return null;
}

function resolveContentHi(slug, contentEn) {
  const curated = readHiFile(slug);
  if (curated && hasDevanagari(curated)) return { html: curated, source: "file" };

  const pdfHi = translateLegacyPdfHtml(contentEn, slug);
  if (pdfHi && hasDevanagari(pdfHi)) return { html: pdfHi, source: "pdf-placeholder" };

  const plainHi = translatePlainHtml(contentEn, slug);
  if (plainHi && hasDevanagari(plainHi)) return { html: plainHi, source: "plain" };

  const phrase = translateAboutHtmlPhrase(contentEn);
  if (phrase && hasDevanagari(phrase)) return { html: phrase, source: "phrase" };

  return { html: null, source: "failed" };
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("College not found");

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, content_en, content_hi")
  .eq("college_root_id", college.id)
  .eq("status", "published")
  .order("slug");

const plans = [];
let updated = 0;

for (const page of pages ?? []) {
  if (!needsContent(page.content_en, page.content_hi)) continue;

  // College home already has curated Hindi; phrase fallback would regress it.
  if (
    page.slug === "college-of-fisheries-science" &&
    page.content_hi?.trim() &&
    hasDevanagari(page.content_hi) &&
    page.content_hi.length > 400
  ) {
    continue;
  }

  const { html, source } = resolveContentHi(page.slug, page.content_en);
  plans.push({
    slug: page.slug,
    source,
    mixed_before: isMixed(page.content_hi),
    preview: html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 90),
  });

  if (!html) {
    console.warn(`  SKIP ${page.slug} — no Hindi resolved`);
    continue;
  }
  if (page.content_hi?.trim() === html.trim()) continue;

  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update({ content_hi: html }).eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
    updated++;
  }
}

console.log(`Phase 3 about (CFS): ${plans.length} page(s) | Updated: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) {
  console.log(`  ${p.slug}${p.mixed_before ? " [was MIXED]" : ""} ← ${p.source}`);
  if (p.preview) console.log(`    ${p.preview}...`);
}
