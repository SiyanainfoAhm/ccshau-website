import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
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
    )
      v = v.slice(1, -1);
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

const PAGE_ID = "47e309dd-e6d4-4857-a1fc-1ff45c665fb6";
const { data: assigns } = await sb
  .from("ccshau_faculty_assignments")
  .select("id,person_id,member_type,sort_order,is_active,designation_override_en")
  .eq("page_id", PAGE_ID);

const personIds = (assigns || []).map((a) => a.person_id);
const { data: people } = await sb
  .from("ccshau_faculty_people")
  .select(
    "id,full_name_en,designation_en,email,photo_path,mobile,specialization_en",
  )
  .in("id", personIds);

const byId = Object.fromEntries((people || []).map((p) => [p.id, p]));
console.log(
  JSON.stringify(
    (assigns || []).map((a) => ({
      ...a,
      person: byId[a.person_id],
    })),
    null,
    2,
  ),
);
