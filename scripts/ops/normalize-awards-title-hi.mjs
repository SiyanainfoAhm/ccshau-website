#!/usr/bin/env node
/**
 * Normalize Awards gallery title_hi (trim) — does not change layout/images.
 * Captions already exist in Hindi for all active items.
 *
 *   node scripts/ops/normalize-awards-title-hi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "b5b330ec-2846-4600-a9a3-7fbf03710090";

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

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const now = new Date().toISOString();

  const { data: items } = await sb
    .from("ccshau_page_gallery_items")
    .select("id,title_en,title_hi")
    .eq("page_id", PAGE_ID)
    .eq("is_active", true);

  let trimmed = 0;
  let missing = 0;
  for (const row of items ?? []) {
    const hi = (row.title_hi ?? "").trim();
    if (!hi || !/[\u0900-\u097F]/.test(hi)) {
      missing++;
      console.log("MISSING", row.title_en);
      continue;
    }
    if (hi !== row.title_hi) {
      trimmed++;
      console.log("trim", JSON.stringify(row.title_hi), "→", JSON.stringify(hi));
      if (APPLY) {
        const { error } = await sb
          .from("ccshau_page_gallery_items")
          .update({ title_hi: hi, updated_at: now })
          .eq("id", row.id);
        if (error) throw error;
      }
    }
  }

  // Ensure page meta only (no content/layout changes)
  const { data: page } = await sb
    .from("ccshau_pages")
    .select("title_hi,excerpt_hi,content_hi,layout_config")
    .eq("id", PAGE_ID)
    .single();
  console.log("\npage title_hi:", page?.title_hi);
  console.log("excerpt_hi:", page?.excerpt_hi);
  console.log("content_hi empty?", !(page?.content_hi || "").trim());
  console.log("layout gallery flag:", page?.layout_config?.gallery);
  console.log(`\nitems=${items?.length} missingHi=${missing} needTrim=${trimmed}`);
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  if (!APPLY && trimmed) console.log("Pass --apply to trim title_hi only.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
