#!/usr/bin/env node
/**
 * Hindi for Alumni Association Executive Committee table.
 *
 *   node scripts/ops/apply-alumni-exec-hindi.mjs
 *   node scripts/ops/apply-alumni-exec-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "414babd5-f7b1-493f-b903-f4455846ac80";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

/** Longest-first phrase map. */
const PHRASES = [
  ["Register here for CCSHAU Alumni Details", "सी.सी.एस. एच.ए.यू. पूर्व छात्र विवरण हेतु यहाँ पंजीकरण करें"],
  [
    "CCS HAU Alumni Association Executive Committee (2016-18)",
    "सी.सी.एस. एच.ए.यू. पूर्व छात्र संघ कार्यकारिणी समिति (2016-18)",
  ],
  ["Contact No.", "संपर्क संख्या"],
  ["Office/Dept", "कार्यालय/विभाग"],
  ["Address", "पता"],
  ["Position", "पद"],
  ["Name", "नाम"],
  ["Patron-in-Chief", "मुख्य संरक्षक"],
  ["Sr.  Vice President", "वरिष्ठ उपाध्यक्ष"],
  ["Sr. Vice President", "वरिष्ठ उपाध्यक्ष"],
  ["Vice  President", "उपाध्यक्ष"],
  ["Vice-President (M)", "उपाध्यक्ष (एम)"],
  ["Vice President", "उपाध्यक्ष"],
  ["President, HAUTA", "अध्यक्ष, एच.ए.यू.टी.ए."],
  ["President, ADOs Association", "अध्यक्ष, ए.डी.ओ. संघ"],
  ["President HAU Alumni Assoc. Gurgaon Chapter", "अध्यक्ष, एच.ए.यू. पूर्व छात्र संघ गुरुग्राम अध्याय"],
  ["President", "अध्यक्ष"],
  ["Jt Secretary", "संयुक्त सचिव"],
  ["Secretary", "सचिव"],
  ["Treasurer", "कोषाध्यक्ष"],
  ["Executive Councilor", "कार्यकारी पार्षद"],
  ["Special invitee", "विशेष आमंत्रित"],
  ["Director Students’ Welfare", "निदेशक छात्र कल्याण"],
  ["Director Students' Welfare", "निदेशक छात्र कल्याण"],
  ["Director Students Welfare", "निदेशक छात्र कल्याण"],
  ["Addl. Director Agri. (Retd).", "अतिरिक्त निदेशक कृषि (सेवानिवृत्त)"],
  ["Addl. Director Agri. Haryana (Retd.)", "अतिरिक्त निदेशक कृषि, हरियाणा (सेवानिवृत्त)"],
  ["Vice Chancellor", "कुलपति"],
  ["VC Lodge, CCS HAU Hisar", "कुलपति निवास, सी.सी.एस. एच.ए.यू., हिसार"],
  ["Member Secretary, Alumni Bhawan Construction Committee", "सदस्य सचिव, पूर्व छात्र भवन निर्माण समिति"],
  ["Former DSW", "पूर्व डी.एस.डब्ल्यू."],
  ["Professor (Retd)", "प्रोफेसर (सेवानिवृत्त)"],
  ["Prof. (Vety Surgery)", "प्रोफेसर (पशु चिकित्सा शल्य चिकित्सा)"],
  ["Prof (Nematology)", "प्रोफेसर (निमेटोलॉजी)"],
  ["Prof. (BES)", "प्रोफेसर (बी.ई.एस.)"],
  ["AssocDir (C&P) & Professor (Hort.)", "सहयोगी निदेशक (परामर्श एवं प्लेसमेंट) एवं प्रोफेसर (बागवानी)"],
  ["ADSW &", "ए.डी.एस.डब्ल्यू. एवं"],
  ["Head (Publication)", "प्रमुख (प्रकाशन)"],
  ["Head, Pub. Div., IMD, Lodhi Road, New Delhi", "प्रमुख, प्रकाशन प्रभाग, आई.एम.डी., लोधी रोड, नई दिल्ली"],
  ["HOS Oilseed Section,", "अनुभाग प्रमुख, तिलहन अनुभाग,"],
  ["Home Maker", "गृहणी"],
  ["Business Manager, Cytozyme,", "बिजनेस मैनेजर, साइटोज़ाइम,"],
  ["GM NABARD (Retd.),", "महाप्रबंधक, नाबार्ड (सेवानिवृत्त),"],
  ["Chief Manager, SBBJ (Retd.)", "मुख्य प्रबंधक, एस.बी.बी.जे. (सेवानिवृत्त)"],
  ["Regional Manager, Sarva Haryana Gramin Bank,", "क्षेत्रीय प्रबंधक, सर्व हरियाणा ग्रामीण बैंक,"],
  ["Freelance Designer", "फ्रीलांस डिज़ाइनर"],
  ["Advocate, Dy. AG, ,", "अधिवक्ता, उप महाधिवक्ता,"],
  ["Chamber No. 98, Punjab & Haryana High Court, Chandigarh:", "कक्ष संख्या 98, पंजाब एवं हरियाणा उच्च न्यायालय, चंडीगढ़:"],
  ["Asstt. Scientist, Dept. of FPM&E", "सहायक वैज्ञानिक, एफ.पी.एम. एवं ई. विभाग"],
  ["Asstt Scientist (Ag. Met.)", "सहायक वैज्ञानिक (कृषि मौसम विज्ञान)"],
  ["Agri. Met. COA, Hisar", "कृषि मौसम विज्ञान, कृषि महाविद्यालय, हिसार"],
  ["Principal Scientist (Agron.),RRS, Bawal", "प्रधान वैज्ञानिक (शस्य विज्ञान), क्षेत्रीय अनुसंधान केंद्र, बावल"],
  ["DES, (Agri. Econ)", "डी.ई.एस. (कृषि अर्थशास्त्र)"],
  ["Asstt. Prof.(Food Micro.)", "सहायक प्रोफेसर (खाद्य सूक्ष्मजीव विज्ञान)"],
  ["Director CFST", "निदेशक सी.एफ.एस.टी."],
  ["Asstt. Scientist", "सहायक वैज्ञानिक"],
  ["Wheat & Barley Section, Dept. of G&PB,COA.", "गेहूँ एवं जौ अनुभाग, आनुवंशिकी एवं पादप प्रजनन विभाग, कृषि महाविद्यालय।"],
  ["Bayer India, New Delhi", "बायर इंडिया, नई दिल्ली"],
  ["Asstt Manager", "सहायक प्रबंधक"],
  ["Oriental Bank of Commerce, Govt. PG, College,Hisar", "ओरिएंटल बैंक ऑफ कॉमर्स, सरकारी स्नातकोत्तर महाविद्यालय, हिसार"],
  ["Asstt. Prof.", "सहायक प्रोफेसर"],
  ["Dept. of Agronomy, COA, CCSHAU, Hisar", "शस्य विज्ञान विभाग, कृषि महाविद्यालय, सी.सी.एस. एच.ए.यू., हिसार"],
  ["JU Agri Sciences,", "जे.यू. एग्री साइंसेज,"],
  ["Director Horticulture", "निदेशक बागवानी"],
  ["Sericulture Bhawan, Sector 21, Panchkula", "रेशम उत्पादन भवन, सेक्टर 21, पंचकूला"],
  ["Director, Midas IT services India Pvt Ltd", "निदेशक, मिडास आई.टी. सर्विसेज इंडिया प्राइवेट लिमिटेड"],
  ["Engineer", "अभियंता"],
  ["(Panjab)", "(पंजाब)"],
  ["(Retd).", "(सेवानिवृत्त)।"],
  ["(Retd.)", "(सेवानिवृत्त)"],
  ["(Retd)", "(सेवानिवृत्त)"],
  ["FLAT 9, JamunsApts, Kharar-Kurali Road, KHARAR-143301", "फ्लैट 9, जमुना अपार्टमेंट्स, खरड़-कुराली रोड, खरड़-143301"],
  ["New Delhi", "नई दिल्ली"],
  ["Gurgaon", "गुरुग्राम"],
  ["Hisar", "हिसार"],
  ["Chandigarh", "चंडीगढ़"],
  ["Defence Colony", "डिफेंस कॉलोनी"],
  ["Sector", "सेक्टर"],
  ["Plot", "प्लॉट"],
  ["-do-", "—तदैव—"],
  ["SN", "क्र."],
];

function normalizeForMatch(html) {
  return html
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&rsquo;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&amp;/gi, "&");
}

function translateHtml(enHtml) {
  let out = normalizeForMatch(enHtml);
  const sorted = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of sorted) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  out = out.replace(/&(?![a-zA-Z#0-9]+;)/g, "&amp;");
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id,content_en")
    .eq("id", PAGE_ID)
    .single();
  if (error) throw error;

  const content_hi = translateHtml(page.content_en || "");
  const plain = content_hi.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const leftover = plain.replace(/[^A-Za-z]/g, "").length / Math.max(plain.replace(/\s+/g, "").length, 1);

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("content_hi len", content_hi.length, "EN letter ratio", leftover.toFixed(3));
  console.log("preview:", plain.slice(0, 280));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      content_hi,
      title_hi: "पूर्व छात्र संघ कार्यकारिणी समिति",
      excerpt_hi: "सी.सी.एस. एच.ए.यू. पूर्व छात्र संघ कार्यकारिणी समिति।",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (upErr) throw upErr;
  console.log("OK alumni executive committee content_hi");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
