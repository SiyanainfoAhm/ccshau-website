import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: page } = await sb.from("ccshau_pages").select("id, slug, title_en, status, parent_id, page_type, layout_template").eq("slug", "ic-college-of-home-science").maybeSingle();
console.log("Page:", JSON.stringify(page, null, 2));

// Check menu references
const { data: menuItems } = await sb.from("ccshau_menu_items").select("id, label_en, page_id, href").eq("page_id", page?.id);
console.log("Menu items referencing this page:", JSON.stringify(menuItems, null, 2));

// Check children
const { data: children } = await sb.from("ccshau_pages").select("id, slug, title_en").eq("parent_id", page?.id);
console.log("Child pages:", children?.length, children?.map(c => c.slug));
