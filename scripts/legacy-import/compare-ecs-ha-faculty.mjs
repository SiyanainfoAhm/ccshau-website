import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT = join(dirname(fileURLToPath(import.meta.url)), "reports");
mkdirSync(REPORT, { recursive: true });

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

const { data: assigns, error: aErr } = await sb
  .from("ccshau_faculty_assignments")
  .select("*")
  .eq("page_id", PAGE_ID);
console.log("assignErr", aErr?.message);
console.log("assigns", assigns);

if (assigns?.length) {
  const { data: people } = await sb
    .from("ccshau_faculty_people")
    .select("*")
    .in(
      "id",
      assigns.map((a) => a.person_id),
    );
  console.log(
    "people",
    people?.map((p) => ({
      id: p.id,
      name: p.full_name_en,
      desig: p.designation_en,
      email: p.email,
      photo: p.photo_path,
    })),
  );
}

// Also check legacy staff table pattern used by import
const mysqlConn = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [roleCols] = await mysqlConn.query("DESCRIBE college_user_roles");
console.log(
  "role cols",
  roleCols.map((c) => c.Field),
);
const [roleSample] = await mysqlConn.query(
  "SELECT * FROM college_user_roles WHERE college_id=53 LIMIT 5",
);
console.log("role sample", roleSample);

const [deptUsers] = await mysqlConn.query(
  `SELECT r.*, u.name, u.email, u.user_type, u.phone
   FROM college_user_roles r
   JOIN tbl_users u ON u.user_id = r.user_id
   WHERE r.department_id = 103`,
);
console.log("dept103 users", deptUsers);

// Try hau_users_roles
const [hurCols] = await mysqlConn.query("DESCRIBE hau_users_roles");
console.log(
  "hur cols",
  hurCols.map((c) => c.Field),
);
const [hur] = await mysqlConn.query(
  "SELECT * FROM hau_users_roles WHERE department_id=103 OR college_id=53 LIMIT 20",
);
console.log("hur", hur);

await mysqlConn.end();
