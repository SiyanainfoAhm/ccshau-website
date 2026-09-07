#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PAGE_ID = "b5b330ec-2846-4600-a9a3-7fbf03710090";
const APPLY = process.argv.includes("--apply");

const { data: page } = await sb
  .from("ccshau_pages")
  .select("id,slug,layout_template,layout_config,content_en,content_hi")
  .eq("id", PAGE_ID)
  .single();

const { count } = await sb
  .from("ccshau_page_gallery_items")
  .select("id", { count: "exact", head: true })
  .eq("page_id", PAGE_ID)
  .eq("is_active", true);

console.log({
  slug: page.slug,
  layout_template: page.layout_template,
  layout_config: page.layout_config,
  content_en_len: page.content_en?.length || 0,
  gallery_items: count,
});

const nextConfig = {
  ...(page.layout_config && typeof page.layout_config === "object" ? page.layout_config : {}),
  gallery: true,
  // Keep awards as a simple gallery page — no hero/staff blocks
  hero: false,
  heroContactButton: false,
  headOfficer: false,
  contacts: false,
  staff: false,
  mainContent: true,
};

console.log("next layout_template: standard (was", page.layout_template + ")");
console.log("next layout_config:", nextConfig);
console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

if (!APPLY) {
  console.log("Pass --apply to enable Photo gallery on awards.");
  process.exit(0);
}

const { error } = await sb
  .from("ccshau_pages")
  .update({
    layout_template: "standard",
    layout_config: nextConfig,
    updated_at: new Date().toISOString(),
  })
  .eq("id", PAGE_ID);
if (error) throw error;
console.log("OK awards: layout_template=standard, gallery=true");
