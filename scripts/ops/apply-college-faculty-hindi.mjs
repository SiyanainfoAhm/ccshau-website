#!/usr/bin/env node
/**
 * Apply Cursor/manual Hindi translations from JSON to ccshau_page_staff.
 *
 * JSON format (Documents/hindi-faculty/*-translated.json):
 * {
 *   "staff": [
 *     { "id": "uuid", "translations": { "name_hi": "...", "designation_hi": "...", "detail_content_hi": "..." } }
 *   ]
 * }
 *
 * Usage:
 *   node scripts/ops/apply-college-faculty-hindi.mjs Documents/hindi-faculty/college-of-agriculture-hisar-hisar-agricultural-extension-education-translated.json
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node apply-college-faculty-hindi.mjs <translated.json>");
  process.exit(1);
}

const absPath = inputPath.startsWith("/") || /^[A-Za-z]:/.test(inputPath)
  ? inputPath
  : join(ROOT, inputPath);

if (!existsSync(absPath)) {
  console.error(`File not found: ${absPath}`);
  process.exit(1);
}

const ALLOWED = new Set([
  "name_hi",
  "designation_hi",
  "specialization_hi",
  "qualification_hi",
  "experience_hi",
  "detail_content_hi",
]);

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

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const data = JSON.parse(readFileSync(absPath, "utf8"));
  let updated = 0;
  let failed = 0;

  for (const row of data.staff ?? []) {
    const patch = {};
    for (const [key, value] of Object.entries(row.translations ?? {})) {
      if (!ALLOWED.has(key)) continue;
      if (typeof value === "string" && value.trim()) patch[key] = value.trim();
    }
    if (!Object.keys(patch).length) continue;

    const { error } = await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
    if (error) {
      console.error(`FAIL ${row.id}: ${error.message}`);
      failed += 1;
    } else {
      console.log(`✓ ${row.name_en ?? row.id}`);
      updated += 1;
    }
  }

  console.log(`\nUpdated: ${updated}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
