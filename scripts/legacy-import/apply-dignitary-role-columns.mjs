/**
 * Rename ccshau_homepage_dignitaries.title_* → role_* on the live DB.
 *
 * Usage:
 *   node apply-dignitary-role-columns.mjs --confirm
 *
 * Requires DATABASE_URL or SUPABASE_DB_URL (postgres connection string).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

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

const SQL = readFileSync(
  join(ROOT, "supabase/migrations/20260821120000_homepage_dignitaries_role_columns.sql"),
  "utf8",
);

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!databaseUrl) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_URL to apply this migration.",
    );
  }
  if (!CONFIRM) {
    console.log("dry-run: would apply dignitary role column rename");
    console.log(SQL.slice(0, 200) + "…");
    return;
  }

  let Client;
  try {
    Client = createRequire(join(ROOT, "apps/web/package.json"))("pg").Client;
  } catch {
    Client = createRequire(join(ROOT, "package.json"))("pg").Client;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(SQL);
    const { rows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ccshau_homepage_dignitaries'
      ORDER BY ordinal_position
    `);
    console.log(
      "ok columns:",
      rows.map((r) => r.column_name).join(", "),
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
