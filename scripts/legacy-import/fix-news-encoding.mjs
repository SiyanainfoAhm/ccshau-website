/**
 * Restore news titles that were imported as "?" because MySQL UTF-8 was misread.
 *
 * Usage:
 *   node fix-news-encoding.mjs --dry-run
 *   node fix-news-encoding.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

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
loadEnvFile(join(ROOT, ".env.local"));

function loadFromWeb(name) {
  return createRequire(join(ROOT, "apps/web/package.json"))(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");

function legacyIdFromSlug(slug) {
  const match = String(slug || "").match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

function looksBroken(title) {
  const s = String(title || "");
  const q = (s.match(/\?/g) || []).length;
  return q >= 3;
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: newsRows, error } = await supabase
    .from("ccshau_news")
    .select("id, slug, title_en, title_hi")
    .like("title_en", "%?%");
  if (error) throw new Error(error.message);

  const broken = (newsRows || []).filter((row) => looksBroken(row.title_en));
  const ids = [...new Set(broken.map((row) => legacyIdFromSlug(row.slug)).filter(Boolean))];
  if (!ids.length) {
    console.log("No broken news titles found");
    return;
  }

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
    charset: "utf8mb4",
  });

  const [legacyRows] = await conn.query(
    "SELECT id, notification_name FROM hau_notifications WHERE id IN (?)",
    [ids],
  );
  await conn.end();
  const byId = new Map(legacyRows.map((row) => [Number(row.id), String(row.notification_name || "").trim()]));

  const updates = [];
  for (const row of broken) {
    const legacyId = legacyIdFromSlug(row.slug);
    const restored = legacyId ? byId.get(legacyId) : null;
    if (!restored || looksBroken(restored) || restored === row.title_en) continue;
    const patch = { title_en: restored };
    if (hasDevanagari(restored) && !row.title_hi) patch.title_hi = restored;
    updates.push({ id: row.id, slug: row.slug, from: row.title_en, to: restored, patch });
  }

  console.log(CONFIRM ? "apply" : "dry-run", "news encoding", updates.length);
  for (const item of updates.slice(0, 12)) {
    console.log(item.slug, "->", item.to.slice(0, 80));
  }

  if (CONFIRM) {
    for (const item of updates) {
      const { error: uErr } = await supabase.from("ccshau_news").update(item.patch).eq("id", item.id);
      if (uErr) throw new Error(`${item.slug}: ${uErr.message}`);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "fix-news-encoding.json");
  writeFileSync(
    out,
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        count: updates.length,
        slugs: updates.map((u) => ({ slug: u.slug, title: u.to })),
      },
      null,
      2,
    ),
  );
  console.log("Report:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
