#!/usr/bin/env node
/**
 * Phase 3 — Apply Hindi about/content for I.C. College of Community Science.
 *
 * Usage:
 *   node scripts/ops/apply-icccs-phase3-about.mjs
 *   node scripts/ops/apply-icccs-phase3-about.mjs --apply
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
const COLLEGE_SLUG = "ic-college-of-community-science";
const ICCC_DIR = join(ROOT, "Documents/hindi-icccc");
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");

const ICCC_EXTRA_TITLES_HI = {
  "BSMA  Courses": "बी.एस.एम.ए. पाठ्यक्रम",
  "Course Offered": "संचालित पाठ्यक्रम",
  "Gallery of Dempartment": "विभाग की गैलरी",
  "List of PG students": "स्नातकोत्तर छात्रों की सूची",
  "Major contributions": "प्रमुख योगदान",
  "Ongoing Research  Projects": "चल रही अनुसंधान परियोजनाएँ",
  "Publications (List of Books/Manual/Technical Bulletins only)":
    "प्रकाशन (केवल पुस्तकें/मैनुअल/तकनीकी बुलेटिन की सूची)",
  "Students achievements": "छात्र उपलब्धियाँ",
  "Teaching & Research Achievements": "शिक्षण और अनुसंधान उपलब्धियाँ",
  "Teaching Achievements": "शिक्षण उपलब्धियाँ",
  "Thurst Area": "प्रमुख कार्य क्षेत्र",
  "Thurst area": "प्रमुख कार्य क्षेत्र",
  "Thurst areas": "प्रमुख कार्य क्षेत्र",
  "Thrust Area": "प्रमुख कार्य क्षेत्र",
  "Academic programs": "शैक्षणिक कार्यक्रम",
  "Infrastructure (laboratories etc.)": "अवसंरचना (प्रयोगशालाएँ आदि)",
  "Infrastructurelaboratories etc.": "अवसंरचना (प्रयोगशालाएँ आदि)",
};

const PAGE_TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI, ...ICCC_EXTRA_TITLES_HI };

/** Sidebar about-us pages aliased to department Hindi files. */
const ABOUT_ALIAS = {
  "about-us-6": "science-resource-management-and-consumer-science",
  "about-us-7": "foods-and-nutrition",
  "about-us-8": "icccs-human-development-and-family-studies",
};

const CURATED_HI = {
  "science-department": "<p>आई.सी. सामुदायिक विज्ञान महाविद्यालय के अंतर्गत विभाग।</p>",
  "science-gallery": "<p>आई.सी. सामुदायिक विज्ञान महाविद्यालय की फोटो गैलरी।</p>",
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
  const fileSlug = ABOUT_ALIAS[slug] ?? slug;
  for (const dir of [ICCC_DIR, ABOUT_DIR]) {
    const hiFile = join(dir, `${fileSlug}-hi.html`);
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
  if (/Departments under I\.C\. College of Community Science/i.test(plain)) {
    return CURATED_HI["science-department"];
  }
  if (/About Resource Management and Consumer Science/i.test(plain)) {
    return readHiFile("science-resource-management-and-consumer-science");
  }
  return null;
}

function resolveContentHi(slug, contentEn, titleEn) {
  const curated = readHiFile(slug);
  if (curated && hasDevanagari(curated)) return { html: curated, source: ABOUT_ALIAS[slug] ? "alias-file" : "file" };

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
    page.slug === "ic-college-of-community-science" &&
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

console.log(`Phase 3 about (ICCC): ${plans.length} page(s) | Updated: ${updated} | Skipped college home: ${skipped} | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) {
  console.log(`  ${p.slug}${p.mixed_before ? " [was MIXED]" : ""} ← ${p.source}`);
  if (p.preview) console.log(`    ${p.preview}...`);
}
