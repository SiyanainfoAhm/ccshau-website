import mysql from "mysql2/promise";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [rows] = await conn.query(
  `SELECT id, first_name, last_name, email, profile_image
   FROM users WHERE id IN (619, 1049) OR (status = '1' AND FIND_IN_SET('26', REPLACE(college_id, ' ', '')))`,
);
console.log(JSON.stringify(rows, null, 2));
await conn.end();

for (const row of rows) {
  if (!String(row.first_name || "").includes("Narender")) continue;
  const raw = row.profile_image;
  const urls = [
    raw?.startsWith("http") ? raw : null,
    raw ? `https://hau.ac.in/storage/app/${String(raw).replace(/^\/+/, "")}` : null,
    raw ? `https://hau.ac.in/storage/app/${String(raw).replace(/^\/+/, "").replace(/^uploads\//, "uploads/")}` : null,
    raw ? `https://hau.ac.in/storage/app/${String(raw).replace(/^\/+/, "")}` : null,
  ].filter(Boolean);
  for (const u of [...new Set(urls)]) {
    const res = await fetch(u, { method: "HEAD" });
    console.log(row.id, res.status, u);
  }
}
