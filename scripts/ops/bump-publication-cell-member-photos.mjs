#!/usr/bin/env node
/**
 * Make Publication Cell member portraits 30% larger than the 72px table cap.
 *
 *   node scripts/ops/bump-publication-cell-member-photos.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SIZE = "5.85rem";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");

function enlargePhotos(html) {
  if (!html) return html;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const size = `width:${SIZE}; max-width:${SIZE}; max-height:${SIZE}; height:auto`;
    if (/style\s*=\s*"/i.test(tag)) {
      return tag.replace(/style\s*=\s*"([^"]*)"/i, (_match, style) => {
        const parts = style
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => !/^(width|max-width|max-height|height)\s*:/i.test(part));
        parts.push(size);
        return `style="${parts.join("; ")}"`;
      });
    }
    return tag.replace(/<img\b/i, `<img style="${size}"`);
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id")
    .eq("slug", "publication-cell")
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error("Published publication-cell page not found");

  const { data: items, error: itemError } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, content_en, content_hi")
    .eq("page_id", page.id)
    .eq("label_en", "Members");
  if (itemError) throw itemError;
  if (!items?.length) throw new Error("Members quick link not found");

  for (const item of items) {
    const contentEn = enlargePhotos(item.content_en);
    const contentHi = enlargePhotos(item.content_hi);
    const before = (item.content_en || "").match(/<img\b[^>]*>/i)?.[0] || "";
    const after = (contentEn || "").match(/<img\b[^>]*>/i)?.[0] || "";
    console.log(
      JSON.stringify({
        id: item.id,
        images: (item.content_en || "").match(/<img\b/gi)?.length || 0,
        hindiImages: (item.content_hi || "").match(/<img\b/gi)?.length || 0,
        beforeStyle: before.match(/style="[^"]*"/)?.[0] || null,
        afterStyle: after.match(/style="[^"]*"/)?.[0] || null,
        mode: APPLY ? "APPLY" : "dry-run",
      }),
    );
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
