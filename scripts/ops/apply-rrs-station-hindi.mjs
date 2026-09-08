#!/usr/bin/env node
/**
 * Phase 1+3 Hindi apply for research stations / farms.
 *
 * Usage:
 *   node scripts/ops/apply-rrs-station-hindi.mjs --college=cotton-research-station-sirsa
 *   node scripts/ops/apply-rrs-station-hindi.mjs --college=cotton-research-station-sirsa --apply
 *   node scripts/ops/apply-rrs-station-hindi.mjs --batch=farms
 *   node scripts/ops/apply-rrs-station-hindi.mjs --all --apply
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
const ALL = process.argv.includes("--all");
const BATCH = process.argv.find((a) => a.startsWith("--batch="))?.split("=")[1];

const STATIONS = {
  "cotton-research-station-sirsa": {
    orgHi: "कपास अनुसंधान स्टेशन, सिरसा",
    headers: {
      "cotton-research-station-sirsa": "कपास अनुसंधान स्टेशन, सिरसा",
      "home-20": "होम",
      "cs-department-48": "विभाग",
      "cs-gallery": "गैलरी",
    },
  },
  "regional-research-station-bawal": {
    orgHi: "क्षेत्रीय अनुसंधान स्टेशन, बावल",
    headers: {
      "regional-research-station-bawal": "क्षेत्रीय अनुसंधान स्टेशन, बावल",
      "home-21": "होम",
      "bawal-department-49": "विभाग",
      "bawal-gallery": "गैलरी",
      "regional-research-station-ba-gallery": "गैलरी",
    },
  },
  "regional-research-station-rohtak": {
    orgHi: "क्षेत्रीय अनुसंधान स्टेशन, रोहतक",
    headers: {
      "regional-research-station-rohtak": "क्षेत्रीय अनुसंधान स्टेशन, रोहतक",
      "home-22": "होम",
      "rohtak-department-50": "विभाग",
      "rohtak-gallery": "गैलरी",
      "regional-research-station-ro-gallery": "गैलरी",
    },
  },
  "rice-research-station-kaul": {
    orgHi: "चावल अनुसंधान स्टेशन, कौल",
    headers: {
      "rice-research-station-kaul": "चावल अनुसंधान स्टेशन, कौल",
      "home-23": "होम",
      "rk-department": "विभाग",
      "rice-research-station-kaul-gallery": "गैलरी",
      "mandate-and-thurst-areas-5": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "mandate-and-thurst-areast": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "major-rice-varieties": "चावल की प्रमुख किस्में",
    },
  },
  "regional-research-station-bura": {
    orgHi: "न्यूट्री-सीरियल्स अनुसंधान स्टेशन, गोकल्पुरा",
    headers: {
      "regional-research-station-bura": "न्यूट्री-सीरियल्स अनुसंधान स्टेशन, गोकल्पुरा",
      "home-40": "होम",
      "bura-department": "विभाग",
    },
  },
  "research-farm-balsamand": {
    orgHi: "अनुसंधान फार्म, बालसमंद",
    headers: {
      "research-farm-balsamand": "अनुसंधान फार्म, बालसमंद",
      "home-41": "होम",
      "fb-department": "विभाग",
      "non-teaching-staff": "गैर-शैक्षणिक कर्मचारी",
    },
  },
  "horticulture-research-farm-buria": {
    orgHi: "उद्यान विज्ञान अनुसंधान फार्म, बुरिया",
    headers: {
      "horticulture-research-farm-buria": "उद्यान विज्ञान अनुसंधान फार्म, बुरिया",
      "home-42": "होम",
      "hfb-department": "विभाग",
    },
  },
  "krishi-vigyan-kendra-bawal": {
    orgHi: "कृषि विज्ञान केंद्र, बावल",
    headers: {
      "krishi-vigyan-kendra-bawal": "कृषि विज्ञान केंद्र, बावल",
      "home-7": "होम",
      "bawal-department": "विभाग",
      "bawal-gallery": "गैलरी",
      "mandate-and-thurs-areas-2": "जनादेश एवं प्रमुख कार्य क्षेत्र",
    },
  },
  "krishi-vigyan-kendra-bhiwani": {
    orgHi: "कृषि विज्ञान केंद्र, भिवानी",
    headers: {
      "krishi-vigyan-kendra-bhiwani": "कृषि विज्ञान केंद्र, भिवानी",
      "home-1": "होम",
      "bhiwani-department": "विभाग",
      "mandate-and-thurs-areas-4": "जनादेश एवं प्रमुख कार्य क्षेत्र",
    },
  },
  "krishi-vigyan-kendra-sadalpur-hisar": {
    orgHi: "कृषि विज्ञान केंद्र, सादलपुर (हिसार)",
    headers: {
      "krishi-vigyan-kendra-sadalpur-hisar": "कृषि विज्ञान केंद्र, सादलपुर (हिसार)",
      "k-v-k-sadalpur": "होम",
      "sh-department": "विभाग",
      "kvk-sadalpur-hisar-gallery": "गैलरी",
      "mandate-and-thurst-areas": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "registration-from-for-training": "प्रशिक्षण हेतु पंजीकरण प्रपत्र",
      "application-from-for-scst-training": "अनुसूचित जाति/जनजाति प्रशिक्षण आवेदन प्रपत्र",
    },
  },
  "krishi-vigyan-kendra-yamunanagar": {
    orgHi: "कृषि विज्ञान केंद्र, यमुनानगर",
    headers: {
      "krishi-vigyan-kendra-yamunanagar": "कृषि विज्ञान केंद्र, यमुनानगर",
      "home-4": "होम",
      "yamunanagar-department": "विभाग",
      "kvk-yamunanagar-gallery": "गैलरी",
      "mandate-and-thurs-areas-3": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "information-under-rti-act-2005-rule-4-i-1": "आरटीआई अधिनियम 2005 नियम 4 के अंतर्गत सूचना",
    },
  },
  "krishi-vigyan-kendra-faridabad": {
    orgHi: "कृषि विज्ञान केंद्र, फरीदाबाद",
    headers: {
      "krishi-vigyan-kendra-faridabad": "कृषि विज्ञान केंद्र, फरीदाबाद",
      "home-3": "होम",
      "faridabad-department": "विभाग",
      "kvk-faridabad-gallery": "गैलरी",
      "mandate-and-thrust-areas": "जनादेश एवं प्रमुख कार्य क्षेत्र",
    },
  },
  "krishi-vigyan-kendra-fatehabad": {
    orgHi: "कृषि विज्ञान केंद्र, फतेहाबाद",
    headers: {
      "krishi-vigyan-kendra-fatehabad": "कृषि विज्ञान केंद्र, फतेहाबाद",
      "home-32": "होम",
      "fatehabad-department": "विभाग",
      "kvk-fatehabad-gallery": "गैलरी",
      "mandate-and-thurs-areas-6": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "information-under-rti-act-2005-rule-4-i": "आरटीआई अधिनियम 2005 नियम 4 के अंतर्गत सूचना",
    },
  },
  "krishi-vigyan-kendra-jhajjar": {
    orgHi: "कृषि विज्ञान केंद्र, झज्जर",
    headers: {
      "krishi-vigyan-kendra-jhajjar": "कृषि विज्ञान केंद्र, झज्जर",
      "home-6": "होम",
      "jhajjar-department": "विभाग",
      "kvk-jhajjar-gallery": "गैलरी",
      "mandate-and-thurst-area-1": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "mandate-thurst-area": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "thurst-areas-2": "प्रमुख कार्य क्षेत्र",
    },
  },
  "krishi-vigyan-kendra-jind": {
    orgHi: "कृषि विज्ञान केंद्र, जींद",
    headers: {
      "krishi-vigyan-kendra-jind": "कृषि विज्ञान केंद्र, जींद",
      "home-8": "होम",
      "jind-department": "विभाग",
      "kvk-jind-gallery": "गैलरी",
      "mandate-and-thurst-areas-2": "जनादेश एवं प्रमुख कार्य क्षेत्र",
    },
  },
  "krishi-vigyan-kendra-kaithal": {
    orgHi: "कृषि विज्ञान केंद्र, कैथल",
    headers: {
      "krishi-vigyan-kendra-kaithal": "कृषि विज्ञान केंद्र, कैथल",
      "home-9": "होम",
      "kaithal-department": "विभाग",
      "kvk-kaithal-gallery": "गैलरी",
      "mandate-and-thurst-areas-7": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "mandate-10": "जनादेश",
      "thurst-areas-4": "प्रमुख कार्य क्षेत्र",
      "production-income-2": "रिवॉल्विंग फंड की स्थिति",
    },
  },
  "krishi-vigyan-kendra-kurukshetra": {
    orgHi: "कृषि विज्ञान केंद्र, कुरुक्षेत्र",
    headers: {
      "krishi-vigyan-kendra-kurukshetra": "कृषि विज्ञान केंद्र, कुरुक्षेत्र",
      "home-10": "होम",
      "kurukshetra-department": "विभाग",
      "kvk-kurukshetra-gallery": "गैलरी",
      "mandate-and-thurs-areas-1": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "spio": "एस.पी.आई.ओ.",
    },
  },
  "krishi-vigyan-kendra-mahendergarh": {
    orgHi: "कृषि विज्ञान केंद्र, महेंद्रगढ़",
    headers: {
      "krishi-vigyan-kendra-mahendergarh": "कृषि विज्ञान केंद्र, महेंद्रगढ़",
      "home-11": "होम",
      "mahendergarh-department": "विभाग",
      "kvk-mahendergarh-gallery": "गैलरी",
      "mandate-and-thurst-areas-1": "जनादेश एवं प्रमुख कार्य क्षेत्र",
    },
  },
  "krishi-vigyan-kendra-panipat": {
    orgHi: "कृषि विज्ञान केंद्र, पानीपत",
    headers: {
      "krishi-vigyan-kendra-panipat": "कृषि विज्ञान केंद्र, पानीपत",
      "k-v-k-panipat": "होम",
      "panipat-department": "विभाग",
      "kvk-panipat-gallery": "गैलरी",
      "mandate-and-thurst-areas-9": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "mandate-and-thurst-areas-10": "जनादेश एवं प्रमुख कार्य क्षेत्र",
      "production-of-income": "उत्पादन एवं आय",
    },
  },
};

const BATCHES = {
  farms: [
    "rice-research-station-kaul",
    "regional-research-station-bura",
    "research-farm-balsamand",
    "horticulture-research-farm-buria",
  ],
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
  if (!hi?.trim() || !hasDevanagari(hi)) return true;
  if (isMixed(hi)) return true;
  return false;
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

function readHiFile(collegeSlug, pageSlug) {
  const hiFile = join(ROOT, "Documents", `hindi-${collegeSlug}`, `${pageSlug}-hi.html`);
  if (!existsSync(hiFile)) return null;
  const text = rewriteHauStorageToAzure(readFileSync(hiFile, "utf8").trim());
  return hasDevanagari(text) ? text : null;
}

/** hau.ac.in/storage uploads → Azure legacy-storage */
function rewriteHauStorageToAzure(html) {
  if (!html) return html;
  return html.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^"'?\s>#]+)/gi,
    "https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/$1",
  );
}

function extractPdfUrlFromHtml(html) {
  if (!html?.trim()) return null;
  const patterns = [
    /<(?:iframe|embed|object)\b[^>]*\b(?:src|data)=["']([^"']+\.pdf[^"']*)["']/i,
    /\b(?:src|data|href)=["']([^"']+\.pdf[^"']*)["']/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

/** Prefer the same PDF URL as English so Hindi UI still opens the viewer. */
function translateLegacyPdfHtml(html, titleEn) {
  const pdfUrl = extractPdfUrlFromHtml(html);
  if (pdfUrl) {
    const titleMatch = html.match(/<strong>([^<]+)<\/strong>/);
    const titleHi =
      TITLE_HI[titleEn?.trim()] ?? TITLE_HI[titleMatch?.[1]?.trim()] ?? titleEn?.trim() ?? "दस्तावेज़";
    return `<p><a href="${pdfUrl}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${titleHi}</strong></span></a></p>`;
  }

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

function resolveTitleHi(cfg, page) {
  if (cfg.headers[page.slug]) return cfg.headers[page.slug];
  if (DEPT_SLUG_TITLES_HI[page.slug]) return DEPT_SLUG_TITLES_HI[page.slug];
  return TITLE_HI[page.title_en?.trim()] ?? null;
}

async function applyStation(collegeSlug) {
  const cfg = STATIONS[collegeSlug];
  if (!cfg) throw new Error(`Unknown station: ${collegeSlug}`);
  const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", collegeSlug).maybeSingle();
  if (!college) throw new Error(`Not found: ${collegeSlug}`);

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
    const titleHi = resolveTitleHi(cfg, page);
    const patch = {};
    if (needsTitle(page.title_en, page.title_hi, titleHi) && titleHi) patch.title_hi = titleHi;
    else if (needsTitle(page.title_en, page.title_hi, null) && !titleHi) unmapped.push(`${page.slug}: ${page.title_en}`);

    const excerptTitle = patch.title_hi ?? page.title_hi ?? titleHi;
    if (needsExcerpt(page.excerpt_en, page.excerpt_hi) && excerptTitle) {
      patch.excerpt_hi = `${excerptTitle} — ${cfg.orgHi}।`;
    }

    if (Object.keys(patch).length) {
      headerFields += Object.keys(patch).length;
      if (APPLY) {
        const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", page.id);
        if (error) throw new Error(`${page.slug} headers: ${error.message}`);
      }
    }

    if (!needsContent(page.content_en, page.content_hi)) continue;
    let html = readHiFile(collegeSlug, page.slug);
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
  html = rewriteHauStorageToAzure(html);
  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update({ content_hi: html }).eq("id", page.id);
      if (error) throw new Error(`${page.slug} content: ${error.message}`);
      contentUpdated++;
    } else {
      console.log(`  WOULD content ${page.slug} ← ${source}`);
    }
  }

  console.log(
    `${collegeSlug}: headers=${headerFields} content=${contentUpdated} sources=${JSON.stringify(sources)} unmapped=${unmapped.length} | ${APPLY ? "APPLY" : "dry-run"}`,
  );
  if (unmapped.length) console.log("  Unmapped:", unmapped.join("; "));
}

const collegeArg = process.argv.find((a) => a.startsWith("--college="))?.split("=")[1];
const targets = ALL
  ? Object.keys(STATIONS)
  : BATCH
    ? BATCHES[BATCH]
    : collegeArg
      ? [collegeArg]
      : null;
if (!targets) {
  console.error("Pass --college=<slug>, --batch=farms, or --all");
  process.exit(1);
}
if (BATCH && !BATCHES[BATCH]) {
  console.error(`Unknown batch: ${BATCH}. Known: ${Object.keys(BATCHES).join(", ")}`);
  process.exit(1);
}

for (const slug of targets) await applyStation(slug);
if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
