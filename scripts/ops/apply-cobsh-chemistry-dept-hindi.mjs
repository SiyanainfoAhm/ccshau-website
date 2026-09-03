#!/usr/bin/env node
/**
 * Chemistry department — faculty specialization Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-chemistry-dept-hindi.mjs          # dry-run
 *   node scripts/ops/apply-cobsh-chemistry-dept-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

/** staff id → specialization_hi */
const SPECIALIZATION_HI = {
  "f26cc6e3-eaf0-424d-9a41-7de01969f1eb":
    "कार्बनिक रसायन, औषधीय रसायन, प्राकृतिक उत्पाद रसायन, औषधि खोज",
  "d0a93fc9-4be3-41f4-905d-2556ebae0cd9": "नैनो रसायन और प्राकृतिक उत्पाद",
  "cb7f2e0f-eb78-451f-93cd-cbfe4b400b62": "कार्बनिक/विश्लेषणात्मक रसायन",
  "f2a9987d-fb87-4f80-aad8-1ae8d78cb1eb":
    "विश्लेषणात्मक रसायन; पर्यावरण रसायन; कीटनाशक अवशेष विश्लेषण",
  "44497324-7792-40eb-adec-ad2fcbd11590":
    "कार्बनिक संश्लेषण, औषधीय रसायन, नैनो पदार्थों का रसायन, प्राकृतिक उत्पाद आधारित औषधि खोज, औषधीय और संभावित फसलों का फाइटोरसायन",
  "2253786e-288b-4855-9c5d-c74d423a491f":
    "विविध अनुप्रयोगों हेतु क्रियात्मक पदार्थ, जैसे कृषि रसायनों का धीमी रिलीज, उत्प्रेरण, पर्यावरण उपचार और जैव-प्लास्टिक",
  "1ab7d232-3a94-47be-9128-d48b96b53abb": "ऑर्गेनोमेटैलिक्स और कार्बनिक रसायन",
  "ce232f4b-be65-416f-ba15-f9be3923cd31":
    "कार्बनिक संश्लेषण, फ्लोरोफोर विकास और औषधीय रसायन",
  "c357ac3a-98fa-4851-a6f0-682ecce60206":
    "अकार्बनिक रसायन/संश्लेषित अकार्बनिक रसायन/विश्लेषणात्मक रसायन/प्रदूषकों हेतु जल और मृदा उपचार",
  "cfcecbaf-970d-4994-9940-a64565e7f71f": "भौतिक और विश्लेषणात्मक रसायन",
  "884bef39-84e2-4f5b-b37a-04fead8b9422":
    "कार्बनिक संश्लेषण, हेटरोचक्रीय यौगिक, हाइपरवेलेंट अभिकर्मक, औषधीय रसायन, औषधि खोज, औषधीय और सुगंधित फसलों का फाइटोरसायन",
  "24b003c5-a177-4fb2-b3c1-8d0e64ffabcc": "रसायन, पदार्थ विज्ञान",
  "0fb96cdf-bb95-48aa-8599-423a97b63a9c":
    "विश्लेषणात्मक रसायन/कीटनाशक अवशेष विश्लेषण",
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
  const { data: staffRows } = await supabase
    .from("ccshau_page_staff")
    .select("id, name_en, specialization_en")
    .in("id", Object.keys(SPECIALIZATION_HI))
    .eq("is_active", true);

  console.log(`Chemistry faculty specialization updates: ${Object.keys(SPECIALIZATION_HI).length}`);
  for (const row of staffRows ?? []) {
    console.log(`  - ${row.name_en}`);
    console.log(`    ${SPECIALIZATION_HI[row.id]}`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  let updated = 0;
  let synced = 0;
  for (const [staffId, specialization_hi] of Object.entries(SPECIALIZATION_HI)) {
    const { error } = await supabase
      .from("ccshau_page_staff")
      .update({ specialization_hi })
      .eq("id", staffId);
    if (error) throw error;
    updated++;
    if (await syncFacultySpecialization(staffId, specialization_hi)) synced++;
  }
  console.log(`\n✓ ${updated} specialization(s) updated, ${synced} faculty sync(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
