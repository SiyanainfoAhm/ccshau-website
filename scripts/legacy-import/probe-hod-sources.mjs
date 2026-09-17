import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

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
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

for (const id of [543, 470, 442, 17, 485]) {
  const [rows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization, qualification,
            CHAR_LENGTH(IFNULL(other_activity,'')) other_len,
            LEFT(IFNULL(other_activity,''), 200) preview
     FROM users WHERE id = ?`,
    [id],
  );
  const [links] = await conn.query(
    `SELECT ud.department_id, d.department_name
     FROM hau_user_departments ud
     LEFT JOIN hau_college_departments d ON d.id = ud.department_id
     WHERE ud.user_id = ?`,
    [id],
  );
  console.log({ user: rows[0], depts: links });
}
await conn.end();
