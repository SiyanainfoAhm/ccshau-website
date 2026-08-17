/**
 * Hide Comptroller Office admin staff wrongly mapped onto CFS faculty pages.
 * Kamlesh Khurana (FPT) + Sh. Rajeev (AEM) — not on live hau.ac.in faculty tables.
 *
 * Usage: node fix-cfs-comptroller-extras.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

const STAFF_IDS = [
  "b4e4cde7-ce97-4347-9304-98829fe7b302", // Kamlesh Khurana — FPT
  "8b823f3c-4878-4fa8-af9c-8a8f8c8078e5", // Sh. Rajeev — AEM
  "65d347ff-4c26-4886-be9d-416b64e943e9", // Harish Chander — FRM
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

  const { data: rows, error } = await sb
    .from("ccshau_page_staff")
    .select("id, name_en, designation_en, staff_slug, is_active, page:page_id(slug)")
    .in("id", STAFF_IDS);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", rows }, null, 2));
  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to hide these rows.");
    return;
  }

  const { error: staffErr } = await sb
    .from("ccshau_page_staff")
    .update({ is_active: false })
    .in("id", STAFF_IDS);
  if (staffErr) throw new Error(staffErr.message);

  const { error: asgErr } = await sb
    .from("ccshau_faculty_assignments")
    .update({ is_active: false })
    .in("source_staff_id", STAFF_IDS);
  if (asgErr) throw new Error(asgErr.message);

  console.log("Hid Comptroller extras from CFS faculty pages.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
