/**
 * Inspect CFST college nav children (Departments / Gallery).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const slug = "centre-of-food-science-technology";
const { data: root, error } = await sb
  .from("ccshau_pages")
  .select(
    "id, slug, title_en, status, parent_id, college_root_id, layout_template, layout_config, sort_order",
  )
  .eq("slug", slug)
  .maybeSingle();
if (error) throw error;
console.log("ROOT", root);

const { data: kids } = await sb
  .from("ccshau_pages")
  .select(
    "id, slug, title_en, status, parent_id, layout_template, sort_order, show_in_nav, college_root_id",
  )
  .eq("parent_id", root.id)
  .order("sort_order");
console.log("\nDIRECT KIDS of CFST root:", kids);

const { data: section } = await sb
  .from("ccshau_pages")
  .select(
    "id, slug, title_en, status, parent_id, layout_template, sort_order, show_in_nav, college_root_id",
  )
  .eq("slug", "science-technology-department")
  .maybeSingle();
console.log("\nDepartments section:", section);

const { data: galleryLike } = await sb
  .from("ccshau_pages")
  .select(
    "id, slug, title_en, status, parent_id, layout_template, sort_order, show_in_nav, college_root_id",
  )
  .eq("college_root_id", root.id)
  .or("slug.ilike.%gallery%,title_en.ilike.%gallery%");
console.log("\nGallery-like under CFST college_root:", galleryLike);

// Compare with a healthy college (Hisar)
const { data: hisar } = await sb
  .from("ccshau_pages")
  .select("id, slug")
  .eq("slug", "college-of-agriculture-hisar")
  .maybeSingle();
const { data: hisarKids } = await sb
  .from("ccshau_pages")
  .select("slug, title_en, status, show_in_nav, layout_template, sort_order")
  .eq("parent_id", hisar.id)
  .eq("status", "published")
  .order("sort_order");
console.log("\nHisar published direct kids (nav reference):", hisarKids);
