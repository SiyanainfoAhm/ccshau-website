import mysql from "mysql2/promise";
import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
function load(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
load(join(ROOT, "apps/web/.env.local"));

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  user: process.env.LEGACY_MYSQL_USER || "root",
  password: process.env.LEGACY_MYSQL_PASSWORD || "",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [c] = await conn.query(
  "SELECT college_id, college_name, college_slug, type FROM hau_college WHERE college_id=2",
);
const [g] = await conn.query(
  `SELECT gallery_id, gallery_title, gallery_college, gallery_type, gallery_status, gallery_image
   FROM hau_gallery WHERE gallery_college=2 ORDER BY gallery_sort_order, gallery_id`,
);
const [d] = await conn.query(
  `SELECT id, gallery_id, title, full_image, original_image, thumbnail, status
   FROM hau_gallery_detail WHERE gallery_id=95 LIMIT 8`,
);
const [counts] = await conn.query(`
  SELECT
    SUM(gallery_college IS NOT NULL AND gallery_college<>0) AS linked,
    SUM(gallery_college IS NULL OR gallery_college=0) AS unlinked,
    COUNT(*) AS total
  FROM hau_gallery WHERE gallery_status=1
`);
const [byCollege] = await conn.query(`
  SELECT gallery_college, COUNT(*) n
  FROM hau_gallery
  WHERE gallery_status=1 AND gallery_college IS NOT NULL AND gallery_college<>0
  GROUP BY gallery_college ORDER BY n DESC LIMIT 20
`);
const [detailCounts] = await conn.query(`
  SELECT g.gallery_college, COUNT(d.id) items
  FROM hau_gallery g
  JOIN hau_gallery_detail d ON d.gallery_id = g.gallery_id AND d.status=1
  WHERE g.gallery_status=1 AND g.gallery_college IS NOT NULL AND g.gallery_college<>0
  GROUP BY g.gallery_college ORDER BY items DESC LIMIT 15
`);

console.log(
  JSON.stringify({ college: c, galleries: g, detailSample: d, counts, byCollege, detailCounts }, null, 2),
);
await conn.end();
