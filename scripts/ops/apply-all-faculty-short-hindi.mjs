#!/usr/bin/env node
/**
 * Apply Hindi name_hi, designation_hi, specialization_hi for all faculty/staff
 * across every college/directorate microsite. Syncs to faculty_people/assignments.
 *
 * Usage:
 *   node scripts/ops/apply-all-faculty-short-hindi.mjs
 *   node scripts/ops/apply-all-faculty-short-hindi.mjs --apply
 *   node scripts/ops/apply-all-faculty-short-hindi.mjs --apply --college=college-of-agriculture-hisar
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FACULTY_HTML_PHRASES, hasDevanagari } from "./faculty-html-translate.mjs";
import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const collegeFilter = process.argv.find((a) => a.startsWith("--college="))?.split("=")[1];

const PHRASES = [...FACULTY_HTML_PHRASES].sort((a, b) => b[0].length - a[0].length);

const EXTRA_PHRASES = [
  // Designations
  ["Assistant Nematologist (Stage II)", "सहायक सूत्रकृमि विज्ञ (द्वितीय स्तर)"],
  ["Junior Nematologist (Stage II)", "कनिष्ठ सूत्रकृमि विज्ञ (द्वितीय स्तर)"],
  ["Assistant Entomologist (Stage III)", "सहायक कीट विज्ञ (तृतीय स्तर)"],
  ["Assistant Entomologist (Stage II)", "सहायक कीट विज्ञ (द्वितीय स्तर)"],
  ["Assistant Entomologist", "सहायक कीट विज्ञ"],
  ["Assistant Agronomist (Stage-III)", "सहायक कृषि विज्ञ (तृतीय स्तर)"],
  ["Assistant Horticulturist", "सहायक उद्यान विशेषज्ञ"],
  ["Assistant Vegetable Physiologist (Hort.)", "सहायक सब्जी शारीरिकी विज्ञ (उद्यान)"],
  ["Assoc. Prof. Culture", "सहयोगी प्रोफेसर (संस्कृति)"],
  ["President, Graphics Arts Society", "अध्यक्ष, ग्राफिक कला समिति"],
  ["Lady Hostel Warden", "महिला छात्रावास वार्डन"],
  ["Game Organizer", "खेल आयोजक"],
  ["Instructor, Dress Designing", "प्रशिक्षक, वस्त्र डिजाइन"],
  ["Instructor, Textile Designing", "प्रशिक्षक, वस्त्र डिजाइन"],
  ["Executive Engineer (Maintenance) (Additional Charge)", "कार्यकारी अभियंता (रखरखाव) (अतिरिक्त प्रभार)"],
  ["Executive Engineer (Construction)", "कार्यकारी अभियंता (निर्माण)"],
  ["Executive Engineer (PH) (Additional Charge)", "कार्यकारी अभियंता (पी.एच.) (अतिरिक्त प्रभार)"],
  ["Executive Engineer (outstations)", "कार्यकारी अभियंता (बाह्य केंद्र)"],
  ["Test Engineer RRS Karnal", "परीक्षण अभियंता, आर.आर.एस. करनाल"],
  ["Foreman (Instrument)", "फोरमैन (यंत्र)"],
  ["OSD (Finance)", "ओ.एस.डी. (वित्त)"],
  ["AD (FAS)", "ए.डी. (एफ.ए.एस.)"],
  ["Senior scientist", "वरिष्ठ वैज्ञानिक"],
  ["Sr. DES", "वरिष्ठ डी.ई.एस."],
  ["Junior Agronomist", "कनिष्ठ कृषि विज्ञ"],
  ["Jr. Agronomist", "कनिष्ठ कृषि विज्ञ"],
  ["Chairman", "अध्यक्ष"],
  ["President", "अध्यक्ष"],
  ["Faculty", "संकाय"],
  ["HOD", "विभागाध्यक्ष"],
  ["DES", "डी.ई.एस."],
  ["S.D.E.", "एस.डी.ई."],
  ["SDE", "एस.डी.ई."],
  ["J. E.", "जूनियर इंजीनियर"],
  ["J.E.", "जूनियर इंजीनियर"],
  ["JE", "जूनियर इंजीनियर"],
  // Specializations — agriculture & sciences
  ["Vegetable Grafting and Protected Cultivation", "सब्जी ग्राफ्टिंग और संरक्षित खेती"],
  ["Vegetable Breeding", "सब्जी प्रजनन"],
  ["Vegetable Production", "सब्जी उत्पादन"],
  ["Vegetable Pathology", "सब्जी रोग विज्ञान"],
  ["Cotton Pathology", "कपास रोग विज्ञान"],
  ["Cotton Breeding", "कपास प्रजनन"],
  ["Maize Breeding", "मक्का प्रजनन"],
  ["Maize Pathology", "मक्का रोग विज्ञान"],
  ["Wheat Breeding", "गेहूँ प्रजनन"],
  ["Barley Breeding", "जौ प्रजनन"],
  ["Pulses Breeding", "दलहन प्रजनन"],
  ["Rapeseed-Mustard Breeding", "सरसों प्रजनन"],
  ["Sugarcane Breeding", "गन्ना प्रजनन"],
  ["Sugarcane Pathology", "गन्ना रोग विज्ञान"],
  ["Sugarcane Nutrient Management", "गन्ना पोषक तत्व प्रबंधन"],
  ["Bajra Pathology", "बाजरा रोग विज्ञान"],
  ["Oilseeds Pathology", "तिलहन रोग विज्ञान"],
  ["Forage Pathology", "चारा रोग विज्ञान"],
  ["Rice Pathology", "धान रोग विज्ञान"],
  ["Fungal Pathology", "कवक रोग विज्ञान"],
  ["Plant Virology", "पादप वाइरोलॉजी"],
  ["Plant Pahtology", "पादप रोग विज्ञान"],
  ["Plant physiology", "पादप शरीर क्रिया विज्ञान"],
  ["Biological Control of Plant Diseases", "पादप रोगों का जैव नियंत्रण"],
  ["Bio-control of plant Disease", "पादप रोगों का जैव नियंत्रण"],
  ["Crop production", "फसल उत्पादन"],
  ["Integrated Farming Systems", "एकीकृत कृषि प्रणाली"],
  ["Integrated Nutrient Management", "एकीकृत पोषक तत्व प्रबंधन"],
  ["Weed Science, Conservation agriculture", "खरपतवार विज्ञान, संरक्षण कृषि"],
  ["Weed Science", "खरपतवार विज्ञान"],
  ["Irrigation water management", "सिंचाई जल प्रबंधन"],
  ["Water Management Resource conservation", "जल प्रबंधन संसाधन संरक्षण"],
  ["Micro-irrigation", "सूक्ष्म सिंचाई"],
  ["Soil Fertility, Organic matter", "मृदा उर्वरता, जैविक पदार्थ"],
  ["Soil Salinity/Fertility", "मृदा लवणता/उर्वरता"],
  ["Soil Management", "मृदा प्रबंधन"],
  ["Pedology", "मृदा विज्ञान"],
  ["Agro-forestry", "कृषि वानिकी"],
  ["Agroforestry", "कृषि वानिकी"],
  ["Forest Genetics", "वन आनुवंशिकी"],
  ["Fruit Production", "फल उत्पादन"],
  ["Fruit Science", "फल विज्ञान"],
  ["Production Technology - Arid fruits", "उत्पादन प्रौद्योगिकी — शुष्क फल"],
  ["Farming system agronomist", "कृषि प्रणाली agronomist"],
  ["GIS, Remote Sensing, Cartography,", "जी.आई.एस., दूरसंवेदन, मानचित्र निर्माण"],
  ["Genetics", "आनुवंशिकी"],
  ["Agribusiness", "कृषि व्यवसाय"],
  ["Finance", "वित्त"],
  ["Human Resource Management", "मानव संसाधन प्रबंधन"],
  ["Management Science", "प्रबंधन विज्ञान"],
  ["MARKETING MANAGEMENT", "विपणन प्रबंधन"],
  ["Mass Communication", "जन संचार"],
  ["Time Series Analysis", "काल श्रृंखला विश्लेषण"],
  ["DBMS, Statistical Analysis", "डी.बी.एम.एस., सांख्यिकीय विश्लेषण"],
  ["Reliability Theory", "विश्वसनीयता सिद्धांत"],
  ["EECM", "ई.ई.सी.एम."],
  ["LIS", "एल.आई.एस."],
  ["Economic Entomoloy", "आर्थिक कीट विज्ञान"],
  ["Insect Taxonomy", "कीट वर्गिकी"],
  ["Animal Taxonomy", "प्राणि वर्गिकी"],
  ["Rodentology", "कृंतक विज्ञान"],
  ["Fisheries Science", "मत्स्य विज्ञान"],
  ["Fisheries", "मत्स्य पालन"],
  ["Fish Processing Technology", "मत्स्य प्रसंस्करण प्रौद्योगिकी"],
  ["Aquatic Environment Management", "जलीय पर्यावरण प्रबंधन"],
  ["Vermi-Fish Technology", "वर्मी-मत्स्य प्रौद्योगिकी"],
  ["Post Harvest Processing of Agricultural Produce", "कृषि उत्पाद का कटाई-पश्चात प्रसंस्करण"],
  ["Storage of durable commodities", "टिकाऊ वस्तुओं का भंडारण"],
  ["Agriculture Bio-nanotechnology", "कृषि जैव-नैनो प्रौद्योगिकी"],
  ["Bio-nanotechnology", "जैव-नैनो प्रौद्योगिकी"],
  ["Bio Sensors,Nano Fomulations Molecular", "जैव सेंसर, नैनो फॉर्मूलेशन, आणविक"],
  ["Bioenergy, Bioprocess Engineering, Lignocellulosic Ethanol, Fermentation", "जैव ऊर्जा, जैव प्रक्रम अभियांत्रिकी, लिग्नोसेलulosic इथेनॉल, किण्वन"],
  ["Bioinformatics, Transcriptomics", "जैव सूचना विज्ञान, ट्रांसक्रिप्टोमिक्स"],
  ["Drug Discovery, Malaria, Industrial Enzymes", "दवा खोज, मलेरिया, औद्योगिक एंजाइम"],
  ["MD Simulations, Machine Learning, Phylogenetics", "एम.डी. सिमुलेशन, मशीन लर्निंग, phylogenetics"],
  ["Composite Materials, Advanced Machining Processes, Optimization Techniques", "समग्र सामग्री, उन्नत मशीनिंग प्रक्रियाएँ, अनुकूलन तकनीक"],
  ["Energy Storage System, Microgrid, AGC", "ऊर्जा भंडारण प्रणाली, माइक्रोग्रिड, ए.जी.सी."],
  ["Mechanical Engineering", "यांत्रिक अभियांत्रिकी"],
  // Home science / textiles / sports
  ["Apparel Designing, Computer Aided Designing", "परिधान डिजाइन, कंप्यूटर सहायित डिजाइन"],
  ["Textile Designing, Computer Aided Designing", "वस्त्र डिजाइन, कंप्यूटर सहायित डिजाइन"],
  ["Textile Dyeing/Textile Finishing/Computer Aided Designing", "वस्त्र रंगाई/वस्त्र finishing/कंप्यूटर सहायित डिजाइन"],
  ["Textile Science/Computer Aided Designing", "वस्त्र विज्ञान/कंप्यूटर सहायित डिजाइन"],
  ["Wet Processing of Textiles, Computer Aided Designing", "वस्त्रों की गीली प्रक्रिया, कंप्यूटर सहायित डिजाइन"],
  ["Resist Dyeing Techniques, Textile   Handicrafts ,  Herbal Textiles , Computer aided designing", "रेजिस्ट डाइंग तकनीक, वस्त्र हस्तशिल्प, herbal textiles, कंप्यूटर सहायित डिजाइन"],
  ["Family Resource Management", "पारिवारिक संसाधन प्रबंधन"],
  ["Human Development, Cognition, Behaviour Studies , Parenting", "मानव विकास, संज्ञान, व्यवहार अध्ययन, parenting"],
  ["Human Development, Cognition, Twin  Studies", "मानव विकास, संज्ञान, जुड़वाँ अध्ययन"],
  ["Human Development, Parenting, Behaviour  Studies", "मानव विकास, parenting, व्यवहार अध्ययन"],
  ["Clinical trials, Food, Human Nutrition, Dietetics, Lipid mediators", "नैदानिक परीक्षण, खाद्य, मानव पोषण, dietetics, lipid mediators"],
  ["Food Science/Food Safety/Product Development/Value Addition", "खाद्य विज्ञान/खाद्य सुरक्षा/उत्पाद विकास/मूल्य संवर्धन"],
  ["Food Science/Human Nutrition/Product Development", "खाद्य विज्ञान/मानव पोषण/उत्पाद विकास"],
  ["Therapeutic Foods/ Community Nutrition/ Value Addition", "चिकित्सीय खाद्य/सामुदायिक पोषण/मूल्य संवर्धन"],
  ["Environment/Ergonomics/Energy/Gerontology/Women Studies", "पर्यावरण/ergonomics/ऊर्जा/gerontology/महिला अध्ययन"],
  ["Boxing", "मुक्केबाजी"],
  ["Volleyball", "वॉलीबॉल"],
  ["Wrestling", "कुश्ती"],
  ["Table Tennis, Badminton", "टेबल टेनिस, बैडमिंटन"],
  // Common role phrases
  ["Assistant Vegetable Breeder", "सहायक सब्जी प्रजनक"],
  ["Project Director", "परियोजना निदेशक"],
  ["Consultant Faculty", "सलाहकार संकाय"],
  ["Consultant", "सलाहकार"],
  ["Agricultural Meteorology", "कृषि मौसम विज्ञान"],
  ["Agricultural Meterology", "कृषि मौसम विज्ञान"],
  ["Plant Pathology", "पादप रोग विज्ञान"],
  ["Plant Breeding", "पादप प्रजनन"],
  ["Soil Science", "मृदा विज्ञान"],
  ["Entomology", "कीट विज्ञान"],
  ["Horticulture", "उद्यान विज्ञान"],
  ["Extension Education", "विस्तार शिक्षा"],
  ["Farm Management", "खेत प्रबंधन"],
  ["Statistics", "सांख्यिकी"],
  ["Mathematics", "गणित"],
  ["Biochemistry", "जैव रसायन"],
  ["Microbiology", "सूक्ष्म जीव विज्ञान"],
  ["Biotechnology", "जैव प्रौद्योगिकी"],
  ["Forestry", "वानिकी"],
  ["Zoology", "प्राणि विज्ञान"],
  ["Botany", "वनस्पति विज्ञान"],
  ["Chemistry", "रसायन विज्ञान"],
  ["Physics", "भौतिकी"],
  ["Sociology", "समाजशास्त्र"],
  ["Economics", "अर्थशास्त्र"],
  ["Agronomy", "कृषि विज्ञान"],
  ["Nematology", "सूत्रकृमि विज्ञान"],
  ["Seed Science", "बीज विज्ञान"],
  ["Teaching", "शिक्षण"],
  ["Research", "अनुसंधान"],
  ["Extension", "विस्तार"],
  ["Professor & Head", "प्रोफेसर एवं विभागाध्यक्ष"],
  ["Professor and Head", "प्रोफेसर एवं विभागाध्यक्ष"],
  ["Professor & Dean", "प्रोफेसर एवं डीन"],
  ["Associate Dean", "सहयोगी डीन"],
  ["Associate Director", "संबद्ध निदेशक"],
  ["Director", "निदेशक"],
  ["Deputy Director", "उप निदेशक"],
  ["Scientist", "वैज्ञानिक"],
  ["Breeder", "प्रजनक"],
  ["Pathologist", "रोग विज्ञ"],
  ["Economist", "अर्थशास्त्री"],
  ["Extension Specialist", "विस्तार विशेषज्ञ"],
  ["Subject Matter Specialist", "विषय विशेषज्ञ"],
  ["Head", "प्रमुख"],
  ["Incharge", "प्रभारी"],
  ["Officer", "अधिकारी"],
  ["cum", "सह"],
  ["&", " एवं "],
  [" and ", " एवं "],
];

const ALL_PHRASES = [...EXTRA_PHRASES, ...PHRASES].sort((a, b) => b[0].length - a[0].length);

const INITIALS = {
  a: "ए", b: "बी", c: "सी", d: "डी", e: "ई", f: "एफ", g: "जी", h: "एच",
  i: "आई", j: "जे", k: "के", l: "एल", m: "एम", n: "एन", o: "ओ", p: "पी",
  q: "क्यू", r: "आर", s: "एस", t: "टी", u: "यू", v: "वी", w: "डब्ल्यू",
  x: "एक्स", y: "वाई", z: "जेड",
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

function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (hi.trim() === en.trim()) return true;
  if (!hasDevanagari(hi)) return true;
  return false;
}

function mapPhrase(text) {
  if (!text?.trim()) return text;
  let out = text.trim();
  for (const [en, hi] of ALL_PHRASES) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  return out.replace(/\s+/g, " ").trim();
}

function transliterateToken(token) {
  const t = token.replace(/\./g, "").toLowerCase();
  if (t.length === 1 && INITIALS[t]) return `${INITIALS[t]}.`;
  if (/^[a-z]\.$/i.test(token) && INITIALS[t]) return `${INITIALS[t]}.`;

  const map = {
    a: "ा", b: "ब", c: "क", d: "ड", e: "े", f: "फ", g: "ग", h: "ह", i: "ि",
    j: "ज", k: "क", l: "ल", m: "म", n: "न", o: "ो", p: "प", q: "क", r: "र",
    s: "स", t: "ट", u: "ु", v: "व", w: "व", x: "क्स", y: "य", z: "ज",
    sh: "श", ch: "च", th: "थ", dh: "ध", kh: "ख", gh: "घ", ph: "फ", bh: "भ",
    au: "ौ", ai: "ै", ee: "ी", oo: "ू", aa: "ा",
  };
  let result = "";
  const lower = token.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const two = lower.slice(i, i + 2);
    if (map[two]) {
      result += map[two];
      i += 1;
    } else if (map[lower[i]]) {
      result += map[lower[i]];
    } else {
      result += token[i] ?? lower[i];
    }
  }
  return result;
}

function transliterateName(name) {
  if (!name?.trim()) return name;
  let raw = name.trim();
  let prefix = "";
  if (/^dr\.?\s*/i.test(raw)) {
    prefix = "डॉ. ";
    raw = raw.replace(/^dr\.?\s*/i, "");
  } else if (/^prof\.?\s*/i.test(raw)) {
    prefix = "प्रो. ";
    raw = raw.replace(/^prof\.?\s*/i, "");
  }
  raw = raw.replace(/\(Mrs?\.?\)/gi, "(श्रीमती)").replace(/\(Ms\.?\)/gi, "(सुश्री)");

  const parts = raw.split(/\s+/).map((part) => {
    if (/^[A-Za-z]\.$/.test(part)) return transliterateToken(part);
    if (/^[A-Za-z]{1,2}\.$/.test(part)) return transliterateToken(part);
    return transliterateToken(part);
  });

  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return (prefix + joined).trim();
}

async function syncFaculty(staffId, patch) {
  const { data: assignment } = await supabase
    .from("ccshau_faculty_assignments")
    .select("id, person_id")
    .eq("source_staff_id", staffId)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) return false;

  const personPatch = {};
  if (patch.name_hi) personPatch.name_hi = patch.name_hi;
  if (patch.specialization_hi) personPatch.specialization_hi = patch.specialization_hi;

  const assignmentPatch = {};
  if (patch.designation_hi) assignmentPatch.designation_hi = patch.designation_hi;
  if (patch.specialization_hi) assignmentPatch.specialization_hi = patch.specialization_hi;

  if (Object.keys(personPatch).length) {
    await supabase.from("ccshau_faculty_people").update(personPatch).eq("id", assignment.person_id);
  }
  if (Object.keys(assignmentPatch).length) {
    await supabase.from("ccshau_faculty_assignments").update(assignmentPatch).eq("id", assignment.id);
  }
  return true;
}

async function processCollege(college) {
  const { pageIds } = await resolveStaffPageIds(supabase, college.id, { publishedOnly: true });
  if (!pageIds.length) return { updated: 0, synced: 0, remaining: 0 };

  const { data: staff } = await supabase
    .from("ccshau_page_staff")
    .select("id, name_en, name_hi, designation_en, designation_hi, specialization_en, specialization_hi")
    .in("page_id", pageIds)
    .eq("is_active", true);

  let updated = 0;
  let synced = 0;
  let remaining = 0;

  for (const row of staff ?? []) {
    const patch = {};

    if (needsHi(row.name_en, row.name_hi)) {
      const nameHi = transliterateName(row.name_en);
      if (hasDevanagari(nameHi)) patch.name_hi = nameHi;
    }

    if (needsHi(row.designation_en, row.designation_hi)) {
      const desHi = mapPhrase(row.designation_en);
      if (hasDevanagari(desHi)) patch.designation_hi = desHi;
    }

    const specSource = row.specialization_en || row.specialization_hi;
    if (needsHi(specSource, row.specialization_hi)) {
      const specHi = mapPhrase(specSource);
      if (hasDevanagari(specHi)) patch.specialization_hi = specHi;
    }

    if (!Object.keys(patch).length) continue;

    if (
      (patch.name_hi && !hasDevanagari(patch.name_hi)) ||
      (patch.designation_hi && !hasDevanagari(patch.designation_hi)) ||
      (patch.specialization_hi && !hasDevanagari(patch.specialization_hi))
    ) {
      remaining += 1;
      continue;
    }

    if (!APPLY) {
      updated += 1;
      continue;
    }

    const { error } = await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
    if (error) throw error;
    updated += 1;
    if (await syncFaculty(row.id, patch)) synced += 1;
  }

  return { updated, synced, remaining, total: staff?.length ?? 0 };
}

async function main() {
  const { data: allColleges } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, college_root_id")
    .eq("page_type", "college")
    .order("slug");

  let roots = (allColleges ?? []).filter((p) => p.college_root_id === p.id);
  if (collegeFilter) roots = roots.filter((r) => r.slug === collegeFilter);

  console.log(`Microsites: ${roots.length}`);

  let totalUpdated = 0;
  let totalSynced = 0;
  let totalRemaining = 0;
  let totalStaff = 0;

  for (const college of roots) {
    const result = await processCollege(college);
    totalUpdated += result.updated;
    totalSynced += result.synced;
    totalRemaining += result.remaining;
    totalStaff += result.total;
    if (result.updated || result.remaining) {
      console.log(
        `  ${college.slug}: staff=${result.total}, ${APPLY ? "updated" : "would update"}=${result.updated}, synced=${result.synced}, unmapped=${result.remaining}`,
      );
    }
  }

  console.log(
    `\nTotal staff scanned: ${totalStaff}, ${APPLY ? "updated" : "would update"}: ${totalUpdated}, synced: ${totalSynced}, unmapped: ${totalRemaining}`,
  );

  if (!APPLY) console.log("\nDry-run only. Pass --apply to write to database.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
