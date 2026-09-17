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

// Extract personal/spec from Rajbir 543 HTML
const [r543] = await conn.query(
  `SELECT other_activity FROM users WHERE id = 543`,
);
const html = String(r543[0].other_activity || "");
const text = html
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(p|tr|div|li|h\d)>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();
console.log("Rajbir text preview:\n", text.slice(0, 1500));
const specMatch = text.match(
  /(?:specialization|research interest|area of work|discipline)[:\s]+([^|]{5,150})/i,
);
console.log("specMatch", specMatch && specMatch[1]);

// Oil seeds - any user with oilseed in profile linked to dept 87 or name ramesh+oil
const [oilUsers] = await conn.query(
  `SELECT u.id, u.first_name, u.last_name, u.email, u.designation, u.specialization,
          CHAR_LENGTH(IFNULL(u.other_activity,'')) other_len
   FROM hau_user_departments ud
   JOIN users u ON u.id = ud.user_id
   WHERE ud.department_id = 87
   ORDER BY other_len DESC`,
);
console.log("\nAll oilseeds dept users:", oilUsers);

const [rameshOil] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, specialization,
          CHAR_LENGTH(IFNULL(other_activity,'')) other_len
   FROM users
   WHERE (first_name LIKE '%Ramesh%' AND (first_name LIKE '%Goyal%' OR last_name LIKE '%Goyal%'))
      OR email LIKE '%oilseed%'
   ORDER BY other_len DESC`,
);
console.log("\nRamesh Goyal / oilseed emails:", rameshOil);

// Somveer - also check if there's a forages-specific profile
const [som] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, specialization,
          CHAR_LENGTH(IFNULL(other_activity,'')) other_len
   FROM users WHERE first_name LIKE '%Somveer%' OR last_name LIKE '%Nimbal%' OR email LIKE '%nimbal%'`,
);
console.log("\nSomveer/Nimbal all:", som);

await conn.end();
