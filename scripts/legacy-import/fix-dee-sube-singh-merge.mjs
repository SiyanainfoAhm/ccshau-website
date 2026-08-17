/**
 * Merge duplicate Dr. Sube Singh people into one profile (adp@hau.ac.in).
 * Keep legacy-user-1120; reassign dee-directorate placement; retire legacy-user-617 person.
 *
 * Usage:
 *   node fix-dee-sube-singh-merge.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

const KEEP_PERSON_ID = "488fc7ff-6180-448e-8d6b-1678b5799409";
const REMOVE_PERSON_ID = "c199c8cc-242b-4090-98c2-1bfeef83171b";
const CANONICAL_EMAIL = "adp@hau.ac.in";
const DIRECTORATE_STAFF_ID = "b7db9062-658e-43ae-a2df-4699d4bcf44d";

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

  const { data: people, error } = await sb
    .from("ccshau_faculty_people")
    .select("id, name_en, email, global_slug, legacy_user_id, is_active")
    .in("id", [KEEP_PERSON_ID, REMOVE_PERSON_ID]);
  if (error) throw new Error(error.message);

  const { data: assignments, error: aErr } = await sb
    .from("ccshau_faculty_assignments")
    .select("id, person_id, page_id, designation_en, source_staff_id, page:page_id(slug)")
    .in("person_id", [KEEP_PERSON_ID, REMOVE_PERSON_ID]);
  if (aErr) throw new Error(aErr.message);

  console.log(
    JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", people, assignments }, null, 2),
  );

  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  const { error: moveErr } = await sb
    .from("ccshau_faculty_assignments")
    .update({ person_id: KEEP_PERSON_ID })
    .eq("person_id", REMOVE_PERSON_ID);
  if (moveErr) throw new Error(moveErr.message);

  const { error: emailErr } = await sb
    .from("ccshau_faculty_people")
    .update({ email: CANONICAL_EMAIL, is_active: true })
    .eq("id", KEEP_PERSON_ID);
  if (emailErr) throw new Error(emailErr.message);

  const { error: retireErr } = await sb
    .from("ccshau_faculty_people")
    .update({ is_active: false })
    .eq("id", REMOVE_PERSON_ID);
  if (retireErr) throw new Error(retireErr.message);

  const { error: staffErr } = await sb
    .from("ccshau_page_staff")
    .update({ email: CANONICAL_EMAIL })
    .eq("id", DIRECTORATE_STAFF_ID);
  if (staffErr) throw new Error(staffErr.message);

  console.log("Merged Dr. Sube Singh to adp@hau.ac.in.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
