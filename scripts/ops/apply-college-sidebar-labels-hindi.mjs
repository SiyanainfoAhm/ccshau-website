#!/usr/bin/env node
/**
 * Apply curated Hindi labels for college department sidebar menus.
 *
 * Usage:
 *   node scripts/ops/apply-college-sidebar-labels-hindi.mjs --college=college-of-agriculture-hisar
 *   node scripts/ops/apply-college-sidebar-labels-hindi.mjs --college=college-of-agriculture-hisar --apply
 *   node scripts/ops/apply-college-sidebar-labels-hindi.mjs --department=hisar-agricultural-meteorology --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const collegeSlug =
  process.argv.find((a) => a.startsWith("--college="))?.split("=")[1] ??
  "college-of-agriculture-hisar";
const deptSlug = process.argv.find((a) => a.startsWith("--department="))?.split("=")[1];

import { SIDEBAR_LABELS_HI } from "./department-hindi-shared.mjs";

/** Wrong auto-transliterations to overwrite when label_en matches. */
const BAD_HI_PATTERNS = [
  /^(थ्रस्ट|झस्ट|Thurst)\s*क्षेत्र$/i,
  /^Thrust Area$/i,
  /^Thurst Area$/i,
  /^थ्रस्ट क्षेत्र$/i,
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function isMixedHi(hi) {
  return /[\u0900-\u097F]/.test(hi ?? "") && /[A-Za-z]/.test(hi ?? "");
}

function needsUpdate(labelEn, labelHi, targetHi) {
  if (!targetHi) return false;
  const en = labelEn?.trim();
  const hi = labelHi?.trim() ?? "";
  if (hi === targetHi) return false;
  if (!hi) return true;
  if (BAD_HI_PATTERNS.some((re) => re.test(hi))) return true;
  if (!/[\u0900-\u097F]/.test(hi)) return true;
  if (isMixedHi(hi)) return true;
  // Overwrite if Hindi looks like English copy for known labels
  if (hi === en) return true;
  return false;
}

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, title_en")
    .eq("slug", collegeSlug)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${collegeSlug}`);

  let pageIds;
  if (deptSlug) {
    const { data: dept } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en")
      .eq("college_root_id", college.id)
      .eq("slug", deptSlug)
      .maybeSingle();
    if (!dept) throw new Error(`Department not found: ${deptSlug}`);
    pageIds = [dept.id];
    console.log(`Department: ${dept.title_en} (${deptSlug})`);
  } else {
    const { data: pages } = await supabase
      .from("ccshau_pages")
      .select("id")
      .eq("college_root_id", college.id)
      .eq("status", "published");
    pageIds = (pages ?? []).map((p) => p.id);
    console.log(`College: ${college.title_en} — ${pageIds.length} pages`);
  }

  const { data: items, error } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, page_id, label_en, label_hi")
    .in("page_id", pageIds)
    .eq("is_active", true);
  if (error) throw error;

  const plans = [];
  for (const item of items ?? []) {
    const en = item.label_en?.trim();
    if (!en) continue;
    const targetHi = SIDEBAR_LABELS_HI[en];
    if (!targetHi) continue;
    if (!needsUpdate(en, item.label_hi, targetHi)) continue;
    plans.push({ id: item.id, labelEn: en, from: item.label_hi, to: targetHi });
  }

  console.log(`Sidebar labels to update: ${plans.length}`);
  for (const p of plans) {
    console.log(`  - ${p.labelEn}: ${p.from ?? "(null)"} → ${p.to}`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  for (const p of plans) {
    const { error: updErr } = await supabase
      .from("ccshau_page_sidebar_items")
      .update({ label_hi: p.to })
      .eq("id", p.id);
    if (updErr) throw updErr;
  }

  console.log(`\nUpdated ${plans.length} sidebar label(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
