#!/usr/bin/env node
/**
 * Phase 3 — Apply Hindi about/content for College of Agriculture, Bawal.
 *
 * Usage:
 *   node scripts/ops/apply-bawal-phase3-about.mjs
 *   node scripts/ops/apply-bawal-phase3-about.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari, needsHi, translateAboutHtmlPhrase } from "./department-hindi-shared.mjs";
import { translateHtmlEnToHi, sleep } from "./translate-en-hi.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-agriculture-bawal";
const ABOUT_DIR = join(ROOT, "Documents/hindi-bawal");

const PAGE_TITLE_HI = {
  "annual-college-report": "वार्षिक महाविद्यालय रिपोर्ट",
  "awards-and-honors-41": "पुरस्कार और सम्मान",
  "college-magazine": "महाविद्यालय पत्रिका",
  "courses-offered-26": "संचालित पाठ्यक्रम",
  "courses-taught-1": "संपादित पाठ्यक्रम",
  "cultural-activities": "सांस्कृतिक गतिविधियाँ",
  "details-of-students-enrolled-in-bsc-hons-ag-6-year-programme":
    "बी.एससी. (ऑनर्स) कृ. 6 वर्षीय कार्यक्रम में नामांकित छात्रों का विवरण",
  "hostel-1": "छात्रावास",
  "infrastructure-31": "अवसंरचना",
  "national-seminar-1": "राष्ट्रीय सेमिनार",
  "sports-activities-1": "खेल गतिविधियाँ",
  "students-achievements": "छात्र उपलब्धियाँ",
  "teaching-research-achievements-3": "शिक्षण और अनुसंधान उपलब्धियाँ",
};

const CURATED_HI = {
  gallery:
    "<p>क्षेत्र दिवस, किसान मेले और परिसर अवसंरचना की फोटो गैलरी।</p>",
  "mandate-6":
    '<p style="text-align:justify"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">महाविद्यालय का जनादेश कृषि और संबद्ध क्षेत्रों में विद्वतापूर्ण शिक्षा प्रदान करना है, जिससे छात्र व्यावसायिक रूप से सक्षम और सामाजिक रूप से संवेदनशील बनें; उद्यमिता और अन्य कौशल को बढ़ावा देने हेतु विशेष प्रशिक्षण भी प्रदान किया जाता है।</span></p>',
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
  const hiFile = join(ABOUT_DIR, `${slug}-hi.html`);
  if (existsSync(hiFile)) {
    const text = readFileSync(hiFile, "utf8").trim();
    if (hasDevanagari(text)) return text;
  }
  if (slug === "facilities-infrastructure") {
    const alt = join(ABOUT_DIR, "bawal-agriculture-college-hi.html");
    if (existsSync(alt)) return readFileSync(alt, "utf8").trim();
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

const ALLOWED_LATIN = /^(B\.?Sc|M\.?Sc|Ph\.?D|UG|PG|NCR|NH|NSS|NCC|PDF|RAWE|ADSW|DSW|D2H|HAU|UGC|CSIR|NET|ARS|GATE|SRF|AGT|IFFCO|CICR|Acad|No|Obj|ectives|www|http|https|com|in|org)$/i;

function isAcceptableHi(html) {
  if (!html?.trim() || !hasDevanagari(html)) return false;
  const plain = html.replace(/<[^>]+>/g, " ");
  const latinWords = (plain.match(/\b[A-Za-z]{3,}\b/g) ?? []).filter((w) => !ALLOWED_LATIN.test(w.replace(/\./g, "")));
  return latinWords.length <= 4;
}

async function resolveContentHi(slug, contentEn) {
  const curated = readHiFile(slug);
  if (curated && hasDevanagari(curated)) return { html: curated, source: "file" };

  const pdfHi = translateLegacyPdfHtml(contentEn, slug);
  if (pdfHi && hasDevanagari(pdfHi)) return { html: pdfHi, source: "pdf-placeholder" };

  const phrase = translateAboutHtmlPhrase(contentEn);
  if (phrase && hasDevanagari(phrase) && isAcceptableHi(phrase)) return { html: phrase, source: "phrase" };

  if (!APPLY) return { html: null, source: "needs-machine" };

  const machine = await translateHtmlEnToHi(contentEn);
  if (machine && hasDevanagari(machine)) return { html: machine, source: "machine" };

  return { html: null, source: "failed" };
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

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

  const { html, source } = await resolveContentHi(page.slug, page.content_en);
  const mixedBefore = isMixed(page.content_hi);
  const plan = {
    slug: page.slug,
    title_en: page.title_en,
    source,
    mixed_before: mixedBefore,
    preview: html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 90),
  };
  plans.push(plan);

  if (!html) {
    console.warn(`  SKIP ${page.slug} — no Hindi resolved`);
    continue;
  }
  if (page.content_hi?.trim() === html.trim()) continue;

  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update({ content_hi: html }).eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
    updated++;
    if (source === "machine") await sleep(400);
  }
}

console.log(`Phase 3 about (Bawal): ${plans.length} page(s) | Updated: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) {
  console.log(`  ${p.slug}${p.mixed_before ? " [was MIXED]" : ""} ← ${p.source}`);
  if (p.preview) console.log(`    ${p.preview}...`);
}
