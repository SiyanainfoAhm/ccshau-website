#!/usr/bin/env node
/**
 * Hindi for COBSH college head officer, contact lines, and department faculty.
 * Curated mappings (no external translation API).
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-staff-hindi.mjs          # dry-run
 *   node scripts/ops/apply-cobsh-staff-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_ID = "c84494e7-c774-4369-a7d0-33705983276d";

const PAGE_PATCH = {
  head_name_hi: "डॉ. राजेश गेरा",
  head_role_hi: "डीन",
};

const CONTACT_HI = {
  "Mailing Address": "मूल विज्ञान और मानविकी महाविद्यालय, सीसीएसएचएयू हिसार 125001",
  Office: "कार्यालय : 01662255335",
};

/** staff id → curated Hindi short fields */
const FACULTY_HI = {
  "904c8b4c-7d7f-41f2-9291-6d654aa8b9af": {
    name_hi: "डॉ. राधे श्याम",
    designation_hi: "सहायक प्रोफेसर",
  },
  "63c281c0-0dfc-4b7c-b03e-8e10a5bbb92e": {
    name_hi: "डॉ. श्रीदेवी तल्लाप्रगडा",
    designation_hi: "प्रोफेसर",
  },
  "b66d8b55-269c-4fef-91c0-b11a2f0e25be": {
    name_hi: "डॉ. राकेश कुमार",
    designation_hi: "सहयोगी प्रोफेसर",
  },
  "074fd07f-2b51-49da-ba67-34d777a404bd": {
    name_hi: "डॉ. (श्रीमती) कमला मलिक",
    designation_hi: "वरिष्ठ वैज्ञानिक",
  },
  "6b25879b-9ae6-4191-a544-894dd4987418": {
    name_hi: "डॉ. (श्रीमती) मीना सिंधु",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "294d65f5-ad86-48bf-87f5-9fea4f4b664d": {
    name_hi: "डॉ. (श्रीमती) रीता दहिया",
    designation_hi: "प्रोफेसर एवं विभागाध्यक्ष",
  },
  "ae9ee448-5130-4349-8518-c5aac1d10da4": {
    name_hi: "डॉ. अभिषेक",
    designation_hi: "सहायक प्रोफेसर",
  },
  "8927ff7e-5d28-468c-9c73-59e8f35a6792": {
    name_hi: "डॉ. अजय कुमार",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "933e9819-28e3-4bb9-90b9-78e3b629d522": {
    name_hi: "डॉ. अजय पाल",
    designation_hi: "सहायक प्रोफेसर (जैव रसायन)",
  },
  "adb82480-fe48-47ae-aee2-10ef13a0614a": {
    name_hi: "डॉ. अजीव संगवान",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "cb7f2e0f-eb78-451f-93cd-cbfe4b400b62": {
    name_hi: "डॉ. अनिल दुहान",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "0eb5487b-a6d4-4bf9-9e5b-3953dc260821": {
    name_hi: "डॉ. अनीता कुमारी",
    designation_hi: "वरिष्ठ पादप शरीरक्रियाविज्ञानी एवं विभागाध्यक्ष",
  },
  "b195f097-f612-4ab9-aaf7-397b23b2718b": {
    name_hi: "डॉ. अनुज राणा",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "2253786e-288b-4855-9c5d-c74d423a491f": {
    name_hi: "डॉ. अनुश्री जत्राणा",
    designation_hi: "सहायक रसायनज्ञ",
  },
  "491e34e1-c9de-4bc9-b036-de91009127b5": {
    name_hi: "डॉ. बबीता रानी",
    designation_hi: "सहायक प्रोफेसर",
  },
  "6f4464fa-6e7d-4071-9e2d-cd244c01f381": {
    name_hi: "डॉ. बास कौर",
    designation_hi: "सहायक प्रोफेसर",
  },
  "1e5f44fc-ffb3-40fb-8cc4-0e067ce0419a": {
    name_hi: "डॉ. देवेंद्र सिंह",
    designation_hi: "सहायक प्रोफेसर",
  },
  "ea2ca41f-7a1a-4f2a-a5d7-c64bf564e23a": {
    name_hi: "डॉ. गजेंद्र सिंह",
    designation_hi: "डीईएस (प्राणि विज्ञान)",
  },
  "a4879708-6834-4b7b-aabb-ab7c437adc40": {
    name_hi: "डॉ. जगदीश परशाद जांगड़ा",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "97d4d19c-faff-4d0b-ae9c-3e1fc38ad720": {
    name_hi: "डॉ. जयंती पी. टोकस",
    designation_hi: "प्रोफेसर एवं विभागाध्यक्ष",
  },
  "8ac8d1a3-b2a1-48f0-aa54-4163814909f7": {
    name_hi: "डॉ. मनोज कुमार",
    designation_hi: "सहयोगी प्रोफेसर (सांख्यिकी)",
  },
  "700ee384-9217-41e0-820c-b81a531bd291": {
    name_hi: "डॉ. मेघा गोयल",
    designation_hi: "सहायक प्रोफेसर",
  },
  "45e3e402-c8ee-409a-a009-43d5b5a4ca2d": {
    name_hi: "डॉ. मोनिका देवी",
    designation_hi: "सहायक वैज्ञानिक (सांख्यिकी)",
  },
  "e3fc003e-bee6-4702-a678-6643020a891a": {
    name_hi: "डॉ. मोनिका कायस्थ",
    designation_hi: "सहायक सूक्ष्म जीव विज्ञानी",
  },
  "3f13aee0-19f1-4892-a4bc-d304e4a6f892": {
    name_hi: "डॉ. नीरज खरोड़",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "6ae1c0d4-9277-420f-8d47-0b63564afcf7": {
    name_hi: "डॉ. नीरज कुमार",
    designation_hi: "पूर्व डीन (सीओबीएसएच, सीओएफएस), सलाहकार संकाय",
  },
  "24b003c5-a177-4fb2-b3c1-8d0e64ffabcc": {
    name_hi: "डॉ. निशा बागोटिया",
    designation_hi: "सहायक प्रोफेसर",
  },
  "c64a4838-0946-4e39-9629-0deab753462a": {
    name_hi: "डॉ. नीता लाकड़ा",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "7ec7e896-02d8-429a-bb92-1d320a9cda71": {
    name_hi: "डॉ. नितिन भारद्वाज",
    designation_hi: "सहायक वैज्ञानिक (सांख्यिकी)",
  },
  "8d3e0912-e882-4994-a7e3-8ca319777a8b": {
    name_hi: "डॉ. पी. भास्कर",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "72afd3c2-9c31-47a5-bbd5-bc5ad148a0a6": {
    name_hi: "डॉ. पूनम मोर",
    designation_hi: "सहायक प्रोफेसर",
  },
  "6b5b8567-b2af-47f1-87a9-59270f10d198": {
    name_hi: "डॉ. पूनम रंगा",
    designation_hi: "सहायक सूक्ष्म जीव विज्ञानी",
  },
  "75523e5b-7de7-4ef2-9104-3520c63d6ced": {
    name_hi: "डॉ. पुणेश संगवान",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "e3dc1d09-bb6f-4d45-9b13-d0223ddea59e": {
    name_hi: "डॉ. आर.के. गुप्ता",
    designation_hi: "प्रोफेसर एवं अतिरिक्त अनुसंधान निदेशक",
  },
  "25e44852-2408-4893-902a-ccf2fca0b3a3": {
    name_hi: "डॉ. आर.के. गुप्ता",
    designation_hi: "विभागाध्यक्ष",
  },
  "8fcba5fb-55c3-4cca-83fd-5eb20d8f668d": {
    name_hi: "डॉ. राहुल कुमार",
    designation_hi: "सहायक प्रोफेसर",
  },
  "82dd6810-db93-4c62-aa13-c2fa9c061081": {
    name_hi: "डॉ. राजेश गेरा",
    designation_hi: "अतिरिक्त अनुसंधान निदेशालय एवं प्रधान वैज्ञानिक",
  },
  "f26cc6e3-eaf0-424d-9a41-7de01969f1eb": {
    name_hi: "डॉ. रजनीकांत शर्मा",
    designation_hi: "सहयोगी प्रोफेसर एवं विभागाध्यक्ष",
  },
  "713e65bc-d3cb-42eb-bb21-2befb412c5d0": {
    name_hi: "डॉ. राम निवास",
    designation_hi: "सहायक प्रोफेसर एवं विभागाध्यक्ष",
  },
  "0c460f38-80a5-4b32-aed1-86ff4275058b": {
    name_hi: "डॉ. रश्मि त्यागी",
    designation_hi: "सहयोगी प्रोफेसर",
  },
  "44497324-7792-40eb-adec-ad2fcbd11590": {
    name_hi: "डॉ. रवि कुमार",
    designation_hi: "सहायक वैज्ञानिक/कनिष्ठ फाइटोकेमिस्ट",
  },
  "27dbd70c-5842-411d-ba54-9d83f5c2a903": {
    name_hi: "डॉ. रविकांत",
    designation_hi: "सहायक प्रोफेसर (वरिष्ठ स्केल)",
  },
  "0fb96cdf-bb95-48aa-8599-423a97b63a9c": {
    name_hi: "डॉ. रीना चौहान",
    designation_hi: "सहायक वैज्ञानिक (अवशेष रसायनज्ञ)",
  },
  "d521e4cb-aa88-4e55-af72-7798a5d40bcf": {
    name_hi: "डॉ. रेणु मुंजाल",
    designation_hi: "एमेरिटस प्रोफेसर",
  },
  "71555b23-7641-4e7e-95b5-939a15fef2d6": {
    name_hi: "डॉ. रिजुल सिहाग",
    designation_hi: "सहायक वैज्ञानिक (ग्रामीण समाजशास्त्र)",
  },
  "c357ac3a-98fa-4851-a6f0-682ecce60206": {
    name_hi: "डॉ. सचिन कुमारी",
    designation_hi: "सहायक प्रोफेसर/ सहायक वैज्ञानिक",
  },
  "bd2ab4f4-f4a3-4221-9b9d-89d2ce8650dc": {
    name_hi: "डॉ. संदीप यादव",
    designation_hi: "सहायक प्रोफेसर",
  },
  "9ffb3a3a-c69f-473e-87b4-e49cb140d008": {
    name_hi: "डॉ. सरिता देवी",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "0cf79ad5-17a0-4df9-babb-a108f8808d1b": {
    name_hi: "डॉ. सरिता रानी",
    designation_hi: "सहायक प्रोफेसर (सांख्यिकी)",
  },
  "c9a2dc64-a751-41c2-b82b-43c92933fe9a": {
    name_hi: "डॉ. सीमा संगवान",
    designation_hi: "सहयोगी प्रोफेसर",
  },
  "fe448420-9d5e-453f-8e77-9c6800a7fcf5": {
    name_hi: "डॉ. शरणजीत धवन",
    designation_hi: "सहायक प्रोफेसर",
  },
  "c3d23d9e-09d2-4288-bcb4-e451eeda5063": {
    name_hi: "डॉ. शिखा अहलावत",
    designation_hi: "सहायक प्रोफेसर",
  },
  "427091a2-c9cf-49ce-a9f4-4f750e33e407": {
    name_hi: "डॉ. शिखा मेहता",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "dbc8dcfc-e4fb-4129-bec8-e8ad1ac832f1": {
    name_hi: "डॉ. शिवानी मंधानिया",
    designation_hi: "वरिष्ठ वैज्ञानिक",
  },
  "1ab7d232-3a94-47be-9128-d48b96b53abb": {
    name_hi: "डॉ. सोनू चौहान",
    designation_hi: "सहायक रसायनज्ञ",
  },
  "7706c8e2-6895-496d-9c72-b9bf01fafc92": {
    name_hi: "डॉ. सुभाष चंदर",
    designation_hi: "सहायक वैज्ञानिक (समाजशास्त्र)",
  },
  "f2a9987d-fb87-4f80-aad8-1ae8d78cb1eb": {
    name_hi: "डॉ. सुशील",
    designation_hi: "वरिष्ठ वैज्ञानिक/ अवशेष रसायनज्ञ",
  },
  "9ae269b4-bcef-4231-851a-900227e38a59": {
    name_hi: "डॉ. सुशील नागर",
    designation_hi: "सहायक वैज्ञानिक",
  },
  "fb2be9c7-bd73-47b6-80d1-b72f9e85e0e3": {
    name_hi: "डॉ. तेजपाल दहिया",
    designation_hi: "सहायक प्रोफेसर (प्राणि विज्ञान), एनएसएस पीओ सीओएफएस",
  },
  "81adf754-a7fe-44e7-a324-3985996c1c3f": {
    name_hi: "डॉ. विकास सिवाच",
    designation_hi: "सहायक प्रोफेसर (गणित)",
  },
  "1bf065eb-ae89-4318-99df-71582af26710": {
    name_hi: "डॉ. विनय कुमार",
    designation_hi: "सहायक प्रोफेसर",
  },
  "d28a1cea-f246-45a3-a230-63adff44b10b": {
    name_hi: "डॉ. विनोद गोयल",
    designation_hi: "पादप शरीरक्रियाविज्ञानी",
  },
  "884bef39-84e2-4f5b-b37a-04fead8b9422": {
    name_hi: "डॉ. विपन कुमार",
    designation_hi: "सहायक वैज्ञानिक (फाइटोकेमिस्ट्री)",
  },
  "e057f341-1cba-481c-80f3-e809bbadb041": {
    name_hi: "डॉ. (श्रीमती) जतेश कठपालिया",
    designation_hi: "वरिष्ठ वैज्ञानिक",
  },
  "248fbb85-8394-4033-92a3-88749c8cd384": {
    name_hi: "डॉ. धर्मबीर सिंह",
    designation_hi: "सहयोगी प्रोफेसर (मत्स्य विज्ञान)",
  },
  "d0a93fc9-4be3-41f4-905d-2556ebae0cd9": {
    name_hi: "डॉ. सुशीला सिंह",
    designation_hi: "सहायक प्रोफेसर (स्तर-III)",
  },
  "ce232f4b-be65-416f-ba15-f9be3923cd31": {
    name_hi: "जयंत सिंधु",
    designation_hi: "सहायक प्रोफेसर",
  },
  "1737fe11-4525-43f8-a82d-73203d7935f8": {
    name_hi: "निशा कुमारी",
    designation_hi: "वरिष्ठ वैज्ञानिक (जैव रसायन)",
  },
  "00e3fcb3-a0fa-4b9a-8d1b-b757b52db293": {
    name_hi: "प्रो. (डॉ.) बलजीत सिंह सहारण",
    designation_hi: "प्रधान वैज्ञानिक एवं प्रभारी जैव उर्वरक उत्पादन एवं प्रौद्योगिकी केंद्र",
  },
  "67cb3336-ca12-4606-bf53-ef822b9b257b": {
    name_hi: "प्रो. ओ.पी. श्योराण",
    designation_hi: "प्रोफेसर एवं विभागाध्यक्ष",
  },
  "cfcecbaf-970d-4994-9940-a64565e7f71f": {
    name_hi: "राहुल कुमार",
    designation_hi: "सहायक प्रोफेसर",
  },
  "8bfb5d54-2f07-459b-97c3-08565e03ca10": {
    name_hi: "शीतल चौधरी",
    designation_hi: "सहायक प्रोफेसर",
  },
  "7b188c20-2238-41da-9131-3c9857e398db": {
    name_hi: "सनी कुमार",
    designation_hi: "सहायक प्रोफेसर",
  },
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

function compactPatch(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && String(v).trim()) out[k] = v;
  }
  return out;
}

async function main() {
  console.log("=== College head officer ===");
  console.log(`  ${PAGE_PATCH.head_name_hi} / ${PAGE_PATCH.head_role_hi}`);

  const { data: contacts } = await supabase
    .from("ccshau_page_contact_lines")
    .select("id, label_en")
    .eq("page_id", COLLEGE_ID)
    .order("sort_order");

  const contactPlans = (contacts ?? [])
    .map((row) => ({ id: row.id, label: row.label_en, value_hi: CONTACT_HI[row.label_en] }))
    .filter((row) => row.value_hi);

  for (const c of contactPlans) console.log(`  Contact ${c.label} → ${c.value_hi}`);

  const { pageIds } = await resolveStaffPageIds(supabase, COLLEGE_ID, { publishedOnly: true });
  const { data: staffRows, error } = await supabase
    .from("ccshau_page_staff")
    .select("id, name_en, designation_en")
    .in("page_id", pageIds)
    .eq("is_active", true)
    .order("name_en");

  if (error) throw error;

  const facultyPlans = [];
  for (const row of staffRows ?? []) {
    const hi = FACULTY_HI[row.id];
    if (!hi) {
      console.warn(`No mapping for ${row.name_en} (${row.id})`);
      continue;
    }
    facultyPlans.push({
      staffId: row.id,
      nameEn: row.name_en,
      staffPatch: compactPatch(hi),
      personPatch: compactPatch({ name_hi: hi.name_hi }),
      assignmentPatch: compactPatch({
        designation_hi: hi.designation_hi,
        specialization_hi: hi.specialization_hi,
      }),
    });
  }

  console.log(`\n=== Faculty (${facultyPlans.length} / ${staffRows?.length ?? 0}) ===`);
  for (const p of facultyPlans) {
    console.log(`  - ${p.nameEn} → ${p.staffPatch.name_hi}`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  const { error: pageErr } = await supabase.from("ccshau_pages").update(PAGE_PATCH).eq("id", COLLEGE_ID);
  if (pageErr) throw pageErr;
  console.log("\n✓ College head officer updated");

  for (const c of contactPlans) {
    const { error: cErr } = await supabase
      .from("ccshau_page_contact_lines")
      .update({ value_hi: c.value_hi })
      .eq("id", c.id);
    if (cErr) throw cErr;
  }
  console.log(`✓ ${contactPlans.length} contact line(s) updated`);

  let staffUpdated = 0;
  let peopleUpdated = 0;

  for (const plan of facultyPlans) {
    const { error: staffErr } = await supabase
      .from("ccshau_page_staff")
      .update(plan.staffPatch)
      .eq("id", plan.staffId);
    if (staffErr) throw staffErr;
    staffUpdated++;

    const { data: assignment } = await supabase
      .from("ccshau_faculty_assignments")
      .select("id, person_id")
      .eq("source_staff_id", plan.staffId)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) continue;

    if (Object.keys(plan.personPatch).length) {
      const { error: personErr } = await supabase
        .from("ccshau_faculty_people")
        .update(plan.personPatch)
        .eq("id", assignment.person_id);
      if (personErr) throw personErr;
    }

    if (Object.keys(plan.assignmentPatch).length) {
      const { error: assignErr } = await supabase
        .from("ccshau_faculty_assignments")
        .update(plan.assignmentPatch)
        .eq("id", assignment.id);
      if (assignErr) throw assignErr;
    }

    peopleUpdated++;
  }

  console.log(`✓ Faculty: page_staff=${staffUpdated}, faculty sync=${peopleUpdated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
