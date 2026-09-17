/**
 * Try extract specialization for Pahuja from legacy detail HTML / related rows.
 */
import { createRequire } from "node:module";
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
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [rows] = await conn.query(
  `SELECT id, first_name, email, specialization, qualification, other_activity
   FROM users WHERE id IN (274, 664, 771)`,
);

for (const r of rows) {
  const html = String(r.other_activity || "");
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  console.log("\n=== user", r.id, r.email);
  console.log("spec field:", r.specialization);
  console.log("qual field:", r.qualification);
  console.log("text len:", text.length);
  // Find specialization-like phrases
  const patterns = [
    /specialization[:\s]+([^.]{5,120})/i,
    /research interest[\/\s]*specialization[:\s]+([^.]{5,120})/i,
    /area of specialization[:\s]+([^.]{5,120})/i,
    /field of specialization[:\s]+([^.]{5,120})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) console.log("MATCH", p, "=>", m[1].trim());
  }
  // Show first 800 chars of text
  console.log("preview:", text.slice(0, 800));
}

// Is Pahuja already staff on GPB page with specialization?
const { data: staff274 } = await sb
  .from("ccshau_page_staff")
  .select("id, page_id, name_en, member_type, staff_slug, specialization_en, detail_content_en, qualification_en")
  .eq("staff_slug", "legacy-user-274");
console.log("\nSupabase legacy-user-274:", staff274);

const { data: gpb } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en")
  .ilike("slug", "%genetics%")
  .eq("status", "published");
console.log("GPB-ish pages:", gpb?.filter((p) => /hisar|genetics|plant.breeding/i.test(p.slug)));

await conn.end();
