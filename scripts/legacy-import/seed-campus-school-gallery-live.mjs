/**
 * Seed Campus School gallery from live HTML (no MySQL).
 * Usage: node seed-campus-school-gallery-live.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");
const GALLERY_PAGE_SLUG = "campus-school-gallery";

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
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

function collectGalleryUrls(html) {
  return [
    ...new Set(
      [
        ...html.matchAll(
          /https?:\/\/hau\.ac\.in\/public\/images\/gallery\/[^"'\\\s>]+\.(?:jpe?g|png|webp|gif)/gi,
        ),
        ...html.matchAll(
          /\/public\/images\/gallery\/[^"'\\\s>]+\.(?:jpe?g|png|webp|gif)/gi,
        ),
      ].map((m) => (m[0].startsWith("http") ? m[0] : `https://hau.ac.in${m[0]}`)),
    ),
  ];
}

const pages = [
  "https://hau.ac.in/college/gallery/campus-school",
  "https://hau.ac.in/college/campus-school",
];

const urls = [];
for (const pageUrl of pages) {
  const res = await fetch(pageUrl);
  const html = await res.text();
  const found = collectGalleryUrls(html);
  console.log(pageUrl, "->", found.length);
  for (const u of found) {
    if (!urls.includes(u)) urls.push(u);
  }
}

console.log("unique images", urls.length);
if (!urls.length) {
  console.error("No gallery images found");
  process.exit(1);
}

if (!CONFIRM) {
  console.log(urls.slice(0, 10));
  console.log("Re-run with --confirm to write");
  process.exit(0);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: page, error } = await supabase
  .from("ccshau_pages")
  .select("id, layout_config")
  .eq("slug", GALLERY_PAGE_SLUG)
  .maybeSingle();
if (error) throw new Error(error.message);
if (!page?.id) throw new Error("campus-school-gallery page missing");

await supabase.from("ccshau_page_gallery_items").delete().eq("page_id", page.id);

const rows = urls.map((image_url, i) => ({
  page_id: page.id,
  image_url,
  thumbnail_url: null,
  title_en: "Gallery",
  title_hi: null,
  sort_order: i + 1,
  is_active: true,
}));

const { error: insErr } = await supabase.from("ccshau_page_gallery_items").insert(rows);
if (insErr) throw new Error(insErr.message);

await supabase
  .from("ccshau_pages")
  .update({
    layout_config: {
      ...(page.layout_config || {}),
      gallery: true,
      mainContent: false,
      collegeTopMenu: true,
    },
  })
  .eq("id", page.id);

console.log(JSON.stringify({ ok: true, pageId: page.id, count: rows.length }, null, 2));
