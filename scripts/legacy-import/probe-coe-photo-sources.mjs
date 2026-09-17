import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

const { data: people } = await sb
  .from("ccshau_page_people")
  .select("name_en,image_path,designation_en,page_id")
  .ilike("name_en", "%Surender%Sharma%");
console.log("people", people);

const { data: staff } = await sb
  .from("ccshau_staff_members")
  .select("name_en,photo_path,designation_en")
  .ilike("name_en", "%Surender%Sharma%")
  .limit(20);
console.log("staff", staff);

// Wayback
const orig =
  "https://hau.ac.in/storage/app/uploads/2QC3I5u7Zo0RRcz65y7TM7n1zPAuMOU3V0BcvHdF.jpeg";
const wb = `https://web.archive.org/web/2024/${orig}`;
const r = await fetch(wb, {
  method: "HEAD",
  redirect: "follow",
  headers: { "User-Agent": "Mozilla/5.0" },
});
console.log("wayback", r.status, r.url);

const avail = await fetch(
  `https://archive.org/wayback/available?url=${encodeURIComponent(orig)}`,
);
console.log("available", await avail.text());
