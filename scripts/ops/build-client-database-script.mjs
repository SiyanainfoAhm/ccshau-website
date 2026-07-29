/**
 * Builds client handover SQL from supabase/migrations (chronological).
 * Run: node scripts/ops/build-client-database-script.mjs
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migDir = join(ROOT, "supabase/migrations");
const outDir = join(ROOT, "Documents/Database_Handover");

const seedish = new Set([
  "20260624140000_demo_content_seed.sql",
  "20260624150000_menus_colleges_banners.sql",
  "20260626120000_events_calendar_seed.sql",
  "20260627140000_college_demo_sections.sql",
  "20260627160000_main_header_menu.sql",
  "20260627170000_menu_label_legacy_casing.sql",
  "20260630210000_homepage_legacy_colleges.sql",
  "20260703140000_college_of_agriculture_hisar_content.sql",
  "20260703150000_college_contact_emails.sql",
  "20260703160000_agricultural_economics_faculty.sql",
  "20260706120000_coaet_college_migration.sql",
  "20260706160000_pg_studies_legacy_content.sql",
  "20260706170000_pg_studies_microsite.sql",
  "20260707130000_directorate_type_b.sql",
]);

mkdirSync(outDir, { recursive: true });

const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const tables = new Set();
const functions = new Set();
const types = new Set();
const triggers = new Set();
const policies = new Set();
const indexes = new Set();

function scan(sql) {
  for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(ccshau_[a-z0-9_]+)/gi)) {
    tables.add(m[1].toLowerCase());
  }
  for (const m of sql.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(ccshau_[a-z0-9_]+)/gi)) {
    functions.add(m[1].toLowerCase());
  }
  for (const m of sql.matchAll(/CREATE\s+TYPE\s+(ccshau_[a-z0-9_]+)/gi)) {
    types.add(m[1].toLowerCase());
  }
  for (const m of sql.matchAll(/CREATE\s+TRIGGER\s+(ccshau_[a-z0-9_]+)/gi)) {
    triggers.add(m[1].toLowerCase());
  }
  for (const m of sql.matchAll(/CREATE\s+POLICY\s+(ccshau_[a-z0-9_]+)/gi)) {
    policies.add(m[1].toLowerCase());
  }
  for (const m of sql.matchAll(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(ccshau_[a-z0-9_]+)/gi,
  )) {
    indexes.add(m[1].toLowerCase());
  }
}

const today = new Date().toISOString().slice(0, 10);

function makeHeader(title, note) {
  return `-- =============================================================================
-- CCSHAU Website CMS — ${title}
-- =============================================================================
-- Generated: ${today}
-- Source: supabase/migrations/*.sql (chronological)
-- Naming: all application objects use ccshau_ prefix
--
-- PREREQUISITES (Supabase Cloud project — not plain PostgreSQL alone):
--   1. Supabase project with Auth + Storage enabled
--   2. Extensions: pgcrypto/uuid-ossp as provided by Supabase; vault + pg_cron optional
--   3. Run as postgres / SQL Editor (Dashboard) or psql with database URL
--
-- HOW TO APPLY:
--   A) Supabase Dashboard → SQL Editor → run this file (split into batches if needed)
--   B) psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this-file>
--   C) Preferred for new envs: npx supabase link && npx supabase db push
--
-- AFTER APPLY:
--   1. Create first Auth user, then ccshau_profiles + ccshau_user_roles (super_admin)
--   2. Confirm storage buckets: ccshau-public, ccshau-private, ccshau-media
--   3. Optional demo content: 02_ccshau_demo_seed_data.sql
--   4. Configure Vault secret for Google Translate if auto-translate is used
--
-- ${note}
-- =============================================================================

SET client_min_messages TO WARNING;

`;
}

const fullParts = [
  makeHeader(
    "FINAL DATABASE SCRIPT (Client Handover)",
    "NOTE: Includes ALL migrations (schema + baseline + demo/college seed content).",
  ),
];
const schemaParts = [
  makeHeader(
    "SCHEMA + BASELINE (no heavy demo content)",
    "NOTE: Demo/college seed migrations are excluded — apply 02_ccshau_demo_seed_data.sql if needed.",
  ),
];
const seedParts = [
  `-- CCSHAU optional demo / college seed data
-- Apply AFTER schema/full script
-- Generated: ${today}

`,
];

const included = [];
const seedIncluded = [];

for (const file of files) {
  const sql = readFileSync(join(migDir, file), "utf8");
  scan(sql);
  const block = `
-- #############################################################################
-- Migration: ${file}
-- #############################################################################

${sql.trim()}
`;
  fullParts.push(block);
  included.push(file);
  if (seedish.has(file)) {
    seedParts.push(block);
    seedIncluded.push(file);
  } else {
    schemaParts.push(block);
  }
}

const fullPath = join(outDir, "01_ccshau_full_database.sql");
const schemaPath = join(outDir, "01a_ccshau_schema_and_baseline.sql");
const seedPath = join(outDir, "02_ccshau_demo_seed_data.sql");

writeFileSync(fullPath, fullParts.join("\n"));
writeFileSync(schemaPath, schemaParts.join("\n"));
writeFileSync(seedPath, seedParts.join("\n"));

function mdList(set) {
  return [...set].sort().map((t) => `- \`${t}\``).join("\n") || "_none_";
}

const inv = `# CCSHAU Database Schema Inventory

Generated: ${today}  
Source migrations: **${files.length}**

## Summary

| Object | Count |
|--------|------:|
| Tables | ${tables.size} |
| Custom types / enums | ${types.size} |
| Functions | ${functions.size} |
| Triggers | ${triggers.size} |
| Indexes | ${indexes.size} |
| RLS policies | ${policies.size} |

## Tables (${tables.size})

${mdList(tables)}

## Enum / custom types (${types.size})

${mdList(types)}

## Functions (${functions.size})

${mdList(functions)}

## Triggers (${triggers.size})

${mdList(triggers)}

## Indexes (${indexes.size})

${mdList(indexes)}

## RLS policies (${policies.size})

${mdList(policies)}

## Migrations in full script (${included.length})

${included.map((f) => `1. \`${f}\``).join("\n")}

## Migrations also packaged as demo seed (${seedIncluded.length})

${seedIncluded.map((f) => `1. \`${f}\``).join("\n")}

## Security locks (Phase A)

Included via \`20260723140000_security_phase_a_locks.sql\`:

- \`ccshau_download_versions\` — RLS enabled; \`anon\` / \`authenticated\` have no table grants; \`service_role\` only
- Sensitive RPCs (\`ccshau_get_vault_secret\`, \`ccshau_write_audit_log\`, \`ccshau_archive_expired_*\`, \`ccshau_generate_ticket_number\`) — \`EXECUTE\` for \`service_role\` only

Verify after apply with \`03_verify_schema.sql\` (security section at bottom).
`;

writeFileSync(join(outDir, "SCHEMA_INVENTORY.md"), inv);

console.log(
  JSON.stringify(
    {
      migrations: files.length,
      tables: tables.size,
      functions: functions.size,
      triggers: triggers.size,
      policies: policies.size,
      indexes: indexes.size,
      types: types.size,
      fullKB: Math.round(statSync(fullPath).size / 1024),
      schemaKB: Math.round(statSync(schemaPath).size / 1024),
      seedKB: Math.round(statSync(seedPath).size / 1024),
      outDir,
    },
    null,
    2,
  ),
);
