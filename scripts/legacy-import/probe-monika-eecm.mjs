/**
 * Find correct EECM Dr. Monika profile; revert wrong Kayasth data if needed.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

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
  { auth: { persistSession: false } },
);

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

// All users linked to college 9 (ICCCS) with Monika in name OR EECM specialization
const [rows] = await conn.query(
  `SELECT u.id, u.first_name, u.last_name, u.email, u.designation, u.specialization,
          u.role_id, CHAR_LENGTH(IFNULL(u.other_activity,'')) other_len,
          ud.department_id, d.department_name
   FROM users u
   LEFT JOIN hau_user_departments ud ON ud.user_id = u.id
   LEFT JOIN hau_college_departments d ON d.id = ud.department_id
   WHERE (
      u.first_name LIKE '%Monika%' OR u.last_name LIKE '%Monika%'
      OR u.email LIKE '%monika%' OR u.email LIKE '%hod-hsee%'
   )
   OR (ud.college_id = 9 AND u.first_name LIKE '%Moni%')
   ORDER BY other_len DESC`,
);

console.log("Candidates:");
for (const r of rows) {
  console.log({
    id: r.id,
    name: `${r.first_name} ${r.last_name || ""}`.trim(),
    email: r.email,
    desig: r.designation,
    spec: r.specialization,
    otherLen: r.other_len,
    dept: r.department_name,
    deptId: r.department_id,
  });
}

// Also search other_activity mentioning EECM / Extension Education Communication for Monika-like
const [htmlHits] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, specialization,
          CHAR_LENGTH(IFNULL(other_activity,'')) other_len
   FROM users
   WHERE other_activity LIKE '%Extension Education%'
     AND (first_name LIKE '%Monika%' OR first_name LIKE '%Monica%' OR email LIKE '%monika%')
   LIMIT 20`,
);
console.log("\nEECM content + Monika:", htmlHits);

// Full non-empty fields for user 222
const [u222] = await conn.query(`SELECT * FROM users WHERE id = 222`);
const row = u222[0];
const interesting = {};
for (const [k, v] of Object.entries(row || {})) {
  if (v == null || v === "") continue;
  const s = String(v);
  if (["password", "remember_token"].includes(k)) continue;
  interesting[k] = s.length > 120 ? `[len=${s.length}] ${s.slice(0, 80)}…` : v;
}
console.log("\nUser 222 fields:", interesting);

// Search professors in dept 35 with role 2
const [hodish] = await conn.query(
  `SELECT u.id, u.first_name, u.last_name, u.email, u.designation, u.role_id,
          u.specialization, CHAR_LENGTH(IFNULL(u.other_activity,'')) other_len
   FROM hau_user_departments ud
   JOIN users u ON u.id = ud.user_id
   WHERE ud.department_id = 35 AND u.role_id IN (1,2)
   ORDER BY u.role_id, other_len DESC`,
);
console.log("\nDept 35 role 1/2:", hodish);

await conn.end();

const CONFIRM = process.argv.includes("--confirm-revert");
if (CONFIRM) {
  const { error } = await sb
    .from("ccshau_page_staff")
    .update({
      specialization_en: null,
      detail_content_en: null,
      qualification_en: null,
      member_type: "hod",
      sort_order: 1,
    })
    .eq("id", "76cc7695-43b2-4538-9b84-40c520161205");
  if (error) throw error;
  console.log("\nReverted wrong Kayasth profile from HOD; kept sort_order=1");
}
