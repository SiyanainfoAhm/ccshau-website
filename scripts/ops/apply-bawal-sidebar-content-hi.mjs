#!/usr/bin/env node
/**
 * Sync ccshau_pages.content_hi → ccshau_page_sidebar_items.content_hi for Bawal dept.
 * The public UI reads sidebar item content, not linked page content.
 *
 * Usage:
 *   node scripts/ops/apply-bawal-sidebar-content-hi.mjs
 *   node scripts/ops/apply-bawal-sidebar-content-hi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-agriculture-bawal";
const DEPT_SLUG = "bawal-agriculture-college";
const ABOUT_DIR = join(ROOT, "Documents/hindi-bawal");

const LABEL_HI_TO_SLUG = {
  "जनादेश": "mandate-6",
  "उद्देश्य": "objectives-15",
  "एन.एस.एस. विंग": "nss-wing",
  "शैक्षणिक कार्यक्रम और प्रवेश नीति": "academic-programmes-3",
  "पाठ्यक्रम डिज़ाइन": "curriculum-design",
  "भविष्य की योजना": "future-planning",
  "पुरस्कार और सम्मान": "awards-and-honors-41",
  "छात्र उपलब्धियाँ": "students-achievements",
  "शिक्षण और अनुसंधान": "teaching-research-achievements-3",
  "अवसंरचना": "infrastructure-31",
  "छात्रावास": "hostel-1",
  "सांस्कृतिक गतिविधियाँ": "cultural-activities",
  "खेल गतिविधियाँ": "sports-activities-1",
  "बी.एससी. (ऑनर्स) कृ. में नामांकित छात्रों का विवरण":
    "details-of-students-enrolled-in-bsc-hons-ag-6-year-programme",
  "संचालित पाठ्यक्रम": "courses-offered-26",
  "राष्ट्रीय सेमिनार": "national-seminar-1",
  "वार्षिक महाविद्यालय रिपोर्ट": "annual-college-report",
  "महाविद्यालय पत्रिका": "college-magazine",
};

const CURATED_HI = {
  "mandate-6":
    '<p style="text-align:justify"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">महाविद्यालय का जनादेश कृषि और संबद्ध क्षेत्रों में विद्वतापूर्ण शिक्षा प्रदान करना है, जिससे छात्र व्यावसायिक रूप से सक्षम और सामाजिक रूप से संवेदनशील बनें; उद्यमिता और अन्य कौशल को बढ़ावा देने हेतु विशेष प्रशिक्षण भी प्रदान किया जाता है।</span></p>',
  "digital-library":
    '<p><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">डिजिटल लाइब्रेरी</span></p>',
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

function normHtml(html) {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function readHiFile(slug) {
  const hiFile = join(ABOUT_DIR, `${slug}-hi.html`);
  if (existsSync(hiFile)) {
    const text = readFileSync(hiFile, "utf8").trim();
    if (hasDevanagari(text)) return text;
  }
  return CURATED_HI[slug] ?? null;
}

function resolveHi(slug, pageBySlug, pageByContent) {
  const fromPage = pageBySlug.get(slug)?.content_hi;
  if (fromPage?.trim() && hasDevanagari(fromPage)) return fromPage.trim();
  return readHiFile(slug);
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("college not found");

const { data: dept } = await supabase.from("ccshau_pages").select("id").eq("slug", DEPT_SLUG).maybeSingle();
if (!dept) throw new Error("dept not found");

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, content_en, content_hi")
  .eq("college_root_id", college.id);

const pageBySlug = new Map((pages ?? []).map((p) => [p.slug, p]));
const pageByContent = new Map();
for (const p of pages ?? []) {
  const key = normHtml(p.content_en);
  if (key) pageByContent.set(key, p);
}

const { data: items } = await supabase
  .from("ccshau_page_sidebar_items")
  .select("id, label_en, label_hi, content_en, content_hi")
  .eq("page_id", dept.id)
  .eq("is_active", true);

let updated = 0;
const plans = [];

for (const item of items ?? []) {
  if (!item.content_en?.trim()) continue;
  const alreadyHi = hasDevanagari(item.content_hi);
  if (alreadyHi && normHtml(item.content_hi).length > normHtml(item.content_en).length * 0.5) continue;

  let hi = null;
  let source = "";

  const contentKey = normHtml(item.content_en);
  const matchedPage = pageByContent.get(contentKey);
  if (matchedPage?.content_hi?.trim() && hasDevanagari(matchedPage.content_hi)) {
    hi = matchedPage.content_hi.trim();
    source = `page:${matchedPage.slug}`;
  }

  if (!hi) {
    const slug = LABEL_HI_TO_SLUG[item.label_hi?.trim()] ?? LABEL_HI_TO_SLUG[item.label_en?.trim()];
    if (slug) {
      hi = resolveHi(slug, pageBySlug, pageByContent);
      if (hi) source = `slug:${slug}`;
    }
  }

  if (!hi && item.label_en?.toLowerCase().includes("digital library")) {
    hi = CURATED_HI["digital-library"];
    source = "curated:digital-library";
  }

  if (!hi || !hasDevanagari(hi)) {
    console.warn(`  SKIP ${item.label_hi ?? item.label_en} — no Hindi`);
    continue;
  }

  if (item.content_hi?.trim() === hi.trim()) continue;

  plans.push({ label: item.label_hi ?? item.label_en, source, preview: hi.replace(/<[^>]+>/g, " ").slice(0, 80) });

  if (APPLY) {
    const { error } = await supabase
      .from("ccshau_page_sidebar_items")
      .update({ content_hi: hi })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
    updated++;
  }
}

console.log(`Bawal sidebar content_hi: ${plans.length} update(s) | Applied: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) {
  console.log(`  ${p.label} ← ${p.source}`);
  console.log(`    ${p.preview}...`);
}
