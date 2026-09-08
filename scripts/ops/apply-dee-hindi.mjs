#!/usr/bin/env node
/**
 * Phase 1+3 Hindi apply for Directorate of Extension Education.
 *
 * Usage:
 *   node scripts/ops/apply-dee-hindi.mjs
 *   node scripts/ops/apply-dee-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEPT_SLUG_TITLES_HI, hasDevanagari, translateAboutHtmlPhrase } from "./department-hindi-shared.mjs";
import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "directorate-of-extension-education";
const ORG_HI = "विस्तार शिक्षा निदेशालय";
const HI_DIR = join(ROOT, "Documents/hindi-directorate-of-extension-education");

const SLUG_HEADERS = {
  "directorate-of-extension-education": ORG_HI,
  "dee-directorate": "निदेशालय",
  "dee-department": "विस्तार सेवाएँ",
  "dee-gallery": "गैलरी",
  "dee-agricultural-technology-information-centre": "कृषि प्रौद्योगिकी सूचना केंद्र",
  "dee-extension-education-institute-nilokheri": "विस्तार शिक्षा संस्थान, नीलोखेड़ी",
  "dee-farm-information-communication-services": "फार्म सूचना एवं संचार सेवाएँ",
  "dee-publication-unit": "प्रकाशन इकाई",
  "dee-saina-nehwal-institute-of-agricultural-technology-training-education":
    "साइना नेहवाल कृषि प्रौद्योगिकी, प्रशिक्षण एवं शिक्षा संस्थान",
  "dee-krishi-vigyan-kendras": "कृषि विज्ञान केंद्र",
};

const TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI, ...DEPT_SLUG_TITLES_HI };

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
  return hasDevanagari(t) && /[A-Za-z]/.test(t ?? "");
}
function needsExcerpt(en, hi) {
  if (!en?.trim()) return false;
  return !hi?.trim() || !hasDevanagari(hi);
}
function needsTitle(en, hi, target) {
  if (target && hi?.trim() !== target) return true;
  if (!en?.trim() && !target) return false;
  if (!hi?.trim() || !hasDevanagari(hi)) return true;
  if (isMixed(hi)) return true;
  if (hi?.includes(":")) return true;
  return false;
}
function needsContent(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim() || !hasDevanagari(hi)) return true;
  if (isMixed(hi)) return true;
  return false;
}

function readHiFile(pageSlug) {
  const hiFile = join(HI_DIR, `${pageSlug}-hi.html`);
  if (!existsSync(hiFile)) return null;
  const text = readFileSync(hiFile, "utf8").trim();
  return hasDevanagari(text) ? text : null;
}

function translateLegacyPdfHtml(html, titleEn) {
  const m = html.match(
    /Legacy document <code>([^<]+)<\/code> — pending Phase 4 upload \(<code>([^<]+)<\/code>\)\./,
  );
  if (!m) return null;
  const body = html.replace(/<hr\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
  if (body.length > 450) return null;
  const titleMatch = html.match(/<strong>([^<]+)<\/strong>/);
  const titleHi = TITLE_HI[titleEn?.trim()] ?? TITLE_HI[titleMatch?.[1]?.trim()] ?? null;
  const titleBlock = titleHi
    ? `<p><strong>${titleHi}</strong></p>`
    : titleMatch
      ? `<p><strong>${titleMatch[1]}</strong></p>`
      : "";
  return `${titleBlock}<p>दस्तावेज़ <code>${m[1]}</code> शीघ्र उपलब्ध कराया जाएगा (<code>${m[2]}</code>)।</p>`;
}

function resolveTitleHi(page) {
  if (SLUG_HEADERS[page.slug]) return SLUG_HEADERS[page.slug];
  if (DEPT_SLUG_TITLES_HI[page.slug]) return DEPT_SLUG_TITLES_HI[page.slug];
  return TITLE_HI[page.title_en?.trim()] ?? null;
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error(`Not found: ${COLLEGE_SLUG}`);

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi")
  .eq("college_root_id", college.id)
  .eq("status", "published")
  .order("slug");

let headerFields = 0;
let contentUpdated = 0;
const sources = {};
const unmapped = [];

for (const page of pages ?? []) {
  const titleHi = resolveTitleHi(page);
  const patch = {};
  if (needsTitle(page.title_en, page.title_hi, titleHi) && titleHi) patch.title_hi = titleHi;
  else if (needsTitle(page.title_en, page.title_hi, null) && !titleHi) unmapped.push(`${page.slug}: ${page.title_en}`);

  const excerptTitle = patch.title_hi ?? page.title_hi ?? titleHi;
  if (needsExcerpt(page.excerpt_en, page.excerpt_hi) && excerptTitle) {
    patch.excerpt_hi = `${excerptTitle} — ${ORG_HI}।`;
  }

  if (Object.keys(patch).length) {
    headerFields += Object.keys(patch).length;
    if (APPLY) {
      const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", page.id);
      if (error) throw new Error(`${page.slug} headers: ${error.message}`);
    }
  }

  if (!needsContent(page.content_en, page.content_hi)) continue;
  let html = readHiFile(page.slug);
  let source = html ? "file" : null;
  if (!html) {
    html = translateLegacyPdfHtml(page.content_en, page.title_en);
    source = html ? "pdf-placeholder" : null;
  }
  if (!html) {
    const phrase = translateAboutHtmlPhrase(page.content_en);
    if (phrase && hasDevanagari(phrase)) {
      html = phrase;
      source = "phrase";
    }
  }
  sources[source ?? "failed"] = (sources[source ?? "failed"] ?? 0) + 1;
  if (!html) {
    console.warn(`  SKIP content ${page.slug}`);
    continue;
  }
  if (page.content_hi?.trim() === html.trim()) continue;
  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update({ content_hi: html }).eq("id", page.id);
    if (error) throw new Error(`${page.slug} content: ${error.message}`);
    contentUpdated++;
  } else {
    console.log(`  WOULD content ${page.slug} ← ${source}`);
  }
}

console.log(
  `DEE: headers=${headerFields} content=${contentUpdated} sources=${JSON.stringify(sources)} unmapped=${unmapped.length} | ${APPLY ? "APPLY" : "dry-run"}`,
);
if (unmapped.length) console.log("  Unmapped:", unmapped.join("; "));
if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
