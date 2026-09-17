import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const conn = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Admin@123",
  database: "hau_db",
});

const [rows] = await conn.query(
  `SELECT id, page_slug, page_title, content_type, file, page_college, page_parent,
          CHAR_LENGTH(IFNULL(page_content,'')) AS len,
          LEFT(IFNULL(page_content,''), 2500) AS preview
   FROM hau_cms
   WHERE page_slug LIKE '%degree%'
      OR page_title LIKE '%degree%'
      OR page_slug LIKE '%programme%'
      OR page_title LIKE '%programme%'
      OR page_slug LIKE '%program%'
   ORDER BY len DESC`,
);
console.log("=== LEGACY CMS ===");
console.log(JSON.stringify(rows, null, 2));

for (const slug of ["degree-programmes", "college-wise-degree-programmes"]) {
  for (const college of [0, 1, 25]) {
    try {
      const url = `https://hau.ac.in/page-data/${slug}/${college}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      const text = await r.text();
      console.log(`\n=== API ${url} status=${r.status} len=${text.length} ===`);
      console.log(text.slice(0, 2000));
    } catch (e) {
      console.log(`API fail ${slug}/${college}:`, e.message);
    }
  }
}

await conn.end();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await sb
  .from("ccshau_pages")
  .select(
    "id, slug, title_en, status, content_type, CHAR_LENGTH(content_en) as len, left(content_en, 1500) as preview, layout_config, parent_id, college_id",
  )
  .or(
    "slug.ilike.%degree%,title_en.ilike.%degree%,slug.ilike.%programme%",
  );

console.log("\n=== NEW PAGES ===");
if (error) console.error(error);
else console.log(JSON.stringify(data, null, 2));
