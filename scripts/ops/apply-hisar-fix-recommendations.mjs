#!/usr/bin/env node
/**
 * Fix remaining Hisar Phase 3 content gaps (6 pages that failed auto-translate).
 *
 * Usage:
 *   node scripts/ops/apply-hisar-fix-recommendations.mjs
 *   node scripts/ops/apply-hisar-fix-recommendations.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-agriculture-hisar";
const HISAR_DIR = join(ROOT, "Documents/hindi-hisar");

const GAP_SLUGS = [
  "crops",
  "faculty-who-served-the-department",
  "infrastructurelaboratories-etc-24",
  "list-of-trainings-conducted-by-the-department-under-c-a-f-tupdate-the-list-which",
  "major-contributions-5",
  "specialization-area-for-awarding-m-sc-and-ph-d-degrees-by-the-department",
];

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

function stripHtml(html) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();
}

function legacyPdfPlaceholder(html, titleHi) {
  const m = (html ?? "").match(
    /Legacy document <code>([^<]+)<\/code> — pending Phase 4 upload \(<code>([^<]+)<\/code>\)\./,
  );
  if (!m) return null;
  return `<p><strong>${titleHi}</strong></p><p>दस्तावेज़ <code>${m[1]}</code> शीघ्र उपलब्ध कराया जाएगा (<code>${m[2]}</code>)।</p>`;
}

function resolveGapHi(slug, titleEn, contentEn) {
  // Prefer curated files written under Documents/hindi-hisar/
  const filePath = join(HISAR_DIR, `${slug}-hi.html`);
  if (existsSync(filePath)) {
    const text = readFileSync(filePath, "utf8").trim();
    if (hasDevanagari(text)) return { html: text, source: "file" };
  }

  const plain = stripHtml(contentEn);

  const pdfTitles = {
    crops: "फसलें",
    "infrastructurelaboratories-etc-24": "अवसंरचना (प्रयोगशालाएँ आदि)",
    "list-of-trainings-conducted-by-the-department-under-c-a-f-tupdate-the-list-which":
      "सी.ए.एफ.टी. के अंतर्गत विभाग द्वारा आयोजित प्रशिक्षणों की सूची",
    "major-contributions-5": "प्रमुख योगदान",
  };
  if (pdfTitles[slug]) {
    const pdf = legacyPdfPlaceholder(contentEn, pdfTitles[slug]);
    if (pdf) return { html: pdf, source: "pdf-placeholder" };
  }

  return { html: null, source: "failed", plain: plain.slice(0, 400) };
}

const TITLE_FIXES = {
  "faculty-who-served-the-department": "विभाग में सेवारत रहे संकाय",
  "specialization-area-for-awarding-m-sc-and-ph-d-degrees-by-the-department":
    "विभाग द्वारा एम.एससी. और पीएच.डी. उपाधि हेतु विशेषज्ञता क्षेत्र",
};

mkdirSync(HISAR_DIR, { recursive: true });

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("College not found");

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, title_hi, content_en, content_hi")
  .eq("college_root_id", college.id)
  .in("slug", GAP_SLUGS);

let updated = 0;
for (const page of pages ?? []) {
  const { html, source, plain } = resolveGapHi(page.slug, page.title_en, page.content_en);
  console.log(`\n=== ${page.slug} ===`);
  console.log(`title_en: ${page.title_en}`);
  console.log(`en_len: ${(page.content_en ?? "").length} | plain: ${stripHtml(page.content_en).slice(0, 180)}`);
  console.log(`source: ${source}`);

  if (!html || !hasDevanagari(html)) {
    console.warn(`  SKIP — could not resolve Hindi`);
    if (plain) console.warn(`  plain: ${plain}`);
    continue;
  }

  const outFile = join(HISAR_DIR, `${page.slug}-hi.html`);
  writeFileSync(outFile, html + "\n", "utf8");
  console.log(`  wrote ${outFile}`);
  console.log(`  hi: ${stripHtml(html).slice(0, 120)}`);

  const patch = { content_hi: html };
  const titleHi = TITLE_FIXES[page.slug];
  if (titleHi && page.title_hi !== titleHi) {
    patch.title_hi = titleHi;
    console.log(`  title_hi → ${titleHi}`);
  }

  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
    if (patch.title_hi) {
      await supabase.from("ccshau_menu_items").update({ label_hi: patch.title_hi }).eq("page_id", page.id);
    }
    updated++;
  }
}

// Re-sync sidebar for any matching items
if (APPLY) {
  const { spawnSync } = await import("node:child_process");
  spawnSync(
    process.execPath,
    ["scripts/ops/apply-college-sidebar-content-hi.mjs", `--college=${COLLEGE_SLUG}`, "--apply"],
    { cwd: ROOT, stdio: "inherit" },
  );
}

console.log(`\nHisar gap fix: ${pages?.length ?? 0} page(s) | Updated: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
if (!APPLY) console.log("Dry-run only. Pass --apply to write.");
