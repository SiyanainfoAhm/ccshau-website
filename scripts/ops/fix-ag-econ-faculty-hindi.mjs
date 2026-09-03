#!/usr/bin/env node
/**
 * Fix Hindi translations for Agricultural Economics faculty (Hisar).
 * Updates page_staff + faculty_people + faculty_assignments.
 *
 * Usage:
 *   node scripts/ops/fix-ag-econ-faculty-hindi.mjs          # dry-run
 *   node scripts/ops/fix-ag-econ-faculty-hindi.mjs --apply  # write to DB
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml } from "./faculty-html-translate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const PAGE_ID = "601693da-a5f4-4bd6-966a-7be0f48a33bd";

/** staff id → curated short-field Hindi */
const FACULTY_HI = {
  "6d7b76b8-3d0b-4f42-9e57-6966c4b40d99": {
    name_hi: "डॉ. धर्मपाल मलिक",
    designation_hi: "प्रोफेसर एवं विभागाध्यक्ष",
    specialization_hi: "खेत प्रबंधन, कृषि वित्त, कृषि विपणन एवं मूल्य विश्लेषण",
    qualification_hi: "पीएच.डी.",
  },
  "078210a2-acbb-42db-8a8e-9dff99054c89": {
    name_hi: "डॉ. संजय कुमार",
    designation_hi: "एसोसिएट प्रोफेसर",
    specialization_hi: "खेत प्रबंधन",
    qualification_hi: "पीएच.डी.",
  },
  "6003de6a-4a27-4f0b-b92e-72c2f688012b": {
    name_hi: "डॉ. विनय मेहला",
    designation_hi: "सहायक वैज्ञानिक",
    specialization_hi: "कृषि विपणन एवं खेत प्रबंधन",
    qualification_hi: "पीएच.डी. एवं नेट",
  },
  "fb8c85df-cb3f-41c5-a345-288a68cf7111": {
    name_hi: "डॉ. सुमित",
    designation_hi: "सहायक वैज्ञानिक (कृषि अर्थशास्त्र)",
    specialization_hi: "खेत प्रबंधन एवं उत्पादन अर्थशास्त्र",
    qualification_hi: "पीएच.डी. (कृषि अर्थशास्त्र)",
  },
  "1d1d4f39-6bf9-469e-aa37-75334679f62d": {
    name_hi: "डॉ. मोनिका देवी",
    designation_hi: "सहायक वैज्ञानिक (सांख्यिकी)",
    specialization_hi: "नमूना सर्वेक्षण, सांख्यिकीय मॉडलिंग",
    qualification_hi: "पीएच.डी.",
  },
  "b451e23c-2b4b-4c3d-aa64-a80ecd83f6a9": {
    name_hi: "डॉ. जनैलिन एस. पापांग",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "उत्पादन अर्थशास्त्र एवं कृषि विपणन",
    qualification_hi: "पीएच.डी.",
  },
  "eb3bb939-405c-4ede-83d7-9c182243644b": {
    name_hi: "डॉ. नीरज पवार",
    designation_hi: "सहायक वैज्ञानिक",
    specialization_hi: "कृषि विपणन",
    qualification_hi: "पीएच.डी.",
  },
  "e95b4876-9326-4733-9b94-40eecb46241d": {
    name_hi: "डॉ. संजय",
    designation_hi: "सहायक प्रोफेसर",
    specialization_hi: "कृषि वित्त",
    qualification_hi:
      "पीएच.डी. कृषि अर्थशास्त्र, सीसीएसएचएयू, 2022, यूजीसी-जेआरएफ आईसीएआर-नेट (जन, 2018)",
  },
  "d7c5d70b-ffa1-493c-97f9-67cfe084a370": {
    name_hi: "डॉ. रिजुल सिहाग",
    designation_hi: "सहायक वैज्ञानिक (ग्रामीण समाजशास्त्र)",
    specialization_hi: "समाजशास्त्र, सामाजिक-आर्थिक विकास",
    qualification_hi: "पीएच.डी. समाजशास्त्र एवं नेट, एम.ए. समाजशास्त्र, बी.ए. (ऑनर्स)",
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

async function main() {
  const { data: staffRows, error } = await supabase
    .from("ccshau_page_staff")
    .select("id, name_en, detail_content_en, specialization_en")
    .eq("page_id", PAGE_ID)
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
    const detailHi = translateFacultyProfileHtml(row.detail_content_en);
    plans.push({
      staffId: row.id,
      nameEn: row.name_en,
      staffPatch: {
        ...hi,
        detail_content_hi: detailHi,
      },
      personPatch: {
        name_hi: hi.name_hi,
        specialization_hi: hi.specialization_hi,
        qualification_hi: hi.qualification_hi,
        detail_content_hi: detailHi,
      },
      assignmentPatch: {
        designation_hi: hi.designation_hi,
        specialization_hi: hi.specialization_hi,
      },
    });
  }

  console.log(`Department: hisar-agricultural-economics`);
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

    const { error: personErr } = await supabase
      .from("ccshau_faculty_people")
      .update(plan.personPatch)
      .eq("id", assignment.person_id);
    if (personErr) throw personErr;

    const { error: assignErr } = await supabase
      .from("ccshau_faculty_assignments")
      .update(plan.assignmentPatch)
      .eq("id", assignment.id);
    if (assignErr) throw assignErr;

    peopleUpdated++;
    console.log(`  ✓ ${plan.nameEn}`);
  }

  console.log(`\nUpdated page_staff: ${staffUpdated}, faculty sync: ${peopleUpdated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
