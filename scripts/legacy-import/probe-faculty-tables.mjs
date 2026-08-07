import mysql from "mysql2/promise";
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
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
load(join(ROOT, "apps/web/.env.local"));

const c = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  user: process.env.LEGACY_MYSQL_USER || "root",
  password: process.env.LEGACY_MYSQL_PASSWORD || "",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [cols] = await c.query("DESCRIBE users");
const [sample] = await c.query(
  `SELECT * FROM users WHERE first_name LIKE '%Dharm%' OR last_name LIKE '%Malik%' OR CONCAT(first_name,' ',last_name) LIKE '%Malik%' LIMIT 1`,
);

// related tables
const [tables] = await c.query("SHOW TABLES");
const names = tables.map((r) => Object.values(r)[0]);
const related = names.filter((n) =>
  /user|faculty|staff|profile|teacher|college_user/i.test(n),
);

console.log(
  JSON.stringify(
    {
      relatedTables: related,
      usersColumns: cols.map((x) => `${x.Field} (${x.Type})`),
      sampleKeys: sample[0] ? Object.keys(sample[0]) : [],
      sample: sample[0]
        ? Object.fromEntries(
            Object.entries(sample[0]).map(([k, v]) => [
              k,
              typeof v === "string" && v.length > 120 ? v.slice(0, 120) + "…" : v,
            ]),
          )
        : null,
    },
    null,
    2,
  ),
);
await c.end();
