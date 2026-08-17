/**
 * CFS pre-backfill fixes:
 * - Admin staff wrongly marked HOD on dept pages (one-HOD constraint).
 * - Dr. Dalip Kumar Bishnoi split across 7 legacy-user rows → unify email/name for merge.
 * - Clear mis-pasted Rachna Gulati profile on legacy-user-907 row.
 *
 * Usage:
 *   node fix-cfs-pre-backfill.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

const ADMIN_HOD_IDS = [
  "65d347ff-4c26-4886-be9d-416b64e943e9",
  "2f0d63ee-b00d-4db6-a02d-79f7dd381641",
  "b4e4cde7-ce97-4347-9304-98829fe7b302",
  "8b823f3c-4878-4fa8-af9c-8a8f8c8078e5",
];

const DALIP_IDS = [
  "e8e5a2e6-60cb-4684-8cdf-01229161bc1a",
  "4065ef86-4e16-4628-92d4-1e3aa2c0248e",
  "b3a3a971-c311-4bbe-9f15-96248ed8c4ec",
  "117be489-1bf0-4130-9b18-2e4cca42cdc7",
  "7355fe12-6d8c-414b-b5ea-1968ac639462",
  "e4a7b18a-7d5f-4fa1-9361-d1166982daad",
  "5f0da810-bb61-40d7-9de7-dcf181abe023",
];

const DALIP_EMAIL = "hodfrmfs@hau.ac.in";
const WRONG_PROFILE_ID = "7355fe12-6d8c-414b-b5ea-1968ac639462";

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
    .select("id, name_en, email, designation_en, member_type, staff_slug")
    .in("id", [...ADMIN_HOD_IDS, ...DALIP_IDS]);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", rows }, null, 2));
  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  for (const id of ADMIN_HOD_IDS) {
    const { error: updErr } = await sb
      .from("ccshau_page_staff")
      .update({ member_type: "faculty" })
      .eq("id", id)
      .eq("member_type", "hod");
    if (updErr) throw new Error(updErr.message);
  }

  const { error: clearErr } = await sb
    .from("ccshau_page_staff")
    .update({ detail_content_en: null, detail_content_hi: null })
    .eq("id", WRONG_PROFILE_ID);
  if (clearErr) throw new Error(clearErr.message);

  for (const id of DALIP_IDS) {
    const { error: dalipErr } = await sb
      .from("ccshau_page_staff")
      .update({
        name_en: "Dr. Dalip Kumar Bishnoi",
        email: DALIP_EMAIL,
      })
      .eq("id", id);
    if (dalipErr) throw new Error(dalipErr.message);
  }

  console.log("Applied CFS pre-backfill fixes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
