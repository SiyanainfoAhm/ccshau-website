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

const homeId = "d3a1890b-9adc-4e89-90cf-88ecc168fb8b";
const commId = "5b3e2de6-6535-4866-a0d6-5567f0825774";

const { data: homeDesc } = await sb
  .from("ccshau_pages")
  .select("slug, title_en, status, page_type, parent_id, college_root_id")
  .or(`id.eq.${homeId},parent_id.eq.${homeId},college_root_id.eq.${homeId}`);

console.log("HOME SCIENCE TREE");
console.log(JSON.stringify(homeDesc, null, 2));

const { data: commChildren } = await sb
  .from("ccshau_pages")
  .select("slug, title_en, status, page_type")
  .eq("parent_id", commId)
  .order("slug");
console.log("\nCOMMUNITY SCIENCE DIRECT CHILDREN");
console.log(JSON.stringify(commChildren, null, 2));

const { data: commSections } = await sb
  .from("ccshau_pages")
  .select("slug, title_en, status, page_type, parent_id")
  .eq("college_root_id", commId)
  .eq("page_type", "standard")
  .order("slug")
  .limit(40);
console.log("\nCOMMUNITY SCIENCE SAMPLE DESCENDANTS");
console.log((commSections ?? []).map((p) => `${p.slug} [${p.status}] ${p.page_type}`).join("\n"));

const { data: sidebar } = await sb
  .from("ccshau_page_sidebar_items")
  .select("id, page_id, label_en")
  .in("page_id", [homeId, commId]);
console.log("\nSIDEBAR ITEMS on college roots", sidebar);

const { data: ticker } = await sb
  .from("ccshau_page_news_ticker_items")
  .select("id, page_id, title_en")
  .in("page_id", [homeId, commId]);
console.log("TICKER", ticker);

const { data: student } = await sb
  .from("ccshau_page_student_corner_items")
  .select("id, page_id, title_en")
  .in("page_id", [homeId, commId]);
console.log("STUDENT CORNER", student);

const { data: contacts } = await sb
  .from("ccshau_page_contact_lines")
  .select("id, page_id, line_en")
  .in("page_id", [homeId, commId]);
console.log("CONTACTS", contacts);

const { data: staff } = await sb
  .from("ccshau_page_staff")
  .select("id, page_id, name_en")
  .in("page_id", [homeId, commId]);
console.log("STAFF", staff);

const { data: gallery } = await sb
  .from("ccshau_page_gallery_items")
  .select("id, page_id")
  .in("page_id", [homeId, commId]);
console.log("GALLERY ROOT", gallery);

const { data: assignments } = await sb
  .from("ccshau_user_college_roles")
  .select("*")
  .in("college_page_id", [homeId, commId]);
console.log("USER ROLES", assignments);

const { data: deptScope } = await sb
  .from("ccshau_user_college_roles")
  .select("*")
  .limit(1);
console.log("roles table sample error check", deptScope);
