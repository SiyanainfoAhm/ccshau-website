/**
 * Strip leftover empty faculty table (# header only) from KVK about HTML.
 *
 * Usage:
 *   node strip-kvk-faculty-shell.mjs --dry-run
 *   node strip-kvk-faculty-shell.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRM = process.argv.includes("--confirm");

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

function stripLegacyFacultyShell(html) {
  return String(html || "")
    .replace(/<div\b[^>]*id=["']college-faculty["'][^>]*>[\s\S]*$/i, "")
    .replace(/<table\b[^>]*id=["']faculty-detail["'][^>]*>[\s\S]*?<\/table>/gi, "")
    .replace(/<table\b[^>]*>[\s\S]*?id=["']college-fac-list["'][\s\S]*?<\/table>/gi, "")
    .replace(
      /<div\b[^>]*id=["']college-facutly-biography["'][^>]*>[\s\S]*?<\/div>\s*/gi,
      "",
    )
    .replace(
      /<div\b[^>]*id=["']college-faculty-biography["'][^>]*>[\s\S]*?<\/div>\s*/gi,
      "",
    )
    .trim();
}

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  if (!DRY_RUN && !CONFIRM) {
    console.error("Pass --dry-run or --confirm");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, content_en")
    .like("slug", "krishi-vigyan-kendra-%");
  if (error) throw new Error(error.message);

  const summary = { mode: CONFIRM ? "apply" : "dry-run", patched: [], skipped: [] };

  for (const row of data ?? []) {
    const next = stripLegacyFacultyShell(row.content_en);
    if (next === (row.content_en || "").trim()) {
      summary.skipped.push(row.slug);
      continue;
    }
    summary.patched.push({
      slug: row.slug,
      before: (row.content_en || "").length,
      after: next.length,
    });
    if (CONFIRM) {
      const { error: updateErr } = await supabase
        .from("ccshau_pages")
        .update({ content_en: next })
        .eq("id", row.id);
      if (updateErr) throw new Error(`${row.slug}: ${updateErr.message}`);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "strip-kvk-faculty-shell.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`${summary.mode}: patched ${summary.patched.length}, skipped ${summary.skipped.length}`);
  for (const item of summary.patched) {
    console.log(`  ${item.slug} ${item.before} → ${item.after}`);
  }
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
