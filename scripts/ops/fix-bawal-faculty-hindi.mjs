#!/usr/bin/env node
/**
 * Fix Hindi translations for Bawal Agriculture College faculty.
 * Updates page_staff + faculty_people + faculty_assignments.
 *
 * Usage:
 *   node scripts/ops/fix-bawal-faculty-hindi.mjs          # dry-run
 *   node scripts/ops/fix-bawal-faculty-hindi.mjs --apply  # write to DB
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml } from "./faculty-html-translate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const DEPT_SLUG = "bawal-agriculture-college";

/** staff id → curated short-field Hindi */
const FACULTY_HI = {
  "231684e6-341b-42de-9829-1c4c7e2ac300": {
    name_hi: "डॉ. नरेश कौशिक",
    designation_hi: "प्राचार्य",
    specialization_hi: "कृषि वानिकी और नर्सरी प्रौद्योगिकी",
    qualification_hi: "पीएच.डी.",
  },
  "4c242523-d09f-4864-84bc-6e79cf50d1c5": {
    name_hi: "डॉ. सुनीता श्योराण",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "मृदा उर्वरता और रसायन",
    qualification_hi: "पीएच.डी.",
  },
  "ae3aea65-66e2-4bbe-a845-e88c79de251c": {
    name_hi: "डॉ. बबीता रानी",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "जैव रसायन",
    qualification_hi: "पीएच.डी.",
  },
  "1168f35b-0368-4e7b-9f89-b162f63cf7a3": {
    name_hi: "डॉ. शरणजीत धवन",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "अवकल समीकरण, संख्यात्मक विश्लेषण",
    qualification_hi: "पीएच.डी.",
  },
  "85275654-e99c-4c7f-a828-bcf664226ac6": {
    name_hi: "डॉ. प्रीति रानी",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "वनस्पति विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "fc5adad9-ae90-4894-b698-aa540a34f92d": {
    name_hi: "डॉ. काजल",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "वानिकी",
    qualification_hi: "पीएच.डी.",
  },
  "e7bbdac0-af8c-4353-95b2-2f2839daa318": {
    name_hi: "डॉ. संदीप यादव",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "फोटोनिक्स, पदार्थ विज्ञान, थिन फिल्म, वैक्यूम विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "ba5c9440-b0f8-4a7d-9278-123ec65a11ca": {
    name_hi: "डॉ. राहुल कुमार",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "वर्मी-मत्स्य प्रौद्योगिकी, वर्मी-प्रौद्योगिकी",
    qualification_hi: "पीएच.डी.",
  },
  "3db96404-6436-4472-b485-24115c4cdf40": {
    name_hi: "डॉ. चरण सिंह सेकहोन",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "शारीरिक शिक्षा",
    qualification_hi: "पीएच.डी.",
  },
  "ceaa2bd5-ffe4-4dca-b9bb-e43888b4266b": {
    name_hi: "डॉ. अभिषेक",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "कंप्यूटर विज्ञान और इंजीनियरिंग",
    qualification_hi: "बी.टेक.(आई.टी.), एम.ई.(सी.एस.ई.) एवं पीएच.डी.(सी.एस.ई.)",
  },
  "56173c24-9d3f-4f2d-a85c-b115f8745193": {
    name_hi: "डॉ. तन्वी",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "सूक्ष्म जीव विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "ead21109-0b62-4627-9a0b-a9ce058e8e5b": {
    name_hi: "डॉ. परवीन कुमार निंबरायण",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: null,
    qualification_hi: "पीएच.डी.",
  },
  "bd2e20d3-5d88-4a34-9a66-fc33486419c6": {
    name_hi: "डॉ. निशा बागोटिया",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "रसायन, पदार्थ विज्ञान",
    qualification_hi: "पीएच.डी. (आई.आई.टी. दिल्ली)",
  },
  "11398cf0-6094-4adf-8ff9-9e7003d6944f": {
    name_hi: "डॉ. अनिल कुमार सिरोहा",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "खाद्य विज्ञान और प्रौद्योगिकी",
    qualification_hi: "पीएच.डी.",
  },
  "f4e40ee5-4a60-4207-abc0-e598922809ba": {
    name_hi: "डॉ. चरण सिंह",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "प्रसंस्करण और खाद्य इंजीनियरिंग",
    qualification_hi: "पीएच.डी.",
  },
  "9c4d32ec-6047-474a-9847-f7f83fb01655": {
    name_hi: "डॉ. राकेश कुमार",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "मृदा उर्वरता और रसायन, सूक्ष्म पोषक तत्व",
    qualification_hi: "पीएच.डी.",
  },
  "3b88709d-ef22-4eb2-b373-21fc747dca34": {
    name_hi: "डॉ. पूजा",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "उद्यान विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "d42831f6-c634-43fc-8232-9114bac6c319": {
    name_hi: "डॉ. राधे श्याम",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "समाजशास्त्र",
    qualification_hi: "एम.फिल, नेट, पीएच.डी.",
  },
  "899122c6-4715-4d71-bf04-402603ec796f": {
    name_hi: "डॉ. भारत तैंदू जैन",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "आनुवंशिकी और पादप प्रजनन",
    qualification_hi: "पीएच.डी.",
  },
  "7d57e6bc-c616-4bdb-9b26-9dc3e1886ffe": {
    name_hi: "डॉ. सोनम कамбोज",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: null,
    qualification_hi: "पीएच.डी.",
  },
  "b5bde2f2-49ea-4123-a562-4d092cf5fec0": {
    name_hi: "डॉ. योगेश कुमार",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "कृषि मौसम विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "aa3c23f7-700d-4e0d-bd61-3a2323a5ba19": {
    name_hi: "डॉ. मोहिंदर सिंह",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "कृषि विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "8ab1cf0c-40b7-43ce-a253-25f43991a706": {
    name_hi: "डॉ. अलीशा मित्तल",
    designation_hi: "सहायक प्रोफेसर (सांख्यिकी)",
    specialization_hi: "काल श्रृंखला और नमूना तकनीक",
    qualification_hi: "पीएच.डी. (सांख्यिकी)",
  },
  "65325764-0cef-493c-ab78-5b59f8a34aa6": {
    name_hi: "डॉ. अनिल कुमार मलिक",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "कृषि विस्तार शिक्षा",
    qualification_hi: "पीएच.डी.",
  },
  "9302ae79-addc-4a7a-aff0-a00094378392": {
    name_hi: "डॉ. रूमी देवी",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "आर्थिक कीट विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "5402ac6e-ab09-430c-a6cb-9dce292e63c7": {
    name_hi: "डॉ. हरिश एम. एस.",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "बीज विज्ञान और प्रौद्योगिकी",
    qualification_hi: "पीएच.डी.",
  },
  "753f3221-ad39-4302-803e-ceb6ac6a1395": {
    name_hi: "डॉ. राम सावरूप सुथार",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "पशु पोषण",
    qualification_hi: "पीएच.डी.",
  },
  "a678b588-8723-4d98-9563-944631143f78": {
    name_hi: "डॉ. सुजाता",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "आर्थिक सूत्रकृमि विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "504e7b4a-b578-4cd3-97d0-58ea25575533": {
    name_hi: "डॉ. प्रीति",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "पादप रोग विज्ञान",
    qualification_hi: "पीएच.डी.",
  },
  "9d6dc92c-d35e-4bc3-aedb-f499325dd61c": {
    name_hi: "डॉ. प्रवीण कुमार शर्मा",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "सब्जी विज्ञान",
    qualification_hi: "पीएच.डी.",
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
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
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
  const { data: dept } = await supabase
    .from("ccshau_pages")
    .select("id, title_en")
    .eq("slug", DEPT_SLUG)
    .maybeSingle();
  if (!dept) throw new Error(`Department not found: ${DEPT_SLUG}`);

  const { data: staffRows, error } = await supabase
    .from("ccshau_page_staff")
    .select("id, name_en, detail_content_en, specialization_en")
    .eq("page_id", dept.id)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  const plans = [];
  for (const row of staffRows ?? []) {
    const hi = FACULTY_HI[row.id];
    if (!hi) {
      console.warn(`No mapping for ${row.name_en} (${row.id})`);
      continue;
    }

    const detailHi = row.detail_content_en
      ? translateFacultyProfileHtml(row.detail_content_en)
      : null;

    const staffPatch = compactPatch({
      ...hi,
      detail_content_hi: detailHi,
    });

    plans.push({
      staffId: row.id,
      nameEn: row.name_en,
      staffPatch,
      personPatch: compactPatch({
        name_hi: hi.name_hi,
        specialization_hi: hi.specialization_hi,
        qualification_hi: hi.qualification_hi,
        detail_content_hi: detailHi,
      }),
      assignmentPatch: compactPatch({
        designation_hi: hi.designation_hi,
        specialization_hi: hi.specialization_hi,
      }),
    });
  }

  console.log(`Department: ${dept.title_en}`);
  console.log(`Faculty to update: ${plans.length}`);
  for (const p of plans) {
    console.log(`  - ${p.nameEn} → ${p.staffPatch.name_hi}`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  let staffUpdated = 0;
  let peopleUpdated = 0;

  for (const plan of plans) {
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

    if (!assignment) {
      console.warn(`  ⚠ No faculty assignment for ${plan.nameEn}`);
      continue;
    }

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
    console.log(`  ✓ ${plan.nameEn}`);
  }

  console.log(`\nUpdated page_staff: ${staffUpdated}, faculty sync: ${peopleUpdated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
