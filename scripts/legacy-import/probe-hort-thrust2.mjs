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

const [cms] = await conn.query("SELECT * FROM hau_cms WHERE id = 289");
const row = cms[0];
console.log({
  id: row.id,
  page_title: row.page_title,
  file: row.file,
  slug: row.slug || row.page_slug || null,
  keys: Object.keys(row),
  contentLen: (row.page_content || "").length,
  preview: String(row.page_content || "").slice(0, 200),
});

// How does link page/thurst-area-2 resolve?
const [bySlug] = await conn.query(
  `SELECT id, page_title, file, slug FROM hau_cms WHERE slug LIKE '%thurst%' OR slug LIKE '%thrust%' LIMIT 30`,
).catch(async () => {
  // try alternate column names
  const [cols] = await conn.query("SHOW COLUMNS FROM hau_cms");
  console.log("cms cols:", cols.map((c) => c.Field).join(", "));
  return [[]];
});
console.log("by slug:", bySlug);

const [cols] = await conn.query("SHOW COLUMNS FROM hau_cms");
console.log("cms cols:", cols.map((c) => c.Field).join(", "));

// find cms linked via slug thurst-area-2
for (const col of ["slug", "page_slug", "url", "permalink"]) {
  if (!cols.some((c) => c.Field === col)) continue;
  const [r] = await conn.query(`SELECT id, page_title, file, ${col} AS s FROM hau_cms WHERE ${col} LIKE '%thurst-area%' LIMIT 20`);
  console.log(col, r);
}

await conn.end();
