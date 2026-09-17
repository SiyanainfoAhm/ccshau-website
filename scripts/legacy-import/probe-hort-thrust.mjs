import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
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

const [detail] = await conn.query("SELECT * FROM hau_menu_detail WHERE id = 449");
console.log("detail:", detail[0]);

const pageId = detail[0]?.page_id;
console.log("page_id:", pageId);

if (pageId) {
  const [cms] = await conn.query("SELECT id, page_title, file, page_content, created_at, updated_at FROM hau_cms WHERE id = ?", [pageId]);
  console.log("cms by page_id:", cms[0] ? { ...cms[0], page_content: (cms[0].page_content||'').slice(0,200) } : null);
}

// Any cms with label Thurst for dept hort via alternative joins
const [alt] = await conn.query(
  `SELECT cms.id, cms.page_title, cms.file, LENGTH(COALESCE(cms.page_content,'')) len
   FROM hau_cms cms
   WHERE cms.id IN (SELECT page_id FROM hau_menu_detail WHERE label LIKE '%Thurst%' OR label LIKE '%Thrust%')`
);
console.log("all thrust cms:", alt);

// Check nearby file numbers for horticulture (1687836xxx-1687837xxx)
const [near] = await conn.query(
  `SELECT id, page_title, file FROM hau_cms
   WHERE file REGEXP '^168783[0-9]+\\.pdf$'
   ORDER BY file`
);
console.log("nearby 168783* files:", near);

await conn.end();
