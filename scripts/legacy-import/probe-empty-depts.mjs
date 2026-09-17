/**
 * Probe remaining empty-content dept pages vs legacy MySQL menus.
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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const DEPT_IDS = {
  "nutri-cereals": 132,
  instrumentation: 21,
  organic: 133,
  "coaet-cfst-legacy": 119,
};

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

for (const [label, deptId] of Object.entries(DEPT_IDS)) {
  const [menus] = await conn.query(
    `SELECT m.menu_id, m.menu_name, m.menu_status, m.menu_type, m.menu_type_bk, m.college_id, m.department_id
     FROM hau_menu m
     WHERE m.department_id = ?
     ORDER BY m.menu_id`,
    [deptId],
  );
  console.log(`\n=== ${label} dept ${deptId} menus (${menus.length})`);
  for (const m of menus) {
    const [details] = await conn.query(
      `SELECT md.id, md.label, md.display_order, md.page_id,
        CASE
          WHEN cms.page_content IS NOT NULL AND TRIM(cms.page_content) <> '' THEN 'html'
          WHEN cms.file IS NOT NULL AND TRIM(cms.file) <> '' THEN 'pdf'
          ELSE 'empty'
        END AS kind,
        CHAR_LENGTH(IFNULL(cms.page_content,'')) html_len,
        cms.file AS pdf_file
       FROM hau_menu_detail md
       LEFT JOIN hau_cms cms ON cms.id = md.page_id
       WHERE md.menu_id = ?
       ORDER BY md.display_order, md.id`,
      [m.menu_id],
    );
    const withContent = details.filter((d) => d.kind !== "empty").length;
    console.log(
      `  menu ${m.menu_id} "${m.menu_name}" status=${m.menu_status} type=${m.menu_type}/${m.menu_type_bk} details=${details.length} withContent=${withContent}`,
    );
    for (const d of details.slice(0, 12)) {
      console.log(`    - ${d.label} [${d.kind}] html=${d.html_len} pdf=${d.pdf_file || ""}`);
    }
  }
}

await conn.end();
