#!/usr/bin/env node
/**
 * Agricultural Meteorology — faculty specialization Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-hisar-agmet-specialization-hindi.mjs
 *   node scripts/ops/apply-hisar-agmet-specialization-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const SPECIALIZATION_HI = {
  "5c497a4b-27fe-40d0-a830-ff73f56f8f3e":
    "कृषि में मौसम पूर्वानुमान का अनुप्रयोग, सूक्ष्म मौसम विज्ञान, फसल-मौसम संबंध",
  "48344826-6889-4865-a9f4-92e4ebe79786": "कृषि मौसम विज्ञान",
  "1ff56cb5-0c9a-4077-8d4c-181e2c004230": "कृषि मौसम विज्ञान",
  "a1158b79-09f1-47a6-ba54-d95fecc1cea9": "जी.आई.एस., दूरसंवेदन, मानचित्र निर्माण",
  "aaf5727e-bf6f-4919-adea-adff33b08535": "सिमुलेशन मॉडलिंग और दूरसंवेदन",
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
  console.log(`Specializations to update: ${Object.keys(SPECIALIZATION_HI).length}`);

  if (!APPLY) {
    for (const [id, hi] of Object.entries(SPECIALIZATION_HI)) {
      console.log(`  ${id}: ${hi}`);
    }
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  let synced = 0;
  for (const [staffId, specialization_hi] of Object.entries(SPECIALIZATION_HI)) {
    const { error } = await supabase
      .from("ccshau_page_staff")
      .update({ specialization_hi })
      .eq("id", staffId);
    if (error) throw error;
    if (await syncFacultySpecialization(staffId, specialization_hi)) synced++;
    console.log(`✓ ${staffId}`);
  }
  console.log(`\nUpdated ${Object.keys(SPECIALIZATION_HI).length} specialization(s), ${synced} faculty sync(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
