#!/usr/bin/env node
/**
 * Phase 3 — Apply Hindi about/content for College of Basic Sciences & Humanities.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-phase3-about.mjs
 *   node scripts/ops/apply-cobsh-phase3-about.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari, translateAboutHtmlPhrase } from "./department-hindi-shared.mjs";
import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-basic-sciences-humanities";
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");
const COBSH_DIR = join(ROOT, "Documents/hindi-cobsh");

const COBSH_EXTRA_TITLES_HI = {
  "Academic Programmes": "शैक्षणिक कार्यक्रम",
  "Award and Honors": "पुरस्कार और सम्मान",
  "Any other Information": "अन्य जानकारी",
  "Awards/Honours received by faculty members": "संकाय सदस्यों द्वारा प्राप्त पुरस्कार/सम्मान",
  "Books published by the faculty": "संकाय द्वारा प्रकाशित पुस्तकें",
  "Course Catalogue": "पाठ्यक्रम सूची",
  "Extension activities/Consultancy": "विस्तार गतिविधियाँ/परामर्श",
  "Fellowships/Projects/Foreign Visits of Faculty": "संकाय की फेलोशिप/परियोजनाएँ/विदेश यात्राएँ",
  "Future Protections": "भविष्य की योजनाएँ",
  "Infrastructural Development": "अवसंरचना विकास",
  "Instructional Manuals/Research Bulletins": "शिक्षण मैनुअल/अनुसंधान बुलेटिन",
  "List of Placement of Students": "छात्रों के प्लेसमेंट की सूची",
  "List of Students on Roll": "नामांकित छात्रों की सूची",
  "Major contributions": "प्रमुख योगदान",
  "Mathematics and Statistics at a Glance": "गणित और सांख्यिकी — एक नज़र में",
  "Mites Database": "माइट्स डेटाबेस",
  "Monographs, Research Bulletins and Manuals (Sociology)":
    "ग्रंथ, अनुसंधान बुलेटिन और मैनुअल (समाजशास्त्र)",
  "NATP Research Project Reports": "एन.ए.टी.पी. अनुसंधान परियोजना रिपोर्ट",
  "Ongoing Project": "चल रही परियोजना",
  "Package and Practices": "पैकेज और प्रथाएँ",
  "Paddy straw composting": "धान की पराली कम्पोस्टिंग",
  "Research Highlights": "अनुसंधान की मुख्य झलकियाँ",
  "Research Project in Operation": "संचालित अनुसंधान परियोजना",
  Achievments: "उपलब्धियाँ",
  "Seminar/Symposium/ Workshop/ Conferences": "सेमिनार/ सिम्पोजियम/ कार्यशाला/ सम्मेलन",
  "Software Developed": "विकसित सॉफ्टवेयर",
  "Specific achievements": "विशिष्ट उपलब्धियाँ",
  "Student qualified NET, GATE OR any other examination":
    "एन.ई.टी., गेट या अन्य परीक्षा उत्तीर्ण छात्र",
  "Thrust area": "प्रमुख कार्य क्षेत्र",
  "Thrust Areas": "प्रमुख कार्य क्षेत्र",
  "Thurst Areas of Research": "अनुसंधान के प्रमुख कार्य क्षेत्र",
  "Training/Symposium/Conference Organized": "आयोजित प्रशिक्षण/ सिम्पोजियम/ सम्मेलन",
};

const PAGE_TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI, ...COBSH_EXTRA_TITLES_HI };

const CURATED_HI = {
  "cbs-department": "<p>मूल विज्ञान और मानविकी महाविद्यालय के अंतर्गत विभाग।</p>",
  department: "<p>मूल विज्ञान और मानविकी महाविद्यालय के अंतर्गत विभाग।</p>",
  gallery: "<p>मूल विज्ञान और मानविकी महाविद्यालय की फोटो गैलरी।</p>",
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
  for (const dir of [COBSH_DIR, ABOUT_DIR]) {
    const hiFile = join(dir, `${slug}-hi.html`);
    if (existsSync(hiFile)) {
      const text = readFileSync(hiFile, "utf8").trim();
      if (hasDevanagari(text)) return text;
    }
  }
  return CURATED_HI[slug] ?? null;
}

function translateLegacyPdfHtml(html, slug, titleEn) {
  const m = html.match(
    /Legacy document <code>([^<]+)<\/code> — pending Phase 4 upload \(<code>([^<]+)<\/code>\)\./,
  );
  if (!m) return null;
  const body = html.replace(/<hr\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
  if (body.length > 350) return null;

  const titleMatch = html.match(/<strong>([^<]+)<\/strong>/);
  const titleHi =
    PAGE_TITLE_HI[titleEn?.trim()] ?? PAGE_TITLE_HI[titleMatch?.[1]?.trim()] ?? null;
  const titleBlock = titleHi
    ? `<p><strong>${titleHi}</strong></p>`
    : titleMatch
      ? `<p><strong>${titleMatch[1]}</strong></p>`
      : "";
  return `${titleBlock}<p>दस्तावेज़ <code>${m[1]}</code> शीघ्र उपलब्ध कराया जाएगा (<code>${m[2]}</code>)।</p>`;
}

function translatePlainHtml(html) {
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/Departments under College of Basic Sciences/i.test(plain)) {
    return CURATED_HI["cbs-department"];
  }
  return null;
}

function resolveContentHi(slug, contentEn, titleEn) {
  const curated = readHiFile(slug);
  if (curated && hasDevanagari(curated)) return { html: curated, source: "file" };

  const pdfHi = translateLegacyPdfHtml(contentEn, slug, titleEn);
  if (pdfHi && hasDevanagari(pdfHi)) return { html: pdfHi, source: "pdf-placeholder" };

  const plainHi = translatePlainHtml(contentEn);
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
let skipped = 0;

for (const page of pages ?? []) {
  if (!needsContent(page.content_en, page.content_hi)) continue;

  if (
    page.slug === "college-basic-sciences-humanities" &&
    page.content_hi?.trim() &&
    hasDevanagari(page.content_hi) &&
    page.content_hi.length > 400
  ) {
    skipped++;
    continue;
  }

  const { html, source } = resolveContentHi(page.slug, page.content_en, page.title_en);
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

console.log(`Phase 3 about (COBSH): ${plans.length} page(s) | Updated: ${updated} | Skipped college home: ${skipped} | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) {
  console.log(`  ${p.slug}${p.mixed_before ? " [was MIXED]" : ""} ← ${p.source}`);
  if (p.preview) console.log(`    ${p.preview}...`);
}
