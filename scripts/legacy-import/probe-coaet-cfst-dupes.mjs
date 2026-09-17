import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
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

async function get(idOrSlug, by = "id") {
  const q = sb
    .from("ccshau_pages")
    .select("id,slug,title_en,parent_id,college_root_id,layout_template,status");
  const { data, error } = await (by === "slug" ? q.eq("slug", idOrSlug) : q.eq("id", idOrSlug)).maybeSingle();
  if (error) console.log("err", error.message);
  return data;
}

const parent = await get("e60ed012-11a3-4938-a996-d96635660c5d");
console.log("CFST dept parent section", parent);

for (const slug of [
  "basic-engineering",
  "coaet-basic-engineering",
  "farm-machinery-power-engineering",
  "coaet-farm-machinery-power-engineering",
  "cfst-centre-of-food-science-and-technology",
  "coaet-centre-of-food-science-technology",
]) {
  const p = await get(slug, "slug");
  console.log(slug, p ? { id: p.id, root: p.college_root_id, parent: p.parent_id, layout: p.layout_template, status: p.status } : null);
}

// all children of CFST
const CFST = "599c7e1c-ebe0-48c3-87ce-1af1bb4a9f12";
const { data: kids } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en,layout_template,parent_id")
  .eq("parent_id", CFST);
console.log("direct kids of CFST", kids);

const { data: under } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en,layout_template,parent_id")
  .eq("college_root_id", CFST);
console.log(
  "all under CFST root",
  (under || []).map((p) => ({ slug: p.slug, layout: p.layout_template, parent: p.parent_id })),
);
