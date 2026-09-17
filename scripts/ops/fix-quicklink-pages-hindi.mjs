#!/usr/bin/env node
/**
 * Translate Farm Machinery Testing Centre, Retiree Corner, and HAUTA to Hindi.
 *
 *   node scripts/ops/fix-quicklink-pages-hindi.mjs
 *   node scripts/ops/fix-quicklink-pages-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

/** Apply longest-first replacements to avoid partial overlaps. */
function applyMap(html, pairs) {
  let out = html.replace(/\u00a0/g, " ");
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of sorted) {
    if (!en) continue;
    out = out.split(en).join(hi);
  }
  return out;
}

const FARM_MAP = [
  ["FARM MACHINERY TESTING CENTRE", "कृषि मशीनरी परीक्षण केंद्र"],
  ["(An ISO 9001:2015 certified centre)", "(आईएसओ 9001:2015 प्रमाणित केंद्र)"],
  [
    "(The College of Agricultural Engineering and Technology, CCSHAU, Hisar is a approved Testing Centre by Department of Agriculture &amp; Cooperation, Ministry of Agriculture, GOI vide letter No.8-1/2004-My (I&amp;P) dated September 14, 2010 and subsequent letters)",
    "(कृषि अभियांत्रिकी एवं प्रौद्योगिकी महाविद्यालय, सीसीएसएचएयू, हिसार को कृषि एवं सहयोग विभाग, कृषि मंत्रालय, भारत सरकार के पत्र संख्या 8-1/2004-My (I&amp;P) दिनांक 14 सितंबर, 2010 एवं अनुवर्ती पत्रों के अंतर्गत अनुमोदित परीक्षण केंद्र घोषित किया गया है।)",
  ],
  ["PRINCIPAL INVESTIGATOR", "प्रधान अन्वेषक"],
  ["Mailing Address:", "डाक पता:"],
  ["DEPARTMENT OF FARM MACHINERY AND POWER ENGINEERING", "फार्म मशीनरी एवं पावर इंजीनियरिंग विभाग"],
  ["COLLEGE OF AGRICULTURAL ENGINEERING AND TECHNOLOGY", "कृषि अभियांत्रिकी एवं प्रौद्योगिकी महाविद्यालय"],
  ["CCS HARYANA AGRICULTURAL UNIVERSITY, HISAR-125004", "सीसीएस हरियाणा कृषि विश्वविद्यालय, हिसार-125004"],
  ["Office:", "कार्यालय:"],
  ["About the Testing centre", "परीक्षण केंद्र के बारे में"],
  ["How to avail testing facilities", "परीक्षण सुविधाओं का लाभ कैसे उठाएँ"],
  ["Application for testing of agricultural machinery_English", "कृषि मशीनरी परीक्षण हेतु आवेदन (अंग्रेज़ी)"],
  ["Application for testing of agricultural machinery_Hindi", "कृषि मशीनरी परीक्षण हेतु आवेदन (हिंदी)"],
  ["Technical Specifications Sheet", "तकनीकी विनिर्देश पत्र"],
  ["Seniority list of Applicants", "आवेदकों की वरिष्ठता सूची"],
  ["List of test reports released", "जारी परीक्षण रिपोर्टों की सूची"],
  ["Testing Guidelines", "परीक्षण दिशानिर्देश"],
  ["Testing Fees 2018-19", "परीक्षण शुल्क 2018-19"],
  ["Testing Statistics", "परीक्षण सांख्यिकी"],
  ["Citizen Charter", "नागरिक चार्टर"],
];

const RETIREE_MAP = [
  [
    "List of CPF account holders existing as well as retired employees",
    "वर्तमान एवं सेवानिवृत्त कर्मचारियों के सीपीएफ खाताधारकों की सूची",
  ],
  [
    "Family Pension - (Annexure-II) - death after retirement",
    "पारिवारिक पेंशन - (अनुलग्नक-II) - सेवानिवृत्ति के बाद मृत्यु",
  ],
  [
    "Revision of pension/Family pension of pre 01.01.2016 pensioners/family pensioners of CCSHAU, Hisar w.e.f. 01.01.2016",
    "01.01.2016 से पूर्व के पेंशनरों/पारिवारिक पेंशनरों की पेंशन/पारिवारिक पेंशन का संशोधन, सीसीएसएचएयू, हिसार, प्रभावी 01.01.2016 से",
  ],
  [
    "Revision of pension/Family pension of pre 01.01.2016 pensioners/family pensioners of CCSHAU, Hisar w.e.f. 1.1.2016 Dt. 22.03.2018",
    "01.01.2016 से पूर्व के पेंशनरों/पारिवारिक पेंशनरों की पेंशन/पारिवारिक पेंशन का संशोधन, सीसीएसएचएयू, हिसार, प्रभावी 1.1.2016 से, दिनांक 22.03.2018",
  ],
  [
    "Revision of pension/Family pension of pre 01.01.2016 pensioners/family pensioners of CCSHAU, Hisar w.e.f. 1.1.2016",
    "01.01.2016 से पूर्व के पेंशनरों/पारिवारिक पेंशनरों की पेंशन/पारिवारिक पेंशन का संशोधन, सीसीएसएचएयू, हिसार, प्रभावी 1.1.2016 से",
  ],
  [
    "Revision of pension/family pension of pre 01.01.2016 pensioners/family pensioners of CCSHAU, Hisar w.e.f. 01.01.2016",
    "01.01.2016 से पूर्व के पेंशनरों/पारिवारिक पेंशनरों की पेंशन/पारिवारिक पेंशन का संशोधन, सीसीएसएचएयू, हिसार, प्रभावी 01.01.2016 से",
  ],
  ["Undertaking for Retired Employees after 01.01.2016", "01.01.2016 के बाद सेवानिवृत्त कर्मचारियों हेतु वचनपत्र"],
  ["Undertaking for Retired Employees before 01.01.2016", "01.01.2016 से पहले सेवानिवृत्त कर्मचारियों हेतु वचनपत्र"],
  ["LTC Undertaking for Retired Employees", "सेवानिवृत्त कर्मचारियों हेतु एलटीसी वचनपत्र"],
  ["Proforma Medical Claim for Retired employees", "सेवानिवृत्त कर्मचारियों हेतु चिकित्सा दावा प्रोफॉर्मा"],
  ["Counting of DPL services for Pensionary benifits.", "पेंशन संबंधी लाभों हेतु डीपीएल सेवाओं की गणना।"],
  [
    "Adoption of instructions - Extension of benefits of Retirement Gratuity and Death Gratuity of the Haryana Governement employees covered by New Defined Contributory Pension Scheme",
    "निर्देशों को अपनाना — नई परिभाषित अंशदायी पेंशन योजना अंतर्गत हरियाणा सरकार कर्मचारियों की सेवानिवृत्ति ग्रेच्युटी एवं मृत्यु ग्रेच्युटी लाभों का विस्तार",
  ],
  ["Revision of pension/family pension Dt. 29.07.2017", "पेंशन/पारिवारिक पेंशन का संशोधन, दिनांक 29.07.2017"],
  [
    "Counting of DPL (contigent paid) service towards pension in old pension scheme Dt. 30.05.2017",
    "पुरानी पेंशन योजना में डीपीएल (आकस्मिक वेतन) सेवा की पेंशन हेतु गणना, दिनांक 30.05.2017",
  ],
  ["Revision of pension of pre-01-01-2006 pensioners Dt. 15.05.2017", "01-01-2006 से पूर्व के पेंशनरों की पेंशन का संशोधन, दिनांक 15.05.2017"],
  ["Office Memorandum Dt. 13.02.2017", "कार्यालय ज्ञापन, दिनांक 13.02.2017"],
  ["LTC to HAU Pensioners for the block year 2016-19", "एचएयू पेंशनरों हेतु एलटीसी, ब्लॉक वर्ष 2016-19"],
  ["Tax benefit available under National Pension System (NPS) Dt.02.03.2016", "राष्ट्रीय पेंशन प्रणाली (एनपीएस) के अंतर्गत उपलब्ध कर लाभ, दिनांक 02.03.2016"],
  [
    "Monetisation of units lying in the subscribers' account who have not withdrawn their benefits from NPS Dt. 01.07.2016",
    "एनपीएस से लाभ न निकालने वाले अभिदाताओं के खाते में पड़ी इकाइयों का मुद्रीकरण, दिनांक 01.07.2016",
  ],
  ["NEW CPF/GPF rate of interest for retirees w.e.f. 01.04.2019", "सेवानिवृत्त व्यक्तियों हेतु नया सीपीएफ/जीपीएफ ब्याज दर, प्रभावी 01.04.2019 से"],
  ["Pension set for retirees", "सेवानिवृत्त व्यक्तियों हेतु पेंशन सेट"],
  ["Family Pension set (Death during service)", "पारिवारिक पेंशन सेट (सेवा के दौरान मृत्यु)"],
  ["Family Pension set (Death after retirement)", "पारिवारिक पेंशन सेट (सेवानिवृत्ति के बाद मृत्यु)"],
  ["Undertaking for revision of pension under 6th pay commission", "छठे वेतन आयोग के अंतर्गत पेंशन संशोधन हेतु वचनपत्र"],
  ["Undertaking for revision of pension under 7th pay commission", "सातवें वेतन आयोग के अंतर्गत पेंशन संशोधन हेतु वचनपत्र"],
  ["Undertaking for revision of pension retired after 01.01.2006", "01.01.2006 के बाद सेवानिवृत्त पेंशन संशोधन हेतु वचनपत्र"],
  [
    "Revision of pension/family pension of pre-01.01.2016 pensioners/family pensioners of Haryana government (7th CPC w.e.f. 01.01.2016 - clarifications thereof.",
    "हरियाणा सरकार के 01.01.2016 से पूर्व के पेंशनरों/पारिवारिक पेंशनरों की पेंशन/पारिवारिक पेंशन का संशोधन (7वें वेतन आयोग, प्रभावी 01.01.2016 से — स्पष्टीकरण)।",
  ],
  ["Telephone Directory of Retired Employees", "सेवानिवृत्त कर्मचारियों की टेलीफोन निर्देशिका"],
  ["Telephone Directory of Retired Faculty (upto 28.06.2021)", "सेवानिवृत्त संकाय की टेलीफोन निर्देशिका (28.06.2021 तक)"],
  [
    "Regarding implementation of Cashless Medical Facility in CCS HAU, Hisar - list of pensionersfamily pensioners along with their dependent family members",
    "सीसीएस एचएयू, हिसार में कैशलेस चिकित्सा सुविधा के कार्यान्वयन के संबंध में — पेंशनरों/पारिवारिक पेंशनरों एवं उनके आश्रित परिवार सदस्यों की सूची",
  ],
];

const HAUTA_MAP = [
  ["HAUTA 2021- request for demands grievances", "एचएयूटीए 2021 — माँगें/शिकायतें संबंधी अनुरोध"],
  [
    "Haryana Agricultural University Teachers Association (HAUTA) -2022-23",
    "हरियाणा कृषि विश्वविद्यालय शिक्षक संघ (एचएयूटीए) -2022-23",
  ],
  ["EX-OFFICIO MEMBERS", "पदेन सदस्य"],
  ["EXECUTIVE MEMBERS", "कार्यकारिणी सदस्य"],
  ["VICE PRESIDENT", "उपाध्यक्ष"],
  ["JOINT SECRETARY", "संयुक्त सचिव"],
  ["PRESIDENT", "अध्यक्ष"],
  ["SECRETARY", "सचिव"],
  ["TREASURER", "कोषाध्यक्ष"],
  [
    "Proceedings of the 1st Executive Committee of meeting of HAUTA held on 03.01.2019 at 05.00 PM.",
    "03.01.2019 को अपराह्न 05.00 बजे आयोजित एचएयूटीए की प्रथम कार्यकारिणी समिति बैठक की कार्यवाही।",
  ],
  [
    "Proceedings of the 2nd Executive Committee of meeting of HAUTA held on 14.01.2019 at 05.00 PM",
    "14.01.2019 को अपराह्न 05.00 बजे आयोजित एचएयूटीए की द्वितीय कार्यकारिणी समिति बैठक की कार्यवाही",
  ],
  [
    "Proceedings of the 3nd Executive Committee of meeting of HAUTA held on 31.01.2019 at 05.00 PM",
    "31.01.2019 को अपराह्न 05.00 बजे आयोजित एचएयूटीए की तृतीय कार्यकारिणी समिति बैठक की कार्यवाही",
  ],
  [
    "Proceedings of the 3rd Executive Committee of meeting of HAUTA held on 31.01.2019 at 05.00 PM",
    "31.01.2019 को अपराह्न 05.00 बजे आयोजित एचएयूटीए की तृतीय कार्यकारिणी समिति बैठक की कार्यवाही",
  ],
  [
    "Proceedings of the 4th Executive Committee of meeting of HAUTA held on 12.02.2019 at 05.10 PM",
    "12.02.2019 को अपराह्न 05.10 बजे आयोजित एचएयूटीए की चतुर्थ कार्यकारिणी समिति बैठक की कार्यवाही",
  ],
  [
    "Proceedings of the 5th Executive Committee of meeting of HAUTA held on 10.05.2019 at 1.00  PM",
    "10.05.2019 को अपराह्न 1.00 बजे आयोजित एचएयूटीए की पंचम कार्यकारिणी समिति बैठक की कार्यवाही",
  ],
  [
    "Proceedings of the 5th Executive Committee of meeting of HAUTA held on 10.05.2019 at 1.00 PM",
    "10.05.2019 को अपराह्न 1.00 बजे आयोजित एचएयूटीए की पंचम कार्यकारिणी समिति बैठक की कार्यवाही",
  ],
];

/** Fallback for any remaining HAUTA proceedings lines with odd spacing. */
function translateHautAProceedings(html) {
  return html.replace(
    /Proceedings of the (\d+)(?:st|nd|rd|th) Executive Committee of meeting of HAUTA held on ([0-9.]+) at ([0-9.:\s]+)PM\.?/gi,
    (_m, n, date, time) => {
      const ordinals = {
        1: "प्रथम",
        2: "द्वितीय",
        3: "तृतीय",
        4: "चतुर्थ",
        5: "पंचम",
        6: "षष्ठ",
        7: "सप्तम",
        8: "अष्टम",
        9: "नवम",
        10: "दशम",
      };
      const ord = ordinals[Number(n)] || `${n}वीं`;
      return `${date} को अपराह्न ${time.trim()} बजे आयोजित एचएयूटीए की ${ord} कार्यकारिणी समिति बैठक की कार्यवाही`;
    },
  );
}

const PAGES = [
  {
    slug: "farm-machinery-testing-centre-1",
    title_hi: "कृषि मशीनरी परीक्षण केंद्र",
    excerpt_hi: "कृषि मशीनरी परीक्षण केंद्र — सीसीएस एचएयू।",
    map: FARM_MAP,
  },
  {
    slug: "retiree-corner",
    title_hi: "सेवानिवृत्त कोना",
    excerpt_hi: "सेवानिवृत्त कोना — सीसीएस एचएयू।",
    map: RETIREE_MAP,
  },
  {
    slug: "h-a-u-t-a",
    title_hi: "एचएयूटीए",
    excerpt_hi: "एचएयूटीए — सीसीएस एचएयू।",
    map: HAUTA_MAP,
  },
];

function leftoverEnglishHints(html) {
  const hints = [
    "Application for",
    "Testing Guidelines",
    "Citizen Charter",
    "List of CPF",
    "Family Pension",
    "Undertaking for",
    "Proceedings of the",
    "PRESIDENT",
    "EX-OFFICIO",
    "Mailing Address",
    "PRINCIPAL INVESTIGATOR",
    "Technical Specifications",
    "Retiree Corner",
  ];
  return hints.filter((h) => html.includes(h));
}

async function main() {
  console.log({ mode: APPLY ? "APPLY" : "dry-run" });
  for (const page of PAGES) {
    const { data, error } = await sb
      .from("ccshau_pages")
      .select("id, slug, content_en, title_hi, excerpt_hi")
      .eq("slug", page.slug)
      .single();
    if (error) throw error;

    let content_hi = applyMap(data.content_en, page.map);
    if (page.slug === "h-a-u-t-a") content_hi = translateHautAProceedings(content_hi);
    const leftover = leftoverEnglishHints(content_hi);
    console.log(`\n=== ${page.slug} ===`);
    console.log("title_hi:", page.title_hi);
    console.log("excerpt_hi:", page.excerpt_hi);
    console.log("content_hi length:", content_hi.length);
    console.log("leftover EN hints:", leftover.length ? leftover : "none");

    if (!APPLY) continue;

    const { error: upErr } = await sb
      .from("ccshau_pages")
      .update({
        title_hi: page.title_hi,
        excerpt_hi: page.excerpt_hi,
        content_hi,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (upErr) throw upErr;
    console.log("updated OK");
  }
  if (!APPLY) console.log("\nDry-run complete. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
