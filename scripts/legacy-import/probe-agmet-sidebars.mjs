/**
 * Probe legacy Agricultural Meteorology (college=2, dept=3) sidebar CMS rows.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const collegeId = 2;
const departmentId = 3;

const [menus] = await conn.query(
  `SELECT menu_id, menu_name, college_id, department_id, menu_status, menu_type
   FROM hau_menu
   WHERE college_id = ? AND department_id = ?`,
  [collegeId, departmentId],
);
console.log("menus:", menus);

for (const menu of menus) {
  const [details] = await conn.query(
    `SELECT
       md.id,
       md.label,
       md.display_order,
       md.page_id,
       cms.page_title,
       cms.file,
       LENGTH(COALESCE(cms.page_content,'')) AS content_len,
       LEFT(COALESCE(cms.page_content,''), 140) AS content_preview
     FROM hau_menu_detail md
     LEFT JOIN hau_cms cms ON cms.id = md.page_id
     WHERE md.menu_id = ?
     ORDER BY md.display_order, md.id`,
    [menu.menu_id],
  );

  console.log("\nmenu", menu.menu_id, menu.menu_name);
  for (const d of details) {
    console.log({
      detailId: d.id,
      label: d.label,
      sort: d.display_order,
      pageId: d.page_id,
      file: d.file,
      contentLen: d.content_len,
      preview: String(d.content_preview || "")
        .replace(/\s+/g, " ")
        .slice(0, 100),
    });
  }
}

await conn.end();
