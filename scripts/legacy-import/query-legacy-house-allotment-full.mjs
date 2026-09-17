import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const REPORT = join(dirname(fileURLToPath(import.meta.url)), "reports");
mkdirSync(REPORT, { recursive: true });

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [details] = await conn.query(
  `SELECT d.*, c.page_title, c.page_slug, c.file, CHAR_LENGTH(c.page_content) AS content_len
   FROM hau_menu_detail d
   LEFT JOIN hau_cms c ON c.id = d.page_id
   WHERE d.menu_id = 146
   ORDER BY d.display_order, d.id`,
);
console.log(JSON.stringify(details, null, 2));
writeFileSync(
  join(REPORT, "legacy-house-allotment-menu-full.json"),
  JSON.stringify(details, null, 2),
);

// department users for college 53 dept 103
const [users] = await conn.query(
  `SELECT u.id, u.name, u.email, u.designation, u.image, ud.department_id, ud.user_type
   FROM hau_user_departments ud
   JOIN tbl_users u ON u.id = ud.user_id
   WHERE ud.department_id = 103
   LIMIT 30`,
).catch(async (err) => {
  console.log("user query failed", err.message);
  const [cols] = await conn.query("DESCRIBE hau_user_departments");
  console.log("ud cols", cols.map((c) => c.Field));
  const [ucols] = await conn.query("DESCRIBE tbl_users");
  console.log("user cols", ucols.map((c) => c.Field).slice(0, 30));
  return [[]];
});
console.log("users", users);

const [deptRow] = await conn.query(
  `SELECT * FROM hau_college_departments WHERE id = 103 OR department_name LIKE '%Allot%' LIMIT 5`,
);
console.log("college_departments", deptRow);

await conn.end();
