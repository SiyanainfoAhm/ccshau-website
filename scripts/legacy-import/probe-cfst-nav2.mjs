/**
 * Deeper CFST nav / placement check.
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

const CFST_ID = "599c7e1c-ebe0-48c3-87ce-1af1bb4a9f12";

const kids = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, status, parent_id, layout_template, show_in_nav, college_root_id")
  .eq("parent_id", CFST_ID);
console.log("kids by parent_id", kids.error || kids.data);

const byRoot = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, status, parent_id, layout_template, show_in_nav")
  .eq("college_root_id", CFST_ID)
  .or("title_en.ilike.%department%,title_en.ilike.%gallery%,slug.ilike.%department%,slug.ilike.%gallery%");
console.log("dept/gallery by college_root", byRoot.error || byRoot.data);

const section = await sb
  .from("ccshau_pages")
  .select("*")
  .eq("id", "e60ed012-11a3-4938-a996-d96635660c5d")
  .maybeSingle();
console.log("section by id", section.error || section.data);

const allDeptGallery = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, status, parent_id, college_root_id, page_type, layout_template")
  .or("slug.ilike.%gallery%,slug.eq.science-technology-department");
console.log("slug search", allDeptGallery.error || allDeptGallery.data);

// Compare COAET kids
const { data: coaet } = await sb
  .from("ccshau_pages")
  .select("id")
  .eq("slug", "college-of-agricultural-engineering-and-technology")
  .maybeSingle();
const coaetKids = await sb
  .from("ccshau_pages")
  .select("slug, title_en, status, parent_id, layout_template")
  .eq("parent_id", coaet.id)
  .eq("status", "published");
console.log("COAET published kids", coaetKids.error || coaetKids.data);

// page_type of CFST
const cfst = await sb
  .from("ccshau_pages")
  .select("id, slug, page_type, parent_id, college_root_id, status")
  .eq("id", CFST_ID)
  .maybeSingle();
console.log("CFST page_type etc", cfst.error || cfst.data);

const parent = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, page_type")
  .eq("id", "143fdcf6-db30-4209-99d7-9a7aa791aef2")
  .maybeSingle();
console.log("CFST parent page", parent.error || parent.data);
