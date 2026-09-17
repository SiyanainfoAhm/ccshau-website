import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const slugs = [
  "ic-college-of-home-science",
  "ic-college-of-community-science",
  "ic-college-community-science",
];

const { data: pages, error } = await sb
  .from("ccshau_pages")
  .select(
    "id, slug, title_en, title_hi, status, page_type, layout_template, parent_id, college_root_id, published_at, updated_at, excerpt_en, logo_image_path, featured_image_path, content_en, layout_config",
  )
  .in("slug", slugs);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("=== PAGES ===");
for (const p of pages ?? []) {
  console.log({
    id: p.id,
    slug: p.slug,
    title: p.title_en,
    status: p.status,
    page_type: p.page_type,
    layout: p.layout_template,
    parent_id: p.parent_id,
    college_root_id: p.college_root_id,
    published_at: p.published_at,
    updated_at: p.updated_at,
    hasContent: Boolean(p.content_en && String(p.content_en).replace(/<[^>]+>/g, "").trim()),
    contentLen: p.content_en?.length ?? 0,
    excerpt: p.excerpt_en,
    hasLogo: Boolean(p.logo_image_path),
    hasFeatured: Boolean(p.featured_image_path),
    layoutConfig: p.layout_config,
  });
}

async function count(table, filter) {
  const q = sb.from(table).select("id", { count: "exact", head: true });
  const { count: c, error: e } = await filter(q);
  if (e) return { error: e.message };
  return c;
}

for (const page of pages ?? []) {
  const { data: children } = await sb
    .from("ccshau_pages")
    .select("slug, title_en, status, page_type")
    .eq("parent_id", page.id)
    .order("slug");

  const { data: descendants } = await sb
    .from("ccshau_pages")
    .select("slug, status, page_type")
    .eq("college_root_id", page.id);

  const { data: menuItems } = await sb
    .from("ccshau_menu_items")
    .select("id, label_en, href, page_id, parent_id")
    .or(`page_id.eq.${page.id},href.ilike.%${page.slug}%`);

  const { data: redirects } = await sb
    .from("ccshau_url_redirects")
    .select("from_path, to_path, is_permanent")
    .or(`from_path.ilike.%${page.slug}%,to_path.ilike.%${page.slug}%`);

  const gallery = await count("ccshau_page_gallery_items", (q) => q.eq("page_id", page.id));
  const news = await count("ccshau_news", (q) => q.eq("content_owner_id", page.id));
  const people = await count("ccshau_faculty_people", (q) => q.eq("page_id", page.id));
  const staff = await count("ccshau_office_staff", (q) => q.eq("page_id", page.id));
  const sidebar = await count("ccshau_page_sidebar_links", (q) => q.eq("page_id", page.id));

  console.log(`\n=== DETAIL ${page.slug} ===`);
  console.log({
    children: children?.length ?? 0,
    childSlugs: children?.map((c) => `${c.slug} [${c.status}]`),
    descendants: descendants?.length ?? 0,
    publishedDescendants: descendants?.filter((d) => d.status === "published").length ?? 0,
    menuItems,
    redirects,
    gallery,
    news,
    people,
    staff,
    sidebar,
  });
}

const { data: headerMenus } = await sb
  .from("ccshau_menu_items")
  .select("id, label_en, href, page_id")
  .or(
    "label_en.ilike.%community science%,label_en.ilike.%home science%,href.ilike.%home-science%,href.ilike.%community-science%",
  );

console.log("\n=== MENU MATCHES ===");
console.log(JSON.stringify(headerMenus, null, 2));

const { data: roles } = await sb
  .from("ccshau_user_college_roles")
  .select("user_id, role, college_page_id");
console.log("\n=== COLLEGE ROLE ROWS matching these pages ===");
const ids = new Set((pages ?? []).map((p) => p.id));
console.log((roles ?? []).filter((r) => ids.has(r.college_page_id)));
