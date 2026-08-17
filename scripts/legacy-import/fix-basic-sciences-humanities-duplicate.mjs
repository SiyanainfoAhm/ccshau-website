/**
 * Deactivate duplicate CBSH staff on legacy basic-sciences-humanities microsite.
 * Real profiles live on college-basic-sciences-humanities (already migrated).
 *
 * Usage:
 *   node fix-basic-sciences-humanities-duplicate.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const DUPLICATE_ROOT = "92fa03c2-bea6-47e9-bc97-5d74838fd938";

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
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: rows, error } = await sb
    .from("ccshau_page_staff")
    .select("id, name_en, staff_slug, page_id, is_active, page:page_id(slug)")
    .eq("is_active", true)
    .in(
      "page_id",
      (
        await sb
          .from("ccshau_pages")
          .select("id")
          .eq("college_root_id", DUPLICATE_ROOT)
      ).data?.map((p) => p.id) ?? [],
    );
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", rows }, null, 2));
  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) {
    console.log("No active staff to deactivate.");
    return;
  }

  const { error: updErr } = await sb
    .from("ccshau_page_staff")
    .update({ is_active: false })
    .in("id", ids);
  if (updErr) throw new Error(updErr.message);

  console.log(`Deactivated ${ids.length} duplicate staff row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
