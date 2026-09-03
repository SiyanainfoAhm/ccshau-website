#!/usr/bin/env node
/**
 * Phase 4 — Bawal faculty Hindi (Cursor translation, no Google/Lingva MT).
 *
 * Pipeline:
 *   1. Short fields from curated FACULTY_HI map
 *   2. detail_content_en → Hindi via FACULTY_HTML_PHRASES + BAWAL_FACULTY_CURSOR_PHRASES
 *   3. Optional blocks-translated.json (Cursor-authored HTML blocks)
 *   4. Optional per-profile *-hi.html overrides
 *
 * Usage:
 *   node scripts/ops/apply-bawal-phase4-faculty.mjs
 *   node scripts/ops/apply-bawal-phase4-faculty.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml, hasDevanagari } from "./faculty-html-translate.mjs";
import { BAWAL_FACULTY_CURSOR_PHRASES } from "./bawal-faculty-cursor-phrases.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const DEPT_SLUG = "bawal-agriculture-college";
const PROFILE_DIR = join(ROOT, "Documents/hindi-faculty/bawal-profiles");

/** staff id → curated short-field Hindi (from fix-bawal-faculty-hindi.mjs). */
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
    specialization_hi: "कृषि विपणन और उत्पादन अर्थशास्त्र",
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

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}
function isMixed(t) {
  return hasDevanagari(t) && hasLatin(t);
}
function devanagariRatio(text) {
  const plain = (text ?? "").replace(/<[^>]+>/g, " ");
  const dev = (plain.match(/[\u0900-\u097F]/g) ?? []).length;
  return dev / Math.max(plain.replace(/\s+/g, "").length, 1);
}
function normalizeHtml(html) {
  return html.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

function loadBlockMap() {
  const path = join(PROFILE_DIR, "blocks-translated.json");
  if (!existsSync(path)) return new Map();
  const data = JSON.parse(readFileSync(path, "utf8"));
  const map = new Map();
  for (const b of data.blocks ?? []) {
    if (b.en_html && b.hi_html) {
      map.set(b.en_html, b.hi_html);
      const norm = normalizeHtml(b.en_html);
      if (norm !== b.en_html) map.set(norm, b.hi_html);
    }
  }
  return map;
}

function applyBlockMap(html, blockMap) {
  let out = html;
  const entries = [...blockMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of entries) {
    if (out.includes(en)) {
      out = out.split(en).join(hi);
      continue;
    }
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    out = out.replace(new RegExp(escaped, "g"), hi);
  }
  return out;
}

function translateProfileCursor(htmlEn, blockMap) {
  if (!htmlEn?.trim()) return null;

  let html = normalizeHtml(htmlEn);
  html = translateFacultyProfileHtml(html) ?? html;
  for (const [en, hi] of BAWAL_FACULTY_CURSOR_PHRASES) {
    if (html.includes(en)) html = html.split(en).join(hi);
  }
  html = applyBlockMap(html, blockMap);
  return html;
}

function shouldRetranslate(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim() || !hasDevanagari(hi)) return true;
  if (isMixed(hi)) return true;
  return devanagariRatio(hi) < 0.35;
}

const blockMap = loadBlockMap();

const { data: dept } = await supabase.from("ccshau_pages").select("id").eq("slug", DEPT_SLUG).maybeSingle();
if (!dept) throw new Error(`Department not found: ${DEPT_SLUG}`);

const { data: staffRows } = await supabase
  .from("ccshau_page_staff")
  .select("id, name_en, detail_content_en, detail_content_hi")
  .eq("page_id", dept.id)
  .eq("is_active", true)
  .order("sort_order");

let updated = 0;
let synced = 0;

console.log(`Phase 4 faculty (Bawal) | ${APPLY ? "APPLY" : "dry-run"} | Cursor phrases (no MT)`);

for (const row of staffRows ?? []) {
  const en = row.detail_content_en?.trim();
  if (!en) continue;

  const hiFields = FACULTY_HI[row.id] ?? {};
  const overridePath = join(PROFILE_DIR, `${row.id}-hi.html`);
  const slugOverride = existsSync(join(PROFILE_DIR, "manifest.json"))
    ? JSON.parse(readFileSync(join(PROFILE_DIR, "manifest.json"), "utf8")).staff.find((s) => s.id === row.id)?.hi_file
    : null;
  const hiFilePath = slugOverride ? join(ROOT, slugOverride) : overridePath;

  let detailHi = translateProfileCursor(en, blockMap);

  const ratio = devanagariRatio(detailHi);
  const patch = { ...hiFields, detail_content_hi: detailHi };

  console.log(
    `\n${row.name_en} — Hindi ${(ratio * 100).toFixed(1)}% | mixed=${isMixed(detailHi)} | blocks=${blockMap.size}`,
  );

  if (!detailHi || !hasDevanagari(detailHi)) {
    console.log("  SKIP (no Hindi produced)");
    continue;
  }

  if (!APPLY) {
    const outHi = hiFilePath.endsWith("-hi.html") ? hiFilePath : join(PROFILE_DIR, `${row.id}-hi.html`);
    writeFileSync(outHi, detailHi, "utf8");
    continue;
  }

  writeFileSync(hiFilePath, detailHi, "utf8");

  const { error } = await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
  if (error) throw new Error(`${row.name_en}: ${error.message}`);

  const { data: assignment } = await supabase
    .from("ccshau_faculty_assignments")
    .select("id, person_id")
    .eq("source_staff_id", row.id)
    .eq("is_active", true)
    .maybeSingle();

  if (assignment) {
    const personPatch = {};
    if (patch.name_hi) personPatch.name_hi = patch.name_hi;
    if (patch.specialization_hi) personPatch.specialization_hi = patch.specialization_hi;
    if (patch.qualification_hi) personPatch.qualification_hi = patch.qualification_hi;
    if (patch.detail_content_hi) personPatch.detail_content_hi = patch.detail_content_hi;
    if (Object.keys(personPatch).length) {
      await supabase.from("ccshau_faculty_people").update(personPatch).eq("id", assignment.person_id);
    }
    const assignPatch = {};
    if (patch.designation_hi) assignPatch.designation_hi = patch.designation_hi;
    if (patch.specialization_hi) assignPatch.specialization_hi = patch.specialization_hi;
    if (Object.keys(assignPatch).length) {
      await supabase.from("ccshau_faculty_assignments").update(assignPatch).eq("id", assignment.id);
    }
    synced++;
  }
  updated++;
}

console.log(`\nUpdated: ${updated} | Synced: ${synced}`);
