#!/usr/bin/env node
/**
 * Translate missing Hindi fields on ccshau_page_staff.
 * Skips fields that already have Devanagari Hindi.
 *
 * Usage:
 *   node scripts/ops/apply-page-staff-hindi.mjs
 *   node scripts/ops/apply-page-staff-hindi.mjs --apply
 *   node scripts/ops/apply-page-staff-hindi.mjs --apply --short-only
 *   node scripts/ops/apply-page-staff-hindi.mjs --apply --limit=50
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml, hasDevanagari, FACULTY_HTML_PHRASES } from "./faculty-html-translate.mjs";
import { EXACT_DESIGNATION_HI, QUALIFICATION_PHRASES } from "./faculty-designation-hindi.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SHORT_ONLY = process.argv.includes("--short-only");
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
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PHRASES = [...FACULTY_HTML_PHRASES].sort((a, b) => b[0].length - a[0].length);

const EXTRA_PHRASES = [
  ["District Extension Specialist (Officiating as Sr. Coordinator)", "जिला विस्तार विशेषज्ञ (कार्यकारी वरिष्ठ समन्वयक)"],
  ["District Extension Specialist (Agronomy)", "जिला विस्तार विशेषज्ञ (कृषि विज्ञान)"],
  ["District Extension specialist", "जिला विस्तार विशेषज्ञ"],
  ["District Extension Specialist", "जिला विस्तार विशेषज्ञ"],
  ["District Extension Speciali", "जिला विस्तार विशेषज्ञ"],
  ["Sr. District Extension Specialist", "वरिष्ठ जिला विस्तार विशेषज्ञ"],
  ["Training Assistant (TA)", "प्रशिक्षण सहायक"],
  ["Training Assistant", "प्रशिक्षण सहायक"],
  ["Assistant Scientist ( Plant Pathology)", "सहायक वैज्ञानिक (पादप रोग विज्ञान)"],
  ["Assistant Scientist (Plant Pathology)", "सहायक वैज्ञानिक (पादप रोग विज्ञान)"],
  ["DES (Agril. Engineering )", "डी.ई.एस. (कृषि अभियांत्रिकी)"],
  ["DES (Agril. Engineering)", "डी.ई.एस. (कृषि अभियांत्रिकी)"],
  ["DES (Horticulture- Fruit Science)", "डी.ई.एस. (उद्यान विज्ञान — फल विज्ञान)"],
  ["DES (Vegetable Science)", "डी.ई.एस. (सब्जी विज्ञान)"],
  ["DES (Agro Forestry)", "डी.ई.एस. (कृषि वानिकी)"],
  ["DES (Home Science)", "डी.ई.एस. (गृह विज्ञान)"],
  ["DES (Soil Science)", "डी.ई.एस. (मृदा विज्ञान)"],
  ["DES (Plant Pathology)", "डी.ई.एस. (पादप रोग विज्ञान)"],
  ["DES (Pl. Patho.)", "डी.ई.एस. (पादप रोग विज्ञान)"],
  ["DES (Agronomy)", "डी.ई.एस. (कृषि विज्ञान)"],
  ["DES (Entomology)", "डी.ई.एस. (कीट विज्ञान)"],
  ["DES (Forestry)", "डी.ई.एस. (वानिकी)"],
  ["DES (Agril. Econ.)", "डी.ई.एस. (कृषि अर्थशास्त्र)"],
  ["DES (Ext. Edu.)", "डी.ई.एस. (विस्तार शिक्षा)"],
  ["DES, KVK (Bawal)", "डी.ई.एस., कृषि विज्ञान केंद्र (बावल)"],
  ["Assoc. Professor", "सहयोगी प्रोफेसर"],
  ["Associate Professor", "सहयोगी प्रोफेसर"],
  ["Assistant Professor", "सहायक प्रोफेसर"],
  ["Senior Scientist", "वरिष्ठ वैज्ञानिक"],
  ["Senior Coordinator", "वरिष्ठ समन्वयक"],
  ["Coordinator", "समन्वयक"],
  ["Professor", "प्रोफेसर"],
  ["Agronomy, Resource conservation technologies", "कृषि विज्ञान, संसाधन संरक्षण प्रौद्योगिकियाँ"],
  ["Home Science (Extension Education and Communication Management)", "गृह विज्ञान (विस्तार शिक्षा एवं संचार प्रबंधन)"],
  ["Soil Science (Soil and water analysis)", "मृदा विज्ञान (मृदा एवं जल विश्लेषण)"],
  ["Propagation of Planting material, seed priming, image processing etc.", "रोपण सामग्री का प्रवर्धन, बीज प्राइमिंग, छवि प्रसंस्करण आदि"],
  ["Vegetable Breeding and Biotechnology", "सब्जी प्रजनन एवं जैव प्रौद्योगिकी"],
  ["Soil Fertility and Water Management", "मृदा उर्वरता एवं जल प्रबंधन"],
  ["Soil Fertility, Micronutrients", "मृदा उर्वरता, सूक्ष्म पोषक तत्व"],
  ["Soil and Water Engineering", "मृदा एवं जल अभियांत्रिकी"],
  ["Transfer of Technology", "प्रौद्योगिकी हस्तांतरण"],
  ["Agricultural Marketing", "कृषि विपणन"],
  ["Agril. Extension Education", "कृषि विस्तार शिक्षा"],
  ["Agril. Entomology", "कृषि कीट विज्ञान"],
  ["Agri. Economics", "कृषि अर्थशास्त्र"],
  ["Animal Nutrition", "पशु पोषण"],
  ["Farm Management", "फार्म प्रबंधन"],
  ["Crop production", "फसल उत्पादन"],
  ["Weed Management", "खरपतवार प्रबंधन"],
  ["Textile and designing", "वस्त्र एवं डिजाइन"],
  ["Vegetable Science", "सब्जी विज्ञान"],
  ["Plant Pathology", "पादप रोग विज्ञान"],
  ["Resource conservation technologies", "संसाधन संरक्षण प्रौद्योगिकियाँ"],
  ["Soil Science", "मृदा विज्ञान"],
  ["Home Science", "गृह विज्ञान"],
  ["Agro Forestry", "कृषि वानिकी"],
  ["Agroforestry", "कृषि वानिकी"],
  ["Entomology", "कीट विज्ञान"],
  ["Agronomy", "कृषि विज्ञान"],
  ["DES", "डी.ई.एस."],
];

const ALL_PHRASES = [...EXTRA_PHRASES, ...PHRASES].sort((a, b) => b[0].length - a[0].length);

const INITIALS = {
  a: "ए", b: "बी", c: "सी", d: "डी", e: "ई", f: "एफ", g: "जी", h: "एच",
  i: "आई", j: "जे", k: "के", l: "एल", m: "एम", n: "एन", o: "ओ", p: "पी",
  q: "क्यू", r: "आर", s: "एस", t: "टी", u: "यू", v: "वी", w: "डब्ल्यू",
  x: "एक्स", y: "वाई", z: "जेड",
};

const NAME_OVERRIDES = {
  "Dr. Sandeep Rawal": "डॉ. संदीप रावल",
  "Sh. Anil Kumar": "श्री अनिल कुमार",
  "Mr. Karan Singh Saini": "श्री करण सिंह सैनी",
  "Dr. Aradhana Bali": "डॉ. आराधना बाली",
  "Dr. Vishal Goel": "डॉ. विशाल गोयल",
  "Er. Kapil": "इंजी. कपिल",
  "Dr. Ashma Khan": "डॉ. आश्मा खान",
  "Dr. Narender Kumar": "डॉ. नरेन्द्र कुमार",
  "Dr. Kuldeep Singh": "डॉ. कुलदीप सिंह",
  "Dr. Pankaj": "डॉ. पंकज",
  "Mrs. Yogita Bali Bali": "श्रीमती योगिता बाली",
  "Dr. Krishma Nanda": "डॉ. कृष्मा नंदा",
  "Dr. Mamta": "डॉ. ममता",
  Meenu: "मीनु",
  "Dr. Parmod Kumar": "डॉ. परमोद कुमार",
  "Dr. Satpal Singh": "डॉ. सतपाल सिंह",
  "Dr. Sunil Kumar": "डॉ. सुनील कुमार",
  "Dr. Rajesh Kumar": "डॉ. राजेश कुमार",
  "Mr. Mohit Sehal": "श्री मोहित सेहल",
  "Dr. Kuldeep Dudi": "डॉ. कुलदीप दूदी",
  "Dr. Ashok Dhillon": "डॉ. अशोक ढिल्लों",
  "Dr. Narender Singh": "डॉ. नरेन्द्र सिंह",
  "Dr. Rajpaul Yadav": "डॉ. राजपाल यादव",
  "Dr. Poonam": "डॉ. पूनम",
  "Dr. Naresh Kumar Yadav": "डॉ. नरेश कुमार यादव",
  "Dr. Ashish Shivran": "डॉ. आशीष शिवराण",
  "Dr. M.K. Singh": "डॉ. एम.के. सिंह",
  "Dr. Fateh Singh": "डॉ. फ़तेह सिंह",
  "Dr. Lalita Rani": "डॉ. ललिता रानी",
  "Dr. Sarita Rani": "डॉ. सरिता रानी",
  "Dr. Kavita": "डॉ. कविता",
  "Dr. R.C. Verma": "डॉ. आर.सी. वर्मा",
  "Dr. Gurnam Singh": "डॉ. गुरनाम सिंह",
  "Dr. Jasbir Singh": "डॉ. जसबीर सिंह",
  "Dr. Prashant Kaushik": "डॉ. प्रशांत कौशिक",
  "Dr. Deepak Kumar": "डॉ. दीपक कुमार",
  "Dr. Amit Kumar": "डॉ. अमित कुमार",
  "Dr. Neha Sharma": "डॉ. नेहा शर्मा",
};

function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (hi.trim() === en.trim()) return true;
  if (!hasDevanagari(hi)) return true;
  return false;
}

function mapPhrase(text) {
  if (!text?.trim()) return null;
  let out = text.trim();
  const exact = EXACT_DESIGNATION_HI[out];
  if (exact) return exact;
  for (const [en, hi] of ALL_PHRASES) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  out = out.replace(/\s+/g, " ").trim();
  return hasDevanagari(out) ? out : null;
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
  if (!name?.trim()) return null;
  const override = NAME_OVERRIDES[name.trim()];
  if (override) return override;

  let raw = name.trim();
  let prefix = "";
  if (/^dr\.?\s*/i.test(raw)) {
    prefix = "डॉ. ";
    raw = raw.replace(/^dr\.?\s*/i, "");
  } else if (/^prof\.?\s*/i.test(raw)) {
    prefix = "प्रो. ";
    raw = raw.replace(/^prof\.?\s*/i, "");
  } else if (/^er\.?\s*/i.test(raw)) {
    prefix = "इंजी. ";
    raw = raw.replace(/^er\.?\s*/i, "");
  } else if (/^(sh\.|mr\.|shri)\s*/i.test(raw)) {
    prefix = "श्री ";
    raw = raw.replace(/^(sh\.|mr\.|shri)\s*/i, "");
  } else if (/^(mrs\.|smt\.|shrimati)\s*/i.test(raw)) {
    prefix = "श्रीमती ";
    raw = raw.replace(/^(mrs\.|smt\.|shrimati)\s*/i, "");
  } else if (/^ms\.?\s*/i.test(raw)) {
    prefix = "सुश्री ";
    raw = raw.replace(/^ms\.?\s*/i, "");
  }
  raw = raw.replace(/\(Mrs?\.?\)/gi, "(श्रीमती)").replace(/\(Ms\.?\)/gi, "(सुश्री)");

  const parts = raw.split(/\s+/).map((part) => {
    if (/^[A-Za-z]\.$/.test(part) || /^[A-Za-z]{1,2}\.$/.test(part)) return transliterateToken(part);
    return transliterateToken(part);
  });
  const joined = (prefix + parts.join(" ")).replace(/\s+/g, " ").trim();
  return hasDevanagari(joined) ? joined : null;
}

function mapQualSubject(s) {
  const sub = s.trim();
  const mapped = mapPhrase(sub);
  return mapped ?? sub;
}

function translateQualification(en) {
  if (!en?.trim()) return null;
  if (/^\d+$/.test(en.trim())) return null;
  let out = en.trim();
  out = out.replace(/Ph\.?\s*D\.?\s*\(([^)]+)\)/gi, (_, sub) => `पी.एच.डी. (${mapQualSubject(sub)})`);
  out = out.replace(/Ph\.?\s*D\.?\s*,?\s*/gi, "पी.एच.डी. ");
  out = out.replace(/\bM\.?\s*Sc\.?\s*\(([^)]+)\)/gi, (_, sub) => `एम.एससी. (${mapQualSubject(sub)})`);
  out = out.replace(/\bM\.?\s*Sc\.?\b/gi, "एम.एससी.");
  out = out.replace(/\bM\.?\s*Tech\.?\s*\(([^)]+)\)/gi, (_, sub) => `एम.टेक. (${mapQualSubject(sub)})`);
  out = out.replace(/\bM\.?\s*Tech\.?\b/gi, "एम.टेक.");
  out = out.replace(/\bM\.?\s*V\.?\s*Sc\.?\b/gi, "एम.वी.एससी.");
  out = out.replace(/\bB\.?\s*Sc\.?\b/gi, "बी.एससी.");
  for (const [phrase, hi] of QUALIFICATION_PHRASES) {
    if (out.includes(phrase)) out = out.split(phrase).join(hi);
  }
  const phrasePass = mapPhrase(out);
  if (phrasePass) out = phrasePass;
  return hasDevanagari(out) ? out.replace(/\s+/g, " ").trim() : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeNodeText(text) {
  return text.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isCitationLike(text) {
  if (/\bet\s+al\.?/i.test(text)) return true;
  if (/\bdoi:/i.test(text)) return true;
  if (/\bpp\.\s*\d/i.test(text)) return true;
  if (/\bvol\.?\s*\d/i.test(text)) return true;
  if (/\b(J\.|Journal|Int\. J|Indian J|Annals of|Proc\. )/i.test(text) && /\d{4}/.test(text)) return true;
  return false;
}

function shouldTranslateNode(text) {
  if (!text || text.length < 3 || text.length > 320) return false;
  if (!/[A-Za-z]{3,}/.test(text)) return false;
  if (hasDevanagari(text) && !/[A-Za-z]{4,}/.test(text)) return false;
  if (/https?:\/\//i.test(text)) return false;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return false;
  if (isCitationLike(text)) return false;
  if (/^[\d\s.,\-/;:()%]+$/.test(text)) return false;
  return true;
}

function collectTextNodes(html) {
  const nodes = new Set();
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(html))) {
    const raw = normalizeNodeText(m[1]);
    if (shouldTranslateNode(raw)) nodes.add(raw);
  }
  return [...nodes].sort((a, b) => b.length - a.length).slice(0, 80);
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

async function translateDetailHtml(htmlEn, phraseCache) {
  let html = translateFacultyProfileHtml(htmlEn) ?? htmlEn;
  const nodes = collectTextNodes(html);
  for (const en of nodes) {
    if (!phraseCache.has(en)) {
      const hi = await translateWithGoogleGtx(en);
      phraseCache.set(en, hi && hasDevanagari(hi) && hi !== en ? hi : null);
      await sleep(60);
    }
    const hi = phraseCache.get(en);
    if (hi) html = html.split(en).join(hi);
  }
  return hasDevanagari(html) ? html : null;
}

async function fetchAllStaff() {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ccshau_page_staff")
      .select(
        "id, name_en, name_hi, designation_en, designation_hi, specialization_en, specialization_hi, experience_en, experience_hi, qualification_en, qualification_hi, detail_content_en, detail_content_hi, is_active",
      )
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
  console.log(`page_staff Hindi | ${APPLY ? "APPLY" : "dry-run"}${SHORT_ONLY ? " | short-only" : ""}`);
  const staff = await fetchAllStaff();
  console.log(`Rows: ${staff.length}`);

  const phraseCache = new Map();
  const stats = {
    scanned: 0,
    updated: 0,
    name: 0,
    designation: 0,
    specialization: 0,
    experience: 0,
    qualification: 0,
    detail: 0,
    skippedAlready: 0,
    failedDetail: 0,
  };

  for (const row of staff) {
    stats.scanned++;
    if (LIMIT != null && stats.updated >= LIMIT) break;

    const patch = {};

    if (needsHi(row.name_en, row.name_hi)) {
      const hi = transliterateName(row.name_en);
      if (hi) {
        patch.name_hi = hi;
        stats.name++;
      }
    }
    if (needsHi(row.designation_en, row.designation_hi)) {
      const hi = mapPhrase(row.designation_en) ?? (await translateWithGoogleGtx(row.designation_en));
      if (hi && hasDevanagari(hi)) {
        patch.designation_hi = hi;
        stats.designation++;
      }
    }
    if (needsHi(row.specialization_en, row.specialization_hi)) {
      const hi = mapPhrase(row.specialization_en) ?? (await translateWithGoogleGtx(row.specialization_en));
      if (hi && hasDevanagari(hi)) {
        patch.specialization_hi = hi;
        stats.specialization++;
      }
    }
    if (needsHi(row.qualification_en, row.qualification_hi)) {
      const hi = translateQualification(row.qualification_en) ?? (await translateWithGoogleGtx(row.qualification_en));
      if (hi && hasDevanagari(hi)) {
        patch.qualification_hi = hi;
        stats.qualification++;
      }
    }
    if (needsHi(row.experience_en, row.experience_hi)) {
      const hi = mapPhrase(row.experience_en) ?? (await translateWithGoogleGtx(row.experience_en));
      if (hi && hasDevanagari(hi)) {
        patch.experience_hi = hi;
        stats.experience++;
      }
    }

    if (!SHORT_ONLY && needsHi(row.detail_content_en, row.detail_content_hi)) {
      const hi = await translateDetailHtml(row.detail_content_en, phraseCache);
      if (hi) {
        patch.detail_content_hi = hi;
        stats.detail++;
      } else {
        stats.failedDetail++;
      }
    }

    if (!Object.keys(patch).length) {
      stats.skippedAlready++;
      continue;
    }

    stats.updated++;
    if (!APPLY) {
      if (stats.updated <= 15) {
        console.log(`  WOULD ${row.name_en ?? row.id}: ${Object.keys(patch).join(", ")}`);
      }
      continue;
    }

    const { error } = await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
    if (error) throw new Error(`${row.id}: ${error.message}`);
    if (stats.updated % 25 === 0) console.log(`  updated ${stats.updated}…`);
  }

  console.log("\nSummary:");
  console.log(`  scanned: ${stats.scanned}`);
  console.log(`  ${APPLY ? "updated" : "would update"}: ${stats.updated}`);
  console.log(`  already ok / no patch: ${stats.skippedAlready}`);
  console.log(`  name: ${stats.name}`);
  console.log(`  designation: ${stats.designation}`);
  console.log(`  specialization: ${stats.specialization}`);
  console.log(`  qualification: ${stats.qualification}`);
  console.log(`  experience: ${stats.experience}`);
  console.log(`  detail: ${stats.detail}`);
  console.log(`  detail failed: ${stats.failedDetail}`);
  if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
