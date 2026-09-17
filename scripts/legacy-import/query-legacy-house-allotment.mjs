/**
 * Pull legacy House Allotment (college 53 / dept 103 / menu 146) from MySQL.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const REPORT = join(dirname(fileURLToPath(import.meta.url)), "reports");
mkdirSync(REPORT, { recursive: true });

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [tables] = await conn.query("SHOW TABLES");
console.log(
  "tables",
  tables.map((t) => Object.values(t)[0]).filter((n) => /menu|cms|dept|college|user/i.test(n)),
);

async function describe(table) {
  try {
    const [cols] = await conn.query(`DESCRIBE \`${table}\``);
    return cols.map((c) => c.Field);
  } catch {
    return null;
  }
}

for (const t of [
  "hau_menu",
  "hau_menu_detail",
  "hau_cms",
  "hau_department",
  "college_department",
  "departments",
]) {
  const cols = await describe(t);
  if (cols) console.log(t, cols.slice(0, 25).join(", "));
}

// Find menu 146 / house allotment
const [menus] = await conn.query(
  `SELECT * FROM hau_menu WHERE menu_name LIKE ? OR menu_name LIKE ? LIMIT 20`,
  ["%House Allot%", "%Allotment%"],
);
console.log("menus", menus);

const menuId = menus[0]?.id ?? menus[0]?.menu_id ?? 146;
console.log("using menuId", menuId, "keys", menus[0] && Object.keys(menus[0]));

const [details] = await conn.query(
  `SELECT * FROM hau_menu_detail WHERE menu_id = ? ORDER BY id`,
  [menuId],
).catch(async () => {
  // try alternate column names
  const cols = await describe("hau_menu_detail");
  console.log("detail cols", cols);
  return [[]];
});
console.log("details count", details.length);
writeFileSync(join(REPORT, "legacy-house-allotment-menu-details.json"), JSON.stringify(details, null, 2));

for (const d of details.slice(0, 20)) {
  console.log({
    id: d.id,
    title: d.menu_title || d.title || d.name,
    cms_id: d.cms_id || d.page_id,
    file: d.file,
    sort: d.sort_order || d.order,
  });
}

// Fetch CMS rows referenced
const cmsIds = details
  .map((d) => d.cms_id || d.page_id)
  .filter(Boolean);
if (cmsIds.length) {
  const [cms] = await conn.query(
    `SELECT id, page_title, page_slug, file, LEFT(page_content, 500) AS preview, CHAR_LENGTH(page_content) AS len
     FROM hau_cms WHERE id IN (?)`,
    [cmsIds],
  );
  console.log("cms", cms);
  writeFileSync(join(REPORT, "legacy-house-allotment-cms.json"), JSON.stringify(cms, null, 2));

  const [full] = await conn.query(`SELECT id, page_title, page_slug, file, page_content FROM hau_cms WHERE id IN (?)`, [cmsIds]);
  for (const row of full) {
    const safe = String(row.page_slug || row.id).replace(/[^\w-]+/g, "-");
    writeFileSync(join(REPORT, `legacy-house-cms-${safe}.html`), row.page_content || "");
  }
}

// Department about / hod
const [depts] = await conn.query(
  `SELECT * FROM hau_department WHERE id = 103 OR department_name LIKE ? LIMIT 5`,
  ["%House Allot%"],
).catch(async () => {
  const [alt] = await conn.query(`SHOW TABLES LIKE '%department%'`);
  console.log("dept tables", alt);
  return [[]];
});
console.log("depts", depts?.slice?.(0, 3) || depts);

await conn.end();
