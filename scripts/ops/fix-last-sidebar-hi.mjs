#!/usr/bin/env node
/** Fix last sidebar items with null or bad Hindi. */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lookupSidebarLabelHi } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

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

const { data: items } = await supabase
  .from("ccshau_page_sidebar_items")
  .select("id, label_en, label_hi, is_active")
  .eq("is_active", true);

let fixed = 0;
for (const item of items ?? []) {
  const en = item.label_en?.trim();
  if (!en) continue;
  const hi = item.label_hi?.trim() ?? "";
  const hasHi = /[\u0900-\u097F]/.test(hi);
  const badThrust = /^(थ्रस्ट|Thurst)\s*क्षेत्र$/i.test(hi);
  if (hasHi && !badThrust) continue;
  const target = lookupSidebarLabelHi(en);
  if (!target) continue;
  console.log(`${en}: ${hi || "(null)"} → ${target}`);
  if (APPLY) {
    await supabase.from("ccshau_page_sidebar_items").update({ label_hi: target }).eq("id", item.id);
    fixed++;
  }
}
console.log(`Fixed: ${fixed}`);
