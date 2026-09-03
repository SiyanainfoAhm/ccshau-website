#!/usr/bin/env node
/**
 * Languages & Haryanvi Culture — sidebar + faculty specialization Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-languages-dept-hindi.mjs          # dry-run
 *   node scripts/ops/apply-cobsh-languages-dept-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const SIDEBAR_HI = {
  "76ac5085-09b4-459c-b140-8a2b3424756b": "प्रमुख कार्य क्षेत्र",
  "5f7a31cc-2063-4a6a-9ae5-5aaa4ee29506": "अवसंरचना (प्रयोगशालाएँ आदि)",
  "429a51bf-4ad5-440b-9445-e11b13ffb2b7": "विभाग के सेवानिवृत्त",
};

const SPECIALIZATION_HI = {
  "72afd3c2-9c31-47a5-bbd5-bc5ad148a0a6": "अफ्रीकी-अमेरिकी साहित्य",
  "1e5f44fc-ffb3-40fb-8cc4-0e067ce0419a": "अमेरिकी साहित्य",
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function syncFacultySpecialization(staffId, specializationHi) {
  const { data: assignment } = await supabase
    .from("ccshau_faculty_assignments")
    .select("id, person_id")
    .eq("source_staff_id", staffId)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) return false;

  await supabase
    .from("ccshau_faculty_people")
    .update({ specialization_hi: specializationHi })
    .eq("id", assignment.person_id);
  await supabase
    .from("ccshau_faculty_assignments")
    .update({ specialization_hi: specializationHi })
    .eq("id", assignment.id);
  return true;
}

async function main() {
  console.log("=== Sidebar ===");
  for (const [id, hi] of Object.entries(SIDEBAR_HI)) console.log(`  ${id} → ${hi}`);

  console.log("\n=== Specialization ===");
  for (const [id, hi] of Object.entries(SPECIALIZATION_HI)) console.log(`  ${id} → ${hi}`);

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  for (const [id, label_hi] of Object.entries(SIDEBAR_HI)) {
    const { error } = await supabase
      .from("ccshau_page_sidebar_items")
      .update({ label_hi })
      .eq("id", id);
    if (error) throw error;
  }
  console.log(`\n✓ ${Object.keys(SIDEBAR_HI).length} sidebar label(s) updated`);

  let synced = 0;
  for (const [staffId, specialization_hi] of Object.entries(SPECIALIZATION_HI)) {
    const { error } = await supabase
      .from("ccshau_page_staff")
      .update({ specialization_hi })
      .eq("id", staffId);
    if (error) throw error;
    if (await syncFacultySpecialization(staffId, specialization_hi)) synced++;
  }
  console.log(`✓ ${Object.keys(SPECIALIZATION_HI).length} specialization(s) updated, ${synced} faculty sync(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
