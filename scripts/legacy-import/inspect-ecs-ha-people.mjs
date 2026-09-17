import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

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
const PERSON_IDS = [
  "5a41bef4-1a92-4890-86dc-35c4e74c9bd0",
  "6d3fd6d0-794e-4010-b751-3053719e4b13",
];

const { data: people } = await sb
  .from("ccshau_faculty_people")
  .select("*")
  .in("id", PERSON_IDS);
console.log("people keys", people?.[0] && Object.keys(people[0]));
console.log(
  people?.map((p) => ({
    id: p.id,
    name_en: p.name_en ?? p.full_name_en,
    title: p.title_en,
    designation: p.designation_en,
    email: p.email,
    image: p.image_path ?? p.photo_path ?? p.head_image_path,
  })),
);

const { data: staff } = await sb
  .from("ccshau_page_staff")
  .select("*")
  .eq("page_id", PAGE_ID);
console.log(
  "page_staff",
  staff?.map((s) => ({
    name: s.name_en,
    role: s.designation_en,
    type: s.member_type,
    active: s.is_active,
  })),
);

const mysqlConn = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});
const [u343] = await mysqlConn.query(
  "SELECT user_id, name, email, phone, user_type, status FROM tbl_users WHERE user_id IN (343,701)",
);
console.log("legacy users", u343);

// find faculty linked to dept via hau_user_departments
const [ud] = await mysqlConn.query(
  `SELECT ud.*, u.name, u.email, u.user_type
   FROM hau_user_departments ud
   JOIN tbl_users u ON u.user_id = ud.user_id
   WHERE ud.department_id = 103 OR ud.college_id = 53`,
);
console.log("hau_user_departments", ud);

await mysqlConn.end();
