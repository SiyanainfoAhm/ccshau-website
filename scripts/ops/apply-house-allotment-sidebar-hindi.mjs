#!/usr/bin/env node
/**
 * Hindi sidebar labels for House Allotment (ecs-house-allotment).
 *
 *   node scripts/ops/apply-house-allotment-sidebar-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "47e309dd-e6d4-4857-a1fc-1ff45c665fb6";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  "FInal seniorty lists of HAU & LUVAS Employees 2026":
    "एच.ए.यू. एवं एल.यू.वी.ए.एस. कर्मचारियों की अंतिम वरिष्ठता सूची 2026",
  "Amendment in House Allotment Rules": "आवास आवंटन नियमों में संशोधन",
  "Landscape Unit Pay Bill for Month of 12/2015 paid in 01/2016":
    "लैंडस्केप इकाई वेतन बिल 12/2015 (01/2016 में भुगतान)",
  "Application Form for the Allotment of House in CCSHAU, Hisar":
    "सी.सी.एस. एच.ए.यू., हिसार में आवास आवंटन हेतु आवेदन पत्र",
};

function captionHi(contentEn, labelHi) {
  if (!contentEn || contentEn.length > 500) return null;
  let hi = contentEn;
  if (/<strong>/i.test(hi)) {
    hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
  } else if (/<a[^>]*>/i.test(hi)) {
    if (/<strong>/i.test(hi)) {
      hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
    } else if (/<span[^>]*>/i.test(hi)) {
      hi = hi.replace(/(<span[^>]*>)([^<]+)(<\/span>)/i, `$1${labelHi}$3`);
    } else {
      hi = hi.replace(/(<a[^>]*>)([^<]+)(<\/a>)/i, `$1${labelHi}$3`);
    }
  }
  return hi !== contentEn ? hi : null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en")
    .eq("page_id", PAGE_ID);

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  for (const row of sides ?? []) {
    const label_hi = LABEL_HI[row.label_en];
    if (!label_hi) {
      console.log("skip", row.label_en);
      continue;
    }
    console.log(`${row.label_en} → ${label_hi}`);
    if (!APPLY) continue;
    const patch = { label_hi, updated_at: now };
    const cap = captionHi(row.content_en, label_hi);
    if (cap) patch.content_hi = cap;
    const { error } = await sb.from("ccshau_page_sidebar_items").update(patch).eq("id", row.id);
    if (error) throw error;
  }
  if (!APPLY) console.log("\nPass --apply to write.");
  else console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
