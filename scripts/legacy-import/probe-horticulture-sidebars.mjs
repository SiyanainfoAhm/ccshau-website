/**
 * Probe Horticulture (college=2, dept=9) legacy sidebar CMS for Thurst Area PDF.
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
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [rows] = await conn.query(
  `SELECT m.menu_id, md.id AS detail_id, md.label, md.display_order,
          cms.file, LENGTH(COALESCE(cms.page_content,'')) AS content_len,
          LEFT(COALESCE(cms.page_content,''), 120) AS preview
   FROM hau_menu m
   JOIN hau_menu_detail md ON md.menu_id = m.menu_id
   LEFT JOIN hau_cms cms ON cms.id = md.page_id
   WHERE m.college_id = 2 AND m.department_id = 9
     AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
   ORDER BY md.display_order, md.id`,
);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
