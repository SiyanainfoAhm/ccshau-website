#!/usr/bin/env node
/**
 * Mathematics & Statistics — sidebar + faculty specialization Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-math-stats-dept-hindi.mjs          # dry-run
 *   node scripts/ops/apply-cobsh-math-stats-dept-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const SIDEBAR_HI = {
  "4b97d4f8-1ebb-4f67-b334-6bca3d0d2360": "प्रमुख कार्य क्षेत्र",
  "5f745b29-68ee-467f-8cd4-037561863b20": "प्रमुख कार्य क्षेत्र",
  "6a78e7c7-d776-43ec-9f19-0f58069188d8": "अवसंरचना (प्रयोगशालाएँ आदि)",
  "9be291cf-755a-4feb-ba31-d099836d17d7": "विभाग के सेवानिवृत्त",
  "010b9937-7e40-49ff-b2c5-e42ad457e67a": "शिक्षण और अधिगम सामग्री",
  "0a4e4e08-c58b-4f1a-a2c3-b3085f973e3d": "नई पहल",
  "220e1739-6ad3-4734-966a-e4b604728365": "सलाहकार समिति",
  "b0538dbf-0c9c-45e4-af9f-e13c80f230a5": "राष्ट्रीय गणित दिवस - 2023",
};

const SPECIALIZATION_HI = {
  "67cb3336-ca12-4606-bf53-ef822b9b257b":
    "सांख्यिकीय प्रोग्रामिंग, बहिरूप और आनुवंशिक सांख्यिकी",
  "8ac8d1a3-b2a1-48f0-aa54-4163814909f7": "नमूना सर्वेक्षण और प्रतिगमन विश्लेषण",
  "700ee384-9217-41e0-820c-b81a531bd291": "सांख्यिकी",
  "fe448420-9d5e-453f-8e77-9c6800a7fcf5": "अवकल समीकरण, संख्यात्मक विश्लेषण",
  "81adf754-a7fe-44e7-a324-3985996c1c3f":
    "क्वांटम क्रिप्टोग्राफी, छवि प्रसंस्करण, परिचालन अनुसंधान, यातायात मॉडलिंग, गांठ सिद्धांत",
  "0cf79ad5-17a0-4df9-babb-a108f8808d1b": "प्रयोगों का डिज़ाइन",
  "7ec7e896-02d8-429a-bb92-1d320a9cda71": "विश्वसनीयता सिद्धांत",
  "45e3e402-c8ee-409a-a009-43d5b5a4ca2d": "नमूना सर्वेक्षण, सांख्यिकीय मॉडलिंग",
  "7b188c20-2238-41da-9131-3c9857e398db": "गणित",
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
  console.log(`Sidebar: ${Object.keys(SIDEBAR_HI).length}, Specialization: ${Object.keys(SPECIALIZATION_HI).length}`);

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
  console.log(`✓ ${Object.keys(SIDEBAR_HI).length} sidebar label(s) updated`);

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
