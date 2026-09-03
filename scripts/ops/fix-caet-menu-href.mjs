#!/usr/bin/env node
/**
 * Set explicit href on CAET Academics→Colleges menu item (belt-and-suspenders).
 * Root cause fix is paginated page fetch in public.ts; this ensures DB href is correct too.
 *
 * Usage:
 *   node scripts/ops/fix-caet-menu-href.mjs
 *   node scripts/ops/fix-caet-menu-href.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const HREF = "/college/college-of-agricultural-engineering-and-technology";
const MENU_ID = "cbcf324c-8887-4d47-b287-1a6a229de1ab";

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

const { data: item } = await supabase
  .from("ccshau_menu_items")
  .select("id, label_en, href, page_id")
  .eq("id", MENU_ID)
  .maybeSingle();

if (!item) throw new Error("CAET menu item not found");
console.log("before:", item);

if (APPLY) {
  const { error } = await supabase.from("ccshau_menu_items").update({ href: HREF }).eq("id", MENU_ID);
  if (error) throw error;
  console.log(`updated href → ${HREF}`);
} else {
  console.log(`would set href → ${HREF}`);
  console.log("Dry-run. Pass --apply to write.");
}
