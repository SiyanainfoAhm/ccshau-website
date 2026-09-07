#!/usr/bin/env node
/**
 * Translate missing designation_hi / specialization_hi on ccshau_faculty_assignments.
 * Skips fields that already have Devanagari Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-faculty-assignments-hindi.mjs
 *   node scripts/ops/apply-faculty-assignments-hindi.mjs --apply
 *   node scripts/ops/apply-faculty-assignments-hindi.mjs --apply --limit=50
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FACULTY_HTML_PHRASES, hasDevanagari } from "./faculty-html-translate.mjs";
import { EXACT_DESIGNATION_HI } from "./faculty-designation-hindi.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const LIMIT = limitArg ? Number(limitArg) : null;

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Exact designation_en → designation_hi (preferred over phrase/GTX). */
const EXACT_ASSIGNMENT_DESIGNATION = {
  ...EXACT_DESIGNATION_HI,
  Teacher: "शिक्षक",
  Lecturer: "व्याख्याता",
  Principal: "प्राचार्य",
  Chairman: "अध्यक्ष",
  HOD: "विभागाध्यक्ष",
  "A&AO": "प्रशासन एवं लेखा अधिकारी",
  "Admn-cum-Accounts Officer": "प्रशासन सह लेखा अधिकारी",
  "Assistant Registrar": "सहायक कुलसचिव",
  "Assistant Librarian": "सहायक पुस्तकालयाध्यक्ष",
  "Deputy Librarian": "उप पुस्तकालयाध्यक्ष",
  "Superintendent (Inspection)": "अधीक्षक (निरीक्षण)",
  "Consultant Faculty": "सलाहकार संकाय",
  "Professor (Physical Education)": "प्रोफेसर (शारीरिक शिक्षा)",
  "Sr. Coordinator": "वरिष्ठ समन्वयक",
  "Sr. Coordinator (Incharge)": "वरिष्ठ समन्वयक (प्रभारी)",
  "Principal Extension Specialist": "प्रधान विस्तार विशेषज्ञ",
  "Principal Extension Specialist (PES)": "प्रधान विस्तार विशेषज्ञ (पी.ई.एस.)",
  "PES (Sr. Coordinator)": "पी.ई.एस. (वरिष्ठ समन्वयक)",
  "PES (Home Science)": "पी.ई.एस. (गृह विज्ञान)",
  "District Extension Specialist (Soil Science)": "जिला विस्तार विशेषज्ञ (मृदा विज्ञान)",
  "District Extension Specialist (Farm Management)": "जिला विस्तार विशेषज्ञ (फार्म प्रबंधन)",
  "District  Extension Specialist": "जिला विस्तार विशेषज्ञ",
  "ASPIO, Sr. District Extension Specialist (Soil Science)":
    "ए.एस.पी.आई.ओ., वरिष्ठ जिला विस्तार विशेषज्ञ (मृदा विज्ञान)",
  "DES (Agricultural Economics)": "डी.ई.एस. (कृषि अर्थशास्त्र)",
  "DES (Agri. Engg.)": "डी.ई.एस. (कृषि अभियांत्रिकी)",
  "DES ( Agricultural Extension )": "डी.ई.एस. (कृषि विस्तार)",
  "DES (Agronomy)": "डी.ई.एस. (कृषि विज्ञान)",
  "DES (Entomology)": "डी.ई.एस. (कीट विज्ञान)",
  "DES (Soil Science)": "डी.ई.एस. (मृदा विज्ञान)",
  "DES (Vegetable Science)": "डी.ई.एस. (सब्जी विज्ञान)",
  DES: "डी.ई.एस.",
  Professor: "प्रोफेसर",
  "Assoc. Professor": "सहयोगी प्रोफेसर",
  "Associate Professor": "सहयोगी प्रोफेसर",
  "District Extension Specialist": "जिला विस्तार विशेषज्ञ",
  "District Extension specialist": "जिला विस्तार विशेषज्ञ",
};

const EXACT_ASSIGNMENT_SPECIALIZATION = {
  "Accounts Business Studies Now Teaching Maths & Social Science":
    "लेखा, व्यवसाय अध्ययन; वर्तमान में गणित एवं सामाजिक विज्ञान शिक्षण",
  "Computers and CBSE Works Handling and Campus School Website maintenance":
    "कंप्यूटर एवं सीबीएसई कार्य प्रबंधन तथा कैंपस स्कूल वेबसाइट रखरखाव",
  "Rice Entomology, Maize Entomology & Sugarcane Entomology":
    "धान कीट विज्ञान, मक्का कीट विज्ञान एवं गन्ना कीट विज्ञान",
  "Soil testing, Plant Nutrition and Soil Chemistry": "मृदा परीक्षण, पादप पोषण एवं मृदा रसायन",
  "English, Hindi, Maths & EVS": "अंग्रेज़ी, हिंदी, गणित एवं पर्यावरण अध्ययन",
  "Games and Physical Education": "खेल एवं शारीरिक शिक्षा",
  "Family Resource Management": "पारिवारिक संसाधन प्रबंधन",
  "Agricultural Extension Education": "कृषि विस्तार शिक्षा",
  "Extension Education": "विस्तार शिक्षा",
  "Agricultural Economics": "कृषि अर्थशास्त्र",
  "Foods and Nutrition": "खाद्य एवं पोषण",
  "Drawing and Craft": "चित्रकला एवं शिल्प",
  "Social Science": "सामाजिक विज्ञान",
  "Forest Pathology": "वन रोग विज्ञान",
  "English, Math": "अंग्रेज़ी, गणित",
  "Hindi Sanskrit": "हिंदी संस्कृत",
  "Math Science": "गणित विज्ञान",
  "Vegetable Sc.": "सब्जी विज्ञान",
  "Vegetable Science": "सब्जी विज्ञान",
  "Plant Pathology": "पादप रोग विज्ञान",
  "Soil and Water Engineering": "मृदा एवं जल अभियांत्रिकी",
  "Farm Management": "फार्म प्रबंधन",
  "Agro-forestry": "कृषि वानिकी",
  "Home Science": "गृह विज्ञान",
  "Soil Science": "मृदा विज्ञान",
  Horticulture: "उद्यान विज्ञान",
  Entomology: "कीट विज्ञान",
  Agronomy: "कृषि विज्ञान",
  Mathematics: "गणित",
  Physics: "भौतिकी",
  Chemistry: "रसायन",
  English: "अंग्रेज़ी",
  Hindi: "हिंदी",
  Maths: "गणित",
  Science: "विज्ञान",
  Music: "संगीत",
  Computer: "कंप्यूटर",
  HDFS: "मानव विकास एवं परिवार अध्ययन",
  LIS: "पुस्तकालय एवं सूचना विज्ञान",
};

const EXTRA_PHRASES = [
  ["District Extension Specialist (Officiating as Sr. Coordinator)", "जिला विस्तार विशेषज्ञ (कार्यकारी वरिष्ठ समन्वयक)"],
  ["Sr. District Extension Specialist", "वरिष्ठ जिला विस्तार विशेषज्ञ"],
  ["Sr. Coordinator-cum-DES (Entomology)", "वरिष्ठ समन्वयक सह डी.ई.एस. (कीट विज्ञान)"],
  ["Training Assistant (TA)", "प्रशिक्षण सहायक"],
  ["Training Assistant", "प्रशिक्षण सहायक"],
  ["Assistant Scientist ( Plant Pathology)", "सहायक वैज्ञानिक (पादप रोग विज्ञान)"],
  ["Assistant Scientist (Plant Pathology)", "सहायक वैज्ञानिक (पादप रोग विज्ञान)"],
  ["DES (Agril. Engineering )", "डी.ई.एस. (कृषि अभियांत्रिकी)"],
  ["DES (Agril. Engineering)", "डी.ई.एस. (कृषि अभियांत्रिकी)"],
  ["DES (Horticulture- Fruit Science)", "डी.ई.एस. (उद्यान विज्ञान — फल विज्ञान)"],
  ["DES (Agro Forestry)", "डी.ई.एस. (कृषि वानिकी)"],
  ["DES (Home Science)", "डी.ई.एस. (गृह विज्ञान)"],
  ["DES (Plant Pathology)", "डी.ई.एस. (पादप रोग विज्ञान)"],
  ["DES (Pl. Patho.)", "डी.ई.एस. (पादप रोग विज्ञान)"],
  ["DES (Forestry)", "डी.ई.एस. (वानिकी)"],
  ["DES (Agril. Econ.)", "डी.ई.एस. (कृषि अर्थशास्त्र)"],
  ["DES (Ext. Edu.)", "डी.ई.एस. (विस्तार शिक्षा)"],
  ["DES, KVK (Bawal)", "डी.ई.एस., कृषि विज्ञान केंद्र (बावल)"],
  ["Assistant Professor", "सहायक प्रोफेसर"],
  ["Senior Scientist", "वरिष्ठ वैज्ञानिक"],
  ["Senior Coordinator", "वरिष्ठ समन्वयक"],
  ["Sr. Coordinator", "वरिष्ठ समन्वयक"],
  ["Coordinator", "समन्वयक"],
  ["Agronomy, Resource conservation technologies", "कृषि विज्ञान, संसाधन संरक्षण प्रौद्योगिकियाँ"],
  ["Home Science (Extension Education and Communication Management)", "गृह विज्ञान (विस्तार शिक्षा एवं संचार प्रबंधन)"],
  ["Soil Science (Soil and water analysis)", "मृदा विज्ञान (मृदा एवं जल विश्लेषण)"],
  ["Propagation of Planting material, seed priming, image processing etc.", "रोपण सामग्री का प्रवर्धन, बीज प्राइमिंग, छवि प्रसंस्करण आदि"],
  ["Vegetable Breeding and Biotechnology", "सब्जी प्रजनन एवं जैव प्रौद्योगिकी"],
  ["Soil Fertility and Water Management", "मृदा उर्वरता एवं जल प्रबंधन"],
  ["Soil Fertility, Micronutrients", "मृदा उर्वरता, सूक्ष्म पोषक तत्व"],
  ["Transfer of Technology", "प्रौद्योगिकी हस्तांतरण"],
  ["Agricultural Marketing", "कृषि विपणन"],
  ["Agril. Extension Education", "कृषि विस्तार शिक्षा"],
  ["Agril. Entomology", "कृषि कीट विज्ञान"],
  ["Agri. Economics", "कृषि अर्थशास्त्र"],
  ["Animal Nutrition", "पशु पोषण"],
  ["Crop production", "फसल उत्पादन"],
  ["Weed Management", "खरपतवार प्रबंधन"],
  ["Textile and designing", "वस्त्र एवं डिजाइन"],
  ["Resource conservation technologies", "संसाधन संरक्षण प्रौद्योगिकियाँ"],
  ["Library and Information Science", "पुस्तकालय एवं सूचना विज्ञान"],
  ["Agro Forestry", "कृषि वानिकी"],
  ["Agroforestry", "कृषि वानिकी"],
];

const ALL_PHRASES = [...EXTRA_PHRASES, ...FACULTY_HTML_PHRASES].sort((a, b) => b[0].length - a[0].length);

function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (hi.trim() === en.trim()) return true;
  if (!hasDevanagari(hi)) return true;
  return false;
}

function mapPhrase(text, kind = "any") {
  if (!text?.trim()) return null;
  let out = text.trim();
  if (kind === "designation" || kind === "any") {
    const exactDesig = EXACT_ASSIGNMENT_DESIGNATION[out];
    if (exactDesig) return exactDesig;
  }
  if (kind === "specialization" || kind === "any") {
    const exactSpec = EXACT_ASSIGNMENT_SPECIALIZATION[out];
    if (exactSpec) return exactSpec;
  }
  for (const [en, hi] of ALL_PHRASES) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  out = out.replace(/\s+/g, " ").trim();
  return hasDevanagari(out) ? out : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateWithGoogleGtx(text) {
  try {
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `q=${encodeURIComponent(text)}`,
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    return (
      data[0]
        .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
        .join("")
        .trim() || null
    );
  } catch {
    return null;
  }
}

async function fetchAllAssignments() {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ccshau_faculty_assignments")
      .select("id, designation_en, designation_hi, specialization_en, specialization_hi")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function main() {
  console.log(`faculty_assignments Hindi | ${APPLY ? "APPLY" : "dry-run"}`);
  const rows = await fetchAllAssignments();
  console.log(`Rows: ${rows.length}`);

  const stats = {
    scanned: 0,
    updated: 0,
    designation: 0,
    specialization: 0,
    skippedAlready: 0,
    failedDesignation: 0,
    failedSpecialization: 0,
  };

  for (const row of rows) {
    stats.scanned++;
    if (LIMIT != null && stats.updated >= LIMIT) break;

    const patch = {};

    if (needsHi(row.designation_en, row.designation_hi)) {
      let hi = mapPhrase(row.designation_en, "designation");
      if (!hi) {
        hi = await translateWithGoogleGtx(row.designation_en);
        await sleep(40);
      }
      if (hi && hasDevanagari(hi)) {
        patch.designation_hi = hi;
        stats.designation++;
      } else {
        stats.failedDesignation++;
        if (stats.failedDesignation <= 20) {
          console.log(`  FAIL desig: ${JSON.stringify(row.designation_en)}`);
        }
      }
    }

    if (needsHi(row.specialization_en, row.specialization_hi)) {
      let hi = mapPhrase(row.specialization_en, "specialization");
      if (!hi) {
        hi = await translateWithGoogleGtx(row.specialization_en);
        await sleep(40);
      }
      if (hi && hasDevanagari(hi)) {
        patch.specialization_hi = hi;
        stats.specialization++;
      } else {
        stats.failedSpecialization++;
        if (stats.failedSpecialization <= 20) {
          console.log(`  FAIL spec: ${JSON.stringify(row.specialization_en)}`);
        }
      }
    }

    if (!Object.keys(patch).length) {
      stats.skippedAlready++;
      continue;
    }

    stats.updated++;
    if (!APPLY) {
      if (stats.updated <= 25) {
        console.log(
          `  WOULD ${row.id}: ${Object.keys(patch).join(", ")}` +
            (patch.designation_hi ? ` | desig=${patch.designation_hi}` : "") +
            (patch.specialization_hi ? ` | spec=${patch.specialization_hi}` : ""),
        );
      }
      continue;
    }

    const { error } = await supabase.from("ccshau_faculty_assignments").update(patch).eq("id", row.id);
    if (error) throw new Error(`${row.id}: ${error.message}`);
    if (stats.updated % 50 === 0) console.log(`  updated ${stats.updated}…`);
  }

  console.log("\nSummary:");
  console.log(`  scanned: ${stats.scanned}`);
  console.log(`  ${APPLY ? "updated" : "would update"}: ${stats.updated}`);
  console.log(`  already ok / no patch: ${stats.skippedAlready}`);
  console.log(`  designation: ${stats.designation}`);
  console.log(`  specialization: ${stats.specialization}`);
  console.log(`  failed designation: ${stats.failedDesignation}`);
  console.log(`  failed specialization: ${stats.failedSpecialization}`);
  if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
