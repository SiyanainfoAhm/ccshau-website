/**
 * Hide Home | Departments | Gallery | Contact Us on KVK microsites.
 *
 * Usage:
 *   node hide-kvk-college-top-menu.mjs --dry-run
 *   node hide-kvk-college-top-menu.mjs --confirm
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
    .select("id, slug, layout_config")
    .like("slug", "krishi-vigyan-kendra-%");
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const summary = {
    mode: CONFIRM ? "apply" : "dry-run",
    matched: rows.length,
    updated: 0,
    slugs: rows.map((row) => ({
      slug: row.slug,
      collegeTopMenu: row.layout_config?.collegeTopMenu ?? null,
    })),
  };

  if (CONFIRM) {
    for (const row of rows) {
      const next = {
        ...(row.layout_config && typeof row.layout_config === "object"
          ? row.layout_config
          : {}),
        collegeTopMenu: false,
      };
      const { error: updateErr } = await supabase
        .from("ccshau_pages")
        .update({ layout_config: next })
        .eq("id", row.id);
      if (updateErr) throw new Error(`${row.slug}: ${updateErr.message}`);
      summary.updated += 1;
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "hide-kvk-college-top-menu.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`${summary.mode}: ${rows.length} KVK pages`);
  for (const item of summary.slugs) {
    console.log(`  ${item.slug} collegeTopMenu=${item.collegeTopMenu}`);
  }
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
