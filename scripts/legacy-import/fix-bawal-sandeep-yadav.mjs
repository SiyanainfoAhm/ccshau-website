/**
 * Deactivate empty same-page Dr. Sandeep Yadav shell on Bawal Agriculture College.
 * Keep legacy-user-1096 (full details); deactivate legacy-user-1151.
 *
 * Usage:
 *   node fix-bawal-sandeep-yadav.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const KEEP_ID = "e7bbdac0-af8c-4353-95b2-2f2839daa318";
const DUPE_ID = "5fe7af6b-dc46-4662-bfff-b2cb60f1e387";

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
    .select("id, name_en, email, staff_slug, is_active")
    .in("id", [KEEP_ID, DUPE_ID]);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", rows }, null, 2));
  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  const { error: updErr } = await sb
    .from("ccshau_page_staff")
    .update({ is_active: false })
    .eq("id", DUPE_ID)
    .eq("is_active", true);
  if (updErr) throw new Error(updErr.message);

  console.log("Deactivated empty Sandeep Yadav shell.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
