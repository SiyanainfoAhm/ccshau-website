/**
 * DSW pre-backfill fixes:
 * - Dr. M.L.Khichar is DSW Director listed on section pages; not page HOD (constraint conflict).
 * - Dr. Sushil Kumar Lega duplicate same-page row (legacy-user-763 vs 784).
 *
 * Usage:
 *   node fix-dsw-pre-backfill.mjs
 *   node fix-dsw-pre-backfill.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

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

const KHICHAR_IDS = [
  "42b24545-fe43-4fbc-9106-910b8b8e4384",
  "f8cd7346-4f6c-4f36-86a2-609faf500579",
];
const SUSHIL_DUPE_ID = "abab8dfa-f2ac-46b4-ada7-67bfbe5fd5d9";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: rows, error } = await sb
    .from("ccshau_page_staff")
    .select("id, name_en, designation_en, member_type, staff_slug, is_active")
    .in("id", [...KHICHAR_IDS, SUSHIL_DUPE_ID]);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", rows }, null, 2));

  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  for (const id of KHICHAR_IDS) {
    const { error: updErr } = await sb
      .from("ccshau_page_staff")
      .update({ member_type: "faculty" })
      .eq("id", id)
      .eq("member_type", "hod");
    if (updErr) throw new Error(updErr.message);
  }

  const { error: softErr } = await sb
    .from("ccshau_page_staff")
    .update({ is_active: false })
    .eq("id", SUSHIL_DUPE_ID);
  if (softErr) throw new Error(softErr.message);

  console.log("Applied DSW pre-backfill fixes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
