import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
function load(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
load(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: hisar } = await s
  .from("ccshau_media_albums")
  .select("id, slug, title_en, status")
  .eq("slug", "legacy-gallery-95")
  .maybeSingle();

const { count: archived } = await s
  .from("ccshau_media_albums")
  .select("id", { count: "exact", head: true })
  .like("slug", "legacy-gallery-%")
  .eq("status", "archived");

const { count: published } = await s
  .from("ccshau_media_albums")
  .select("id", { count: "exact", head: true })
  .like("slug", "legacy-gallery-%")
  .eq("status", "published");

const { count: allLegacy } = await s
  .from("ccshau_media_albums")
  .select("id", { count: "exact", head: true })
  .like("slug", "legacy-gallery-%");

let hisarItems = 0;
if (hisar?.id) {
  const { count } = await s
    .from("ccshau_media_items")
    .select("id", { count: "exact", head: true })
    .eq("album_id", hisar.id);
  hisarItems = count ?? 0;
}

console.log(
  JSON.stringify(
    { hisar, hisarItems, legacyAlbums: { all: allLegacy, archived, published } },
    null,
    2,
  ),
);
