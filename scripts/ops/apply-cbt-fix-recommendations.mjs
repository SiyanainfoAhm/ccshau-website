#!/usr/bin/env node
/**
 * Fix remaining CBT stub/Hinglish content pages (Phase 3 follow-up).
 *
 * Usage:
 *   node scripts/ops/apply-cbt-fix-recommendations.mjs
 *   node scripts/ops/apply-cbt-fix-recommendations.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-biotechnology";

const FIXES = {
  "alumni-of-the-department-39":
    "<p><strong>विभाग के पूर्व छात्र</strong></p><p>विभाग में डिग्री कार्यक्रम वर्ष 2022–2023 से प्रारंभ किया गया है।</p>",
  "alumni-of-the-department-40":
    "<p><strong>विभाग के पूर्व छात्र</strong></p><p>शून्य।</p>",
  "alumni-of-the-department-50":
    "<p><strong>विभाग के पूर्व छात्र</strong></p><p>विभाग में अभी कोई डिग्री कार्यक्रम प्रारंभ नहीं किया गया है।</p>",
  "awards-and-honors-44":
    "<p><strong>पुरस्कार और सम्मान</strong></p><p>विभाग में अभी कोई संकाय सदस्य या छात्र प्रवेशित नहीं हुए हैं।</p>",
  "awards-and-honors-45":
    "<p><strong>पुरस्कार और सम्मान</strong></p><p>विभाग में अभी कोई संकाय सदस्य या छात्र प्रवेशित नहीं हुए हैं।</p>",
  "awards-and-honors-52":
    "<p><strong>पुरस्कार और सम्मान</strong></p><p>विभाग में अभी कोई संकाय सदस्य या छात्र प्रवेशित नहीं हुए हैं।</p>",
  "retiree-of-the-department-16":
    "<p><strong>विभाग के सेवानिवृत्त</strong></p><p>विभाग से अभी तक कोई सेवानिवृत्त नहीं हुआ है।</p>",
  "retiree-of-the-department-17":
    "<p><strong>विभाग के सेवानिवृत्त</strong></p><p>विभाग से अभी तक कोई सेवानिवृत्त नहीं हुआ है।</p>",
  "retiree-of-the-department-31":
    "<p><strong>विभाग के सेवानिवृत्त</strong></p><p>विभाग से अभी तक कोई सेवानिवृत्त नहीं हुआ है।</p>",
  "teaching-and-research":
    "<p><strong>शिक्षण और अनुसंधान</strong></p><p>विभाग में शिक्षण गतिविधि वर्ष 2022–2023 से प्रारंभ की गई है। अनुसंधान गतिविधि अभी प्रारंभ नहीं हुई है।</p>",
  "teaching-and-research-1":
    "<p><strong>शिक्षण और अनुसंधान</strong></p><p>विभाग में अभी कोई शिक्षण एवं अनुसंधान गतिविधि प्रारंभ नहीं की गई है।</p>",
  "teaching-research-achievements-35":
    "<p><strong>शिक्षण और अनुसंधान उपलब्धियाँ</strong></p><p>विभाग में अभी कोई शिक्षण एवं अनुसंधान गतिविधि प्रारंभ नहीं की गई है।</p>",
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

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("College not found");

const slugs = Object.keys(FIXES);
const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, content_hi")
  .eq("college_root_id", college.id)
  .in("slug", slugs);

let updated = 0;
for (const page of pages ?? []) {
  const html = FIXES[page.slug];
  if (!html || !hasDevanagari(html)) continue;
  if (page.content_hi?.trim() === html.trim()) {
    console.log(`  OK ${page.slug}`);
    continue;
  }
  console.log(`  ${APPLY ? "UPDATE" : "WOULD"} ${page.slug}`);
  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update({ content_hi: html }).eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
    updated++;
  }
}

console.log(`CBT stub fixes: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
if (!APPLY) console.log("Pass --apply to write.");
