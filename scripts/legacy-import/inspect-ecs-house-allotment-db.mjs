import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT = join(dirname(fileURLToPath(import.meta.url)), "reports");

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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const PAGE_ID = "47e309dd-e6d4-4857-a1fc-1ff45c665fb6";

const { data: page } = await sb
  .from("ccshau_pages")
  .select("*")
  .eq("id", PAGE_ID)
  .maybeSingle();

const { data: sidebars } = await sb
  .from("ccshau_page_sidebar_items")
  .select("*")
  .eq("page_id", PAGE_ID)
  .order("sort_order");

const { data: contacts } = await sb
  .from("ccshau_page_contact_lines")
  .select("*")
  .eq("page_id", PAGE_ID)
  .order("sort_order");

const { data: people } = await sb
  .from("ccshau_faculty_people")
  .select("id,full_name_en,designation_en,photo_path")
  .limit(5);

// check assignments for this page
const { data: assignments } = await sb
  .from("ccshau_faculty_assignments")
  .select("id,person_id,page_id,member_type,sort_order,is_active")
  .eq("page_id", PAGE_ID)
  .order("sort_order");

mkdirSync(REPORT, { recursive: true });
const out = {
  page: {
    slug: page?.slug,
    title: page?.title_en,
    layout: page?.layout_template,
    layout_config: page?.layout_config,
    head: page?.head_name_en,
    content: page?.content_en,
  },
  sidebars: (sidebars || []).map((s) => ({
    id: s.id,
    side: s.side,
    label: s.label_en,
    href: s.href,
    linked: s.linked_page_id,
    active: s.is_active,
    sort: s.sort_order,
    contentLen: (s.content_en || "").length,
  })),
  contacts,
  assignments,
};
writeFileSync(join(REPORT, "ecs-house-allotment-db.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
