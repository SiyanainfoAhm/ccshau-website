#!/usr/bin/env node
/**
 * Botany & Plant Physiology — sidebar labels + faculty specialization Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-botany-dept-hindi.mjs          # dry-run
 *   node scripts/ops/apply-cobsh-botany-dept-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const DEPT_PAGE_ID = "2cbbf7d7-c54c-4cd7-8ca7-9e131bd77cd1";

/** sidebar item id → label_hi */
const SIDEBAR_HI = {
  "3bb8af26-be58-47e2-a848-282d20318f4b": "प्रमुख कार्य क्षेत्र",
  "d3a9375b-6114-40c0-86be-6eb75543c232": "अवसंरचना (प्रयोगशालाएँ आदि)",
  "bc61f076-e4f4-45b3-8ccc-4c82f41e7357": "विभाग के सेवानिवृत्त",
  "e4860f22-8915-4069-a82d-71735fdb98df": "बी.एस.एम.ए. पाठ्यक्रम",
};

/** staff id → specialization_hi */
const SPECIALIZATION_HI = {
  "0eb5487b-a6d4-4bf9-9e5b-3953dc260821": "अजैविक तनाव शरीर क्रिया विज्ञान",
  "d521e4cb-aa88-4e55-af72-7798a5d40bcf":
    "तनाव शरीर क्रिया विज्ञान (उच्च तापमान तनाव)",
  "6ae1c0d4-9277-420f-8d47-0b63564afcf7": "अजैविक तनाव शरीर क्रिया विज्ञान",
  "63c281c0-0dfc-4b7c-b03e-8e10a5bbb92e": "पर्यावरण विज्ञान",
  "9ffb3a3a-c69f-473e-87b4-e49cb140d008":
    "तनाव शरीर क्रिया विज्ञान, फाइटोरेमेडिएशन",
  "d28a1cea-f246-45a3-a230-63adff44b10b": "तनाव शरीर क्रिया विज्ञान",
  "c64a4838-0946-4e39-9629-0deab753462a": "पादप प्रोटियोमिक्स और मेटाबोलोमिक्स",
  "8d3e0912-e882-4994-a7e3-8ca319777a8b":
    "अजैविक तनाव शरीर क्रिया विज्ञान, प्याज और लहसुन उत्पादन तथा कटाई-पश्चात प्रबंधन",
  "adb82480-fe48-47ae-aee2-10ef13a0614a":
    "अजैविक तनाव शरीर क्रिया विज्ञान, सरसों और चना उत्पादन",
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
  console.log("=== Sidebar labels ===");
  for (const [id, hi] of Object.entries(SIDEBAR_HI)) {
    console.log(`  ${id} → ${hi}`);
  }

  console.log("\n=== Faculty specialization ===");
  for (const [id, hi] of Object.entries(SPECIALIZATION_HI)) {
    console.log(`  ${id} → ${hi}`);
  }

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

  let staffUpdated = 0;
  let synced = 0;
  for (const [staffId, specialization_hi] of Object.entries(SPECIALIZATION_HI)) {
    const { error } = await supabase
      .from("ccshau_page_staff")
      .update({ specialization_hi })
      .eq("id", staffId);
    if (error) throw error;
    staffUpdated++;
    if (await syncFacultySpecialization(staffId, specialization_hi)) synced++;
  }
  console.log(`✓ ${staffUpdated} specialization(s) updated, ${synced} faculty sync(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
