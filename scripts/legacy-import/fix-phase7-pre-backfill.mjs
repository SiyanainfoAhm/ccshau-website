/**
 * Phase 7 pre-backfill fixes (EO-cum-CE + HRM).
 *
 * Usage: node fix-phase7-pre-backfill.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

const DEMOTE_HOD_TO_FACULTY = [
  "9467c34e-3179-45d3-86d0-d05d39a397ad", // Khichar — Chairman, not page HOD
  "cd9daec3-2b9b-4023-9c43-418042560aa2", // Renu Munjal — Assoc. Director
];

const DEACTIVATE_DUPE_SHELLS = [
  "4959d883-e9a1-4f5e-8d87-40060b338fa1", // Dharambir empty shell
  "f9e0ce49-d9a2-4be7-be88-d8df48577bb2", // Dinesh empty shell
];

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

  const { data: rows } = await sb
    .from("ccshau_page_staff")
    .select("id, name_en, designation_en, member_type, staff_slug, is_active")
    .in("id", [...DEMOTE_HOD_TO_FACULTY, ...DEACTIVATE_DUPE_SHELLS]);

  console.log(JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", rows }, null, 2));
  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  for (const id of DEMOTE_HOD_TO_FACULTY) {
    const { error } = await sb
      .from("ccshau_page_staff")
      .update({ member_type: "faculty" })
      .eq("id", id)
      .eq("member_type", "hod");
    if (error) throw new Error(error.message);
  }

  for (const id of DEACTIVATE_DUPE_SHELLS) {
    const { error } = await sb
      .from("ccshau_page_staff")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  console.log("Applied Phase 7 pre-backfill fixes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
