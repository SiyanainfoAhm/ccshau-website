#!/usr/bin/env node
/**
 * Center the Programme SOP title block on the RKVY page.
 *
 *   node scripts/ops/center-rkvy-programme-title.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { centerProgrammeTitle } from "./fix-rkvy-raftaar-content.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const eq = t.indexOf("=");
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id")
    .eq("slug", "rkvy-raftaar-agribusiness-incubator-under-rkvy-raftaar-scheme")
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error("Page not found");

  const { data: items, error: itemError } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, content_en, content_hi")
    .eq("page_id", page.id)
    .eq("label_en", "Programme SOP, PAHAL ,SAFAL");
  if (itemError) throw itemError;
  if (!items?.length) throw new Error("Programme quick link not found");

  for (const item of items) {
    const contentEn = centerProgrammeTitle(item.content_en);
    const contentHi = centerProgrammeTitle(item.content_hi);
    if (!contentEn?.includes("CCS HAU-RKVY-RAFTAAR-") || !contentEn.includes('style="text-align:center;"')) {
      throw new Error("Title table was not rewritten");
    }
    const sample = contentEn.slice(contentEn.indexOf("CCS HAU-RKVY-RAFTAAR-") - 80, contentEn.indexOf("CCS HAU-RKVY-RAFTAAR-") + 40);
    console.log(JSON.stringify({ id: item.id, sample, mode: APPLY ? "APPLY" : "dry-run" }));
    if (!APPLY) continue;
    const { error: updateError } = await supabase
      .from("ccshau_page_sidebar_items")
      .update({ content_en: contentEn, content_hi: contentHi })
      .eq("id", item.id);
    if (updateError) throw updateError;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
