#!/usr/bin/env node
/**
 * COBSH all departments — remaining faculty specialization Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-all-depts-hindi.mjs          # dry-run
 *   node scripts/ops/apply-cobsh-all-depts-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-basic-sciences-humanities";

/** Force-update sidebar labels when partial/wrong Hindi exists. */
const FORCE_SIDEBAR_BY_LABEL = {
  "Infrastructure (laboratories etc.)": "अवसंरचना (प्रयोगशालाएँ आदि)",
  "Retiree of the Department": "विभाग के सेवानिवृत्त",
  "Thurst Areas": "प्रमुख कार्य क्षेत्र",
  "Thrust Area": "प्रमुख कार्य क्षेत्र",
  Event: "कार्यक्रम",
  "Course offered": "संचालित पाठ्यक्रम",
  "Other Facilities": "अन्य सुविधाएँ",
  "List of  students": "छात्रों की सूची",
  "List of students": "छात्रों की सूची",
  "List of Students": "छात्रों की सूची",
};

/** staff id → specialization_hi */
const SPECIALIZATION_HI = {
  "933e9819-28e3-4bb9-90b9-78e3b629d522": "एंजाइमोलॉजी, बायो-नैनोटेक्नोलॉजी",
  "9ae269b4-bcef-4231-851a-900227e38a59":
    "औद्योगिक एंजाइम, किण्वन, जैव-पृथक्करण और जैव-सेंसर",
  "1737fe11-4525-43f8-a82d-73203d7935f8": "जैव रसायन",
  "3f13aee0-19f1-4892-a4bc-d304e4a6f892": "जैव रसायन",
  "dbc8dcfc-e4fb-4129-bec8-e8ad1ac832f1": "कपास जैव रसायन",
  "491e34e1-c9de-4bc9-b036-de91009127b5": "जैव रसायन",
  "75523e5b-7de7-4ef2-9104-3520c63d6ced": "जैव रसायन",
  "8bfb5d54-2f07-459b-97c3-08565e03ca10": "कंप्यूटर अनुप्रयोग",
  "ae9ee448-5130-4349-8518-c5aac1d10da4": "कंप्यूटर विज्ञान और इंजीनियरिंग",
  "074fd07f-2b51-49da-ba67-34d777a404bd":
    "जैव ईंधन, किण्वन, अपशिष्ट प्रबंधन और नैनोटेक्नोलॉजी",
  "6b25879b-9ae6-4191-a544-894dd4987418":
    "किण्वन, औद्योगिक सूक्ष्म जीव विज्ञान, सूक्ष्म जीव एंजाइम, जैव सक्रिय पेप्टाइड, जैव पॉलिमर",
  "c9a2dc64-a751-41c2-b82b-43c92933fe9a":
    "सूक्ष्म जीव जैव प्रौद्योगिकी, जैव सतर्कता उत्पादन, जैव उपचार",
  "427091a2-c9cf-49ce-a9f4-4f750e33e407": "जैव ऊर्जा और जैव खाद",
  "8927ff7e-5d28-468c-9c73-59e8f35a6792":
    "सूक्ष्म जीव विविधता, जैव उर्वरक, आणविक सूक्ष्म जीव विज्ञान",
  "b195f097-f612-4ab9-aaf7-397b23b2718b":
    "आणविक जीव विज्ञान, कार्यात्मक जीनोमिक्स, पादप और मृदा माइक्रोबायोम, सूक्ष्म जीव वीओसी",
  "b66d8b55-269c-4fef-91c0-b11a2f0e25be":
    "आणविक सूक्ष्म जीव विज्ञान, कीट-पीड़क और पादप रोगों का जैव नियंत्रण",
  "a4879708-6834-4b7b-aabb-ab7c437adc40": "जैव उपचार और मृदा सूक्ष्म जीव विज्ञान",
  "e3fc003e-bee6-4702-a678-6643020a891a": "मृदा सूक्ष्म जीव विज्ञान और खाद बनाना",
  "00e3fcb3-a0fa-4b9a-8d1b-b757b52db293":
    "जैव उर्वरक उत्पादन प्रौद्योगिकी, जैव उपचार, आणविक सूक्ष्म जीव विज्ञान, प्राकृतिक खेती",
  "82dd6810-db93-4c62-aa13-c2fa9c061081": "सूक्ष्म जीव विविधता",
  "6b5b8567-b2af-47f1-87a9-59270f10d198": "जैव उपचार",
  "294d65f5-ad86-48bf-87f5-9fea4f4b664d": "मृदा भौतिकी और पदार्थ विज्ञान",
  "bd2ab4f4-f4a3-4221-9b9d-89d2ce8650dc":
    "फोटोनिक्स, पदार्थ विज्ञान, पतली फिल्में, निर्वात विज्ञान और प्रौद्योगिकी",
  "1bf065eb-ae89-4318-99df-71582af26710":
    "नैनोटेक्नोलॉजी, स्मार्ट पदार्थों का विकास और सुपरकैपेसिटर एवं गैस सेंसर में उनका अनुप्रयोग",
  "7706c8e2-6895-496d-9c72-b9bf01fafc92": "ग्रामीण समाजशास्त्र और कृषि प्रौद्योगिकी",
  "6f4464fa-6e7d-4071-9e2d-cd244c01f381": "समाजशास्त्र",
  "0c460f38-80a5-4b32-aed1-86ff4275058b": "ग्रामीण समाजशास्त्र",
  "904c8b4c-7d7f-41f2-9291-6d654aa8b9af": "समाजशास्त्र",
  "71555b23-7641-4e7e-95b5-939a15fef2d6": "समाजशास्त्र, सामाजिक-आर्थिक विकास",
  "e057f341-1cba-481c-80f3-e809bbadb041": "ग्रामीण समाजशास्त्र और शिक्षा",
  "ea2ca41f-7a1a-4f2a-a5d7-c64bf564e23a": "मत्स्य विज्ञान",
  "27dbd70c-5842-411d-ba54-9d83f5c2a903": "घुनविदा",
  "248fbb85-8394-4033-92a3-88749c8cd384": "मत्स्य पोषण, वर्मी संस्कृति और वन्यजीव",
  "fb2be9c7-bd73-47b6-80d1-b72f9e85e0e3": "प्राणि वर्गिकी",
  "e3dc1d09-bb6f-4d45-9b13-d0223ddea59e": "वर्मी-मत्स्य प्रौद्योगिकी",
  "8fcba5fb-55c3-4cca-83fd-5eb20d8f668d": "वर्मी-मत्स्य प्रौद्योगिकी, वर्मी-प्रौद्योगिकी",
  "c3d23d9e-09d2-4288-bcb4-e451eeda5063":
    "प्राणि वर्गिकी, पारिस्थितिकी, विकास जीव विज्ञान, जलकृषि और मत्स्य प्रसंस्करण प्रौद्योगिकी",
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
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id")
    .eq("slug", COLLEGE_SLUG)
    .single();

  const { data: depts } = await supabase
    .from("ccshau_pages")
    .select("id")
    .eq("college_root_id", college.id)
    .like("slug", "cbs-%");

  const deptIds = (depts ?? []).map((d) => d.id);
  const { data: sidebarItems } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, label_hi")
    .in("page_id", deptIds)
    .eq("is_active", true);

  const sidebarPlans = [];
  for (const item of sidebarItems ?? []) {
    const en = item.label_en?.trim();
    const target = FORCE_SIDEBAR_BY_LABEL[en];
    if (!target || item.label_hi === target) continue;
    sidebarPlans.push({ id: item.id, labelEn: en, to: target });
  }

  console.log(`Sidebar force updates: ${sidebarPlans.length}`);
  console.log(`Specialization updates: ${Object.keys(SPECIALIZATION_HI).length}`);

  if (!APPLY) {
    for (const p of sidebarPlans) console.log(`  SB: ${p.labelEn} → ${p.to}`);
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  for (const p of sidebarPlans) {
    const { error } = await supabase
      .from("ccshau_page_sidebar_items")
      .update({ label_hi: p.to })
      .eq("id", p.id);
    if (error) throw error;
  }
  console.log(`✓ ${sidebarPlans.length} sidebar label(s) updated`);

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
  console.log(`✓ ${updated} specialization(s) updated, ${synced} faculty sync(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
