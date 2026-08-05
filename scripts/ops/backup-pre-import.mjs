#!/usr/bin/env node
/**
 * Pre-import backup of existing live CMS data (read-only).
 * Use before legacy metadata import so you can roll back.
 *
 * Loads env from apps/web/.env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional for full SQL dump:
 *   SUPABASE_DB_PASSWORD  (or DATABASE_URL)
 *   SUPABASE_PROJECT_REF  (default fvveqziyusjgqejowkfp)
 *
 * Usage:
 *   npm run backup:pre-import
 *   node scripts/ops/backup-pre-import.mjs
 *   node scripts/ops/backup-pre-import.mjs --with-storage-files
 *
 * Output: backups/pre-import/<timestamp>/  (gitignored)
 * Does NOT write to the database.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const WITH_STORAGE_FILES = process.argv.includes("--with-storage-files");
const DEFAULT_PROJECT_REF = "fvveqziyusjgqejowkfp";

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

function loadSupabaseJs() {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("@supabase/supabase-js");
    } catch {
      /* try next */
    }
  }
  throw new Error("Install @supabase/supabase-js (apps/web) before running this script.");
}

const { createClient } = loadSupabaseJs();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  (SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split(".")[0] : DEFAULT_PROJECT_REF);

if (!SUPABASE_URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(ROOT, "backups", "pre-import", stamp);
const tablesDir = join(outDir, "tables");
mkdirSync(tablesDir, { recursive: true });

const supabase = createClient(SUPABASE_URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listCcshauTables() {
  // Prefer information_schema via RPC-less REST is not available; use known prefix via SQL edge.
  // Fall back: dump from OpenAPI / hard list from migrations is heavy — use rpc if exists.
  // Service role can query via PostgREST only for exposed tables. Use supabase.from on each
  // discovered name from a lightweight SQL function, or query pg via dump only.
  // Practical approach: read table names from generated types / names.ts constants + probe.
  const namesPath = join(ROOT, "apps/web/src/lib/database/names.ts");
  const src = readFileSync(namesPath, "utf8");
  const tables = new Set();
  for (const m of src.matchAll(/ccshauTable\("([a-z0-9_]+)"\)/g)) {
    tables.add(`ccshau_${m[1]}`);
  }
  // Also include common related tables if declared differently
  for (const m of src.matchAll(/:\s*ccshauTable\("([a-z0-9_]+)"\)/g)) {
    tables.add(`ccshau_${m[1]}`);
  }
  return [...tables].sort();
}

async function dumpTable(table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) {
      return { table, ok: false, error: error.message, rows: 0 };
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  const file = join(tablesDir, `${table}.json`);
  writeFileSync(file, JSON.stringify(rows, null, 2));
  return { table, ok: true, error: null, rows: rows.length, file: `tables/${table}.json` };
}

function trySqlDump() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || "";
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "";
  const sqlPath = join(outDir, "database-dump.sql");

  if (databaseUrl) {
    const r = spawnSync(
      "pg_dump",
      ["--no-owner", "--no-acl", "--format=plain", `--file=${sqlPath}`, databaseUrl],
      { encoding: "utf8" },
    );
    if (r.status === 0) {
      return { ok: true, method: "pg_dump", file: "database-dump.sql", detail: null };
    }
    return {
      ok: false,
      method: "pg_dump",
      file: null,
      detail: (r.stderr || r.stdout || "pg_dump failed").slice(0, 500),
    };
  }

  if (!dbPassword) {
    return {
      ok: false,
      method: "supabase-db-dump",
      file: null,
      detail: "SUPABASE_DB_PASSWORD / DATABASE_URL not set — JSON table dump only.",
    };
  }

  const link = spawnSync(
    "npx",
    ["supabase", "link", "--project-ref", PROJECT_REF, "-p", dbPassword],
    { cwd: ROOT, encoding: "utf8", shell: true },
  );
  if (link.status !== 0) {
    return {
      ok: false,
      method: "supabase-link",
      file: null,
      detail: (link.stderr || link.stdout || "link failed").slice(0, 500),
    };
  }

  const dump = spawnSync(
    "npx",
    ["supabase", "db", "dump", "-f", sqlPath],
    { cwd: ROOT, encoding: "utf8", shell: true },
  );
  if (dump.status === 0) {
    return { ok: true, method: "supabase-db-dump", file: "database-dump.sql", detail: null };
  }
  return {
    ok: false,
    method: "supabase-db-dump",
    file: null,
    detail: (dump.stderr || dump.stdout || "dump failed").slice(0, 500),
  };
}

function runStorageInventory() {
  const args = [join(ROOT, "scripts/ops/backup-storage.mjs")];
  if (WITH_STORAGE_FILES) args.push("--download");
  // backup-storage writes to backups/storage/<date> — copy note into manifest
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
  return {
    ok: r.status === 0,
    detail: (r.stdout || r.stderr || "").slice(-800),
  };
}

async function main() {
  console.log(`Pre-import backup → ${outDir}`);
  console.log("Mode: read-only (no DB writes)");

  const tables = await listCcshauTables();
  const tableResults = [];
  for (const table of tables) {
    process.stdout.write(`  dumping ${table}... `);
    const result = await dumpTable(table);
    tableResults.push(result);
    if (result.ok) console.log(`${result.rows} rows`);
    else console.log(`skip (${result.error})`);
  }

  console.log("Attempting SQL dump (optional)...");
  const sqlDump = trySqlDump();
  if (sqlDump.ok) console.log(`  SQL dump OK (${sqlDump.method})`);
  else console.log(`  SQL dump skipped: ${sqlDump.detail}`);

  console.log("Storage inventory...");
  const storage = runStorageInventory();
  if (storage.ok) console.log("  Storage inventory OK");
  else console.log(`  Storage inventory warning:\n${storage.detail}`);

  const manifest = {
    createdAt: new Date().toISOString(),
    purpose: "Pre-legacy-import rollback snapshot",
    projectRef: PROJECT_REF,
    supabaseUrlHost: new URL(SUPABASE_URL).host,
    writesToDatabase: false,
    outputs: {
      directory: outDir,
      tableJson: tableResults.filter((t) => t.ok),
      tableErrors: tableResults.filter((t) => !t.ok),
      sqlDump,
      storageNote:
        "See backups/storage/<date>/ from backup-storage.mjs (inventory; files only with --with-storage-files)",
    },
    rollback: {
      preferred: [
        "1. If import goes wrong soon after: Supabase Dashboard → Database → Backups → restore the daily backup taken BEFORE import (maintenance window).",
        "2. Or restore JSON snapshots manually / with a restore script into a staging project first.",
        "3. If SQL dump exists (database-dump.sql), restore into a *staging* DB with psql — do not practice on production without approval.",
      ],
      note: "Pro plan keeps ~7 days of daily backups. Take this snapshot immediately before import.",
    },
  };

  writeFileSync(join(outDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(outDir, "README.md"),
    [
      `# Pre-import backup`,
      ``,
      `- Created: ${manifest.createdAt}`,
      `- Project: \`${PROJECT_REF}\``,
      `- Read-only snapshot (no live writes by this script)`,
      ``,
      `## Contents`,
      ``,
      `- \`tables/*.json\` — row snapshots of \`ccshau_*\` tables`,
      `- \`database-dump.sql\` — only if DB password / DATABASE_URL was available`,
      `- \`MANIFEST.json\` — machine-readable summary`,
      ``,
      `## Rollback`,
      ``,
      ...manifest.rollback.preferred.map((l) => `- ${l}`),
      ``,
      `Also rely on Supabase **Database → Backups** (Pro daily backups).`,
      ``,
    ].join("\n"),
  );

  // Convenience pointer
  writeFileSync(
    join(ROOT, "backups", "pre-import", "LATEST.txt"),
    `${stamp}\n${outDir}\n`,
  );

  console.log("\nBackup complete.");
  console.log(`Folder: ${outDir}`);
  console.log(`Tables dumped: ${tableResults.filter((t) => t.ok).length}`);
  console.log(`Tables skipped: ${tableResults.filter((t) => !t.ok).length}`);
}

main().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
