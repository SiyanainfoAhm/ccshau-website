#!/usr/bin/env node
/**
 * Verify Supabase schema required for Hindi Phase 2 audits/backfill.
 *
 * Usage: node scripts/ops/check-hindi-migrations.mjs
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadEnvFile(path) {
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
  throw new Error("Install @supabase/supabase-js before running this script.");
}

const { createClient } = loadSupabaseJs();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHECKS = [
  {
    label: "ccshau_page_staff table",
    table: "ccshau_page_staff",
    columns: ["name_en", "name_hi"],
    migration: "20260901100000_phase2_schema_alignment.sql",
  },
  {
    label: "homepage dignitaries role_en",
    table: "ccshau_homepage_dignitaries",
    columns: ["role_en", "role_hi"],
    migration: "20260901100000_phase2_schema_alignment.sql",
  },
  {
    label: "homepage CTA title_en",
    table: "ccshau_homepage_cta",
    columns: ["title_en", "title_hi", "button_en"],
    migration: "20260901100000_phase2_schema_alignment.sql",
  },
];

async function checkOne(check) {
  const { error } = await supabase.from(check.table).select(check.columns.join(",")).limit(1);
  if (error) {
    return { ok: false, error: error.message, migration: check.migration };
  }
  return { ok: true };
}

async function main() {
  console.log(`Supabase: ${url}\n`);
  let allOk = true;

  for (const check of CHECKS) {
    const result = await checkOne(check);
    if (result.ok) {
      console.log(`✓ ${check.label}`);
    } else {
      allOk = false;
      console.log(`✗ ${check.label}`);
      console.log(`  Error: ${result.error}`);
      console.log(`  Fix: apply migration ${check.migration} (npx supabase db push)`);
    }
  }

  console.log("");
  if (allOk) {
    console.log("All Phase 2 schema checks passed.");
  } else {
    console.log("Some migrations are missing on the remote database.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
