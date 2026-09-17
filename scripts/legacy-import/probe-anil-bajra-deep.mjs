/**
 * Deep search legacy for Bajra / Anil Kumar profile content.
 */
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

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [cols] = await conn.query(`SHOW COLUMNS FROM users`);
console.log(
  "users columns:",
  cols.map((c) => c.Field).join(", "),
);

const [allAnil] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, role_id, status,
          CHAR_LENGTH(IFNULL(specialization,'')) spec_len,
          CHAR_LENGTH(IFNULL(other_activity,'')) other_len,
          CHAR_LENGTH(IFNULL(qualification,'')) qual_len,
          department_id_bk
   FROM users
   WHERE first_name LIKE '%Anil%' OR CONCAT(IFNULL(first_name,''),' ',IFNULL(last_name,'')) LIKE '%Anil%Kumar%'
   ORDER BY id`,
);
console.log("\nAll Anil users:", allAnil);

// Bajra department id
const [bajraDepts] = await conn.query(
  `SELECT id, college_id, department_name FROM hau_college_departments
   WHERE department_name LIKE '%Bajra%' OR department_name LIKE '%Pearl millet%'`,
);
console.log("\nBajra depts:", bajraDepts);

for (const d of bajraDepts) {
  const [staff] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, role_id, status,
            CHAR_LENGTH(IFNULL(specialization,'')) spec_len,
            CHAR_LENGTH(IFNULL(other_activity,'')) other_len,
            department_id_bk
     FROM users
     WHERE department_id_bk = ? OR id IN (
       SELECT user_id FROM user_departments WHERE department_id = ?
     )
     ORDER BY role_id, id`,
    [d.id, d.id],
  ).catch(async () => {
    // user_departments may not exist
    const [staff2] = await conn.query(
      `SELECT id, first_name, last_name, email, designation, role_id, status,
              CHAR_LENGTH(IFNULL(specialization,'')) spec_len,
              CHAR_LENGTH(IFNULL(other_activity,'')) other_len,
              department_id_bk
       FROM users WHERE department_id_bk = ? ORDER BY role_id, id`,
      [d.id],
    );
    return [staff2];
  });
  console.log(`\nUsers linked to dept ${d.id}:`, staff);
}

// Full dump of user 663 interesting fields
const [u663] = await conn.query(`SELECT * FROM users WHERE id = 663`);
const row = u663[0];
if (row) {
  const interesting = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null || v === "") continue;
    const s = String(v);
    if (s.length > 200) interesting[k] = `[len=${s.length}] ${s.slice(0, 150)}…`;
    else interesting[k] = v;
  }
  console.log("\nUser 663 non-empty fields:", interesting);
}

// Search tables mentioning anil / bajra faculty profile
const [tables] = await conn.query(`SHOW TABLES`);
const tableNames = tables.map((t) => Object.values(t)[0]);
const profileish = tableNames.filter((n) =>
  /faculty|staff|profile|user|teacher|scientist/i.test(n),
);
console.log("\nProfile-ish tables:", profileish);

// Check if there's a separate profile / bio table for user 663
for (const t of profileish) {
  try {
    const [c] = await conn.query(`SHOW COLUMNS FROM \`${t}\``);
    const fields = c.map((x) => x.Field);
    const userCol = fields.find((f) =>
      /^(user_id|userid|uid|id)$/i.test(f),
    );
    if (!userCol && !fields.some((f) => /user/i.test(f))) continue;
    const uc = fields.find((f) => /user_id|userid/i.test(f));
    if (!uc) continue;
    const [hits] = await conn.query(
      `SELECT * FROM \`${t}\` WHERE \`${uc}\` = 663 LIMIT 3`,
    );
    if (hits.length) {
      console.log(`\nHits in ${t}:`, hits.map((h) => {
        const o = {};
        for (const [k, v] of Object.entries(h)) {
          if (v == null || v === "") continue;
          const s = String(v);
          o[k] = s.length > 120 ? `[len=${s.length}] ${s.slice(0, 100)}…` : v;
        }
        return o;
      }));
    }
  } catch {
    /* skip */
  }
}

// CMS / menu content mentioning Anil Kumar under bajra?
const [cmsHits] = await conn.query(
  `SELECT id, title, CHAR_LENGTH(IFNULL(page_content,'')) content_len, file
   FROM hau_cms
   WHERE page_content LIKE '%Anil Kumar%' OR title LIKE '%Anil Kumar%'
   LIMIT 20`,
).catch(() => [[]]);
console.log("\nCMS hits for Anil Kumar:", cmsHits);

await conn.end();
