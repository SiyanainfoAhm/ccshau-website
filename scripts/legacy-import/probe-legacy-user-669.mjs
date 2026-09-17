/**
 * Probe legacy MySQL for Smt. Kamlesh Khurana (legacy-user-669).
 * Usage: node probe-legacy-user-669.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [users] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, role_id, status, college_id, department_id_bk
   FROM users WHERE id = 669`,
);
console.log("users", JSON.stringify(users, null, 2));

const [depts] = await conn.query(
  `SELECT * FROM hau_user_departments WHERE user_id = 669`,
);
console.log("hau_user_departments", JSON.stringify(depts, null, 2));

for (const row of depts) {
  if (!row.department_id) continue;
  const [d] = await conn.query(
    `SELECT id, department_name, college_id, department_status
     FROM hau_college_departments WHERE id = ?`,
    [row.department_id],
  );
  const [c] = await conn.query(
    `SELECT college_id, college_name FROM hau_college WHERE college_id = ?`,
    [row.college_id],
  );
  console.log("department", JSON.stringify(d, null, 2));
  console.log("user_dept college", JSON.stringify(c, null, 2));
}

await conn.end();
