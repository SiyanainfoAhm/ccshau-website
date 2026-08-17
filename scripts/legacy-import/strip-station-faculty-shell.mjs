/**
 * Strip empty legacy faculty table (# / Image / Name / Designation / …)
 * left in research-station About HTML from live scrape.
 *
 * Usage:
 *   node strip-station-faculty-shell.mjs --dry-run
 *   node strip-station-faculty-shell.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
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

function stripLegacyFacultyShell(html) {
  let out = String(html || "");
  const markers = [
    /id=["']college-fac-list["']/i,
    /<th[^>]*>\s*Image\s*<\/th>/i,
    /<th[^>]*>\s*Designation\s*<\/th>/i,
  ];
  let cutAt = -1;
  for (const marker of markers) {
    const m = out.search(marker);
    if (m >= 0) cutAt = cutAt < 0 ? m : Math.min(cutAt, m);
  }
  if (cutAt >= 0) {
    const tableBefore = out.lastIndexOf("<table", cutAt);
    if (tableBefore >= 0) out = out.slice(0, tableBefore);
  }
  return out
    .replace(
      /<div\b[^>]*id=["']college-facutly-biography["'][^>]*>[\s\S]*?<\/div>\s*/gi,
      "",
    )
    .replace(
      /<div\b[^>]*id=["']college-faculty-biography["'][^>]*>[\s\S]*?<\/div>\s*/gi,
      "",
    )
    .replace(/<div\b[^>]*class=["'][^"']*\bhistory\b[^"']*["'][^>]*>[\s\S]*$/i, "")
    .replace(/<div\b[^>]*class=["'][^"']*switch-menu[^"']*["'][^>]*>[\s\S]*$/i, "")
    .trim();
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: pages, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en")
    .or(
      "content_en.ilike.%college-fac-list%,content_en.ilike.%<th>Image</th>%,content_en.ilike.%Designation</th>%",
    );
  if (error) throw new Error(error.message);

  const updates = [];
  for (const page of pages || []) {
    const before = page.content_en || "";
    if (!/college-fac-list|<th[^>]*>\s*Image\s*<\/th>/i.test(before)) continue;
    const after = stripLegacyFacultyShell(before);
    if (after === before) continue;
    updates.push({
      id: page.id,
      slug: page.slug,
      title: page.title_en,
      before: before.length,
      after: after.length,
      content_en: after,
    });
  }

  console.log(CONFIRM ? "apply" : "dry-run", `${updates.length} pages`);
  for (const row of updates) {
    console.log(`  ${row.slug}: ${row.before} → ${row.after} chars`);
    if (CONFIRM) {
      const { error: updErr } = await supabase
        .from("ccshau_pages")
        .update({ content_en: row.content_en })
        .eq("id", row.id);
      if (updErr) throw new Error(`${row.slug}: ${updErr.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
