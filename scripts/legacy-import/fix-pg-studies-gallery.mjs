/**
 * List / remove unwanted PG Studies gallery images.
 * Usage:
 *   node fix-pg-studies-gallery.mjs
 *   node fix-pg-studies-gallery.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: pages, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en")
    .in("slug", ["pg-studies-gallery", "pg-studies"]);
  if (pageErr) throw new Error(pageErr.message);

  const pageIds = (pages || []).map((p) => p.id);
  if (!pageIds.length) throw new Error("pg-studies gallery pages missing");

  const { data: items, error } = await sb
    .from("ccshau_page_gallery_items")
    .select("id,page_id,title_en,image_url,sort_order,is_active")
    .in("page_id", pageIds)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const pageById = Object.fromEntries((pages || []).map((p) => [p.id, p.slug]));

  console.log({
    pages: pages?.map((p) => ({ id: p.id, slug: p.slug })),
    count: items?.length ?? 0,
    mode: CONFIRM ? "apply" : "dry-run",
    items: (items || []).map((i) => ({
      id: i.id,
      page: pageById[i.page_id],
      title: i.title_en,
      active: i.is_active,
      url: i.image_url,
      sort: i.sort_order,
    })),
  });

  if (!items?.length) {
    console.log("No gallery items found");
    return;
  }

  if (!CONFIRM) {
    console.log("Pass --confirm to deactivate all listed gallery items");
    return;
  }

  const ids = items.map((i) => i.id);
  const { error: upErr } = await sb
    .from("ccshau_page_gallery_items")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (upErr) throw new Error(upErr.message);

  console.log("deactivated", ids.length, "items");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
