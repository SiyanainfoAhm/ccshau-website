#!/usr/bin/env node
/**
 * Cursor-authored block translations for Bawal faculty profiles.
 * Merges new hi_html entries into blocks-translated.json (no duplicate en_html keys).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml, hasDevanagari } from "./faculty-html-translate.mjs";
import { BAWAL_FACULTY_CURSOR_PHRASES } from "./bawal-faculty-cursor-phrases.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, "../../Documents/hindi-faculty/bawal-profiles");

/** Publication / prose phrases (longest first). Style matches phrases-translated.json. */
const BLOCK_EXTRA_PHRASES = [
  [
    "Faculty should update his/her profile using this template. The Font size should 12, Times New roman, Heading should be bold. The list of publication should be year wise and row wise separated (as shown in this template). The style of references should be same as suggested by Dean PG for post-graduate thesis (Journal of Ecology). In this template comments are made in italics using red text to facilitate the filling of this faculty profile form.",
    "संकाय सदस्य को इस टेम्पलेट का उपयोग करके अपनी प्रोफ़ाइल अपडेट करनी चाहिए। फ़ॉन्ट आकार 12, Times New Roman होना चाहिए, शीर्षक बोल्ड होने चाहिए। प्रकाशनों की सूची वर्षवार और पंक्तिवार (इस टेम्पलेट में दिखाए अनुसार) अलग होनी चाहिए। संदर्भों की शैली स्नातकोत्तर शोध प्रबंध के लिए डीन पी.जी. द्वारा सुझाई गई (Journal of Ecology) के समान होनी चाहिए। इस टेम्पलेट में संकाय प्रोफ़ाइल फॉर्म भरने में सुविधा के लिए लाल रंग में इटैलिक टिप्पणियाँ दी गई हैं।",
  ],
  [
    "VII International Conference on Global Research Initiatives for Sustainable Agriculture & Allied Sciences (GRISAAS-2022)",
    "VII International Conference on Global Research Initiatives for Sustainable Agriculture & Allied Sciences (GRISAAS-2022)",
  ],
  ["Research paper presented in", "में शोध पत्र प्रस्तुत किया गया"],
  ["Paper presented in", "में पत्र प्रस्तुत किया गया"],
  ["Presented paper title,", "प्रस्तुत पत्र का शीर्षक,"],
  ["organized  by", "द्वारा आयोजित"],
  ["organized by", "द्वारा आयोजित"],
  ["Organised by", "द्वारा आयोजित"],
  ["organized from", "से आयोजित"],
  ["In Collaboration with", "के सहयोग से"],
  ["In Collaboration with", "के सहयोग से"],
  ["in collaboration with", "के सहयोग से"],
  ["during", "के दौरान"],
  ["held on", "को आयोजित"],
  ["held at", "पर आयोजित"],
  ["held during", "के दौरान आयोजित"],
  ["Participated and presented", "में भाग लिया और प्रस्तुत किया"],
  ["poster presentation", "पोस्टर प्रस्तुति"],
  ["National conference on", "राष्ट्रीय सम्मेलन"],
  ["International conference on", "अंतर्राष्ट्रीय सम्मेलन"],
  ["International Conference on", "अंतर्राष्ट्रीय सम्मेलन on"],
  ["International Web Conference on", "अंतर्राष्ट्रीय वेब सम्मelan on"],
  ["International Symposium on", "अंतर्राष्ट्रीय संगोष्ठी on"],
  ["International symposium on", "अंतर्राष्ट्रीय संगोष्ठी on"],
  ["National seminar on", "राष्ट्रीय सेमिनार on"],
  ["National Seminar on", "राष्ट्रीय सेमिनार on"],
  ["Best Teacher  Award", "सर्वश्रेष्ठ शिक्षक पुरस्कार"],
  ["Best Teacher &nbsp; Award", "सर्वश्रेष्ठ शिक्षक &nbsp; पुरस्कार"],
  ["Young Scientist Award (Agronomy)-", "युवा वैज्ञानिक पुरस्कार (Agronomy)-"],
  ["Reviewer for  year-2017,2018,2019 Current Agriculture Research Journal.", "वर्ष 2017, 2018, 2019 के लिए Current Agriculture Research Journal के समीक्षक।"],
  ["Excellence  Teacher Award-2017, (On Teachers Day-2017", "उत्कृष्टता शिक्षक पुरस्कार-2017, (शिक्षक दिवस-2017"],
  ["Mahima Excellence Agriculture Scientist Award-2017,", "Mahima Excellence Agriculture Scientist Award-2017,"],
  ["Best Oral presentation, SGV University, Jaipur-2018", "SGV University, Jaipur-2018 में सर्वश्रेष्ठ मौखिक प्रस्तुति"],
  ["Honors and Awards", "सम्मान और पुरस्कार"],
  ["Publications (Total citations = 702; i10-index = 14; h-index = 11)", "प्रकाशन (कुल उद्धरण = 702; i10-index = 14; h-index = 11)"],
  ["Google Scholar:-", "Google Scholar:-"],
  ["Scopus:-", "Scopus:-"],
  ["Vidwan ID:", "Vidwan ID:"],
  ["ORCID Link:", "ORCID Link:"],
  ["WoS ResearcherID:", "WoS ResearcherID:"],
  ["Impact  factor", "प्रभाव कारक"],
  ["Impact &nbsp; factor", "प्रभाव &nbsp; कारक"],
  ["Impact factor", "प्रभाव कारक"],
  ["Constraints/ factors limiting the use of internet as an extension advisory  tool: A case study of", "इंटरनेट के उपयोग को सीमित करने वाले बाधाएँ/ कारक: एक विस्तार सलाहकार उपकरण के रूप में—"],
  ["Perceived constraints and remedies on Information and  Communication Technologies use by the students of", "सूचना और संचार प्रौद्योगिकियों के उपयोग पर छात्रों द्वारा अनुभव की गई बाधाएँ और उपाय—"],
  ["Constraints/ factors limiting", "सीमित करने वाले बाधाएँ/ कारक"],
  ["extension advisory  tool", "विस्तार सलाहकार उपकरण"],
  ["extension advisory tool", "विस्तार सलाहकार उपकरण"],
  ["A case study of", "— एक केस स्टडी"],
  ["Attendedone-month training on", "एक महीने का प्रशिक्षण में भाग लिया—"],
  ["Awarded ICAR Senior Research  Fellowship in 2019.", "2019 में ICAR वरिष्ठ शोध फेलोशिप से सम्मानित।"],
  ["Awarded Certificate of Registration of Design for", "के लिए डिज़ाइन पंजीकरण प्रमाणपत्र प्रदान"],
  ["University Merit Scholarship From", "विश्वविद्यालय Merit Scholarship"],
  ["University Merit Stipend From", "विश्वविद्यालय Merit Stipend"],
  ["Association of Agrometeorologists (AAM) India", "Association of Agrometeorologists (AAM) India"],
  ["Australia Awards Fellowship", "Australia Awards Fellowship"],
  ["Department of Chemistry", "रसायन विभाग"],
  ["Degree of mechanization to  increase farm mechanization in order to increase productivity", "उत्पादकता बढ़ाने हेतु कृषि यांत्रिकीकरण बढ़ाने के लिए यांत्रिकीकरण की डिग्री"],
  ["Development of an integrated model for rural home electrification to boost green renewable energy systems.", "ग्रामीण घरेलू विद्युतीकरण हेतु एकीकृत मॉडल का विकास—हरित/nवीकरणीय ऊर्जा प्रणालियों को बढ़ावा देने के लिए।"],
  ["Mechanical management of paddy straw -a remediation to the environment.", "धान की पराली का यांत्रिक प्रबंधन—पर्यावरण के लिए एक उपचार।"],
  ["Role of women in agriculture as entrepreneurs.", "उद्यमियों के रूप में कृषि में महिलाओं की भूमिका।"],
  ["Sustainable farming by proper use of irrigation scheduling.", "सिंचाई अनुसूची के उचित उपयोग द्वारा सतत खेती।"],
  ["Indian Punjab", "भारतीय पंजाब"],
  ["district Hisar, Haryana", "जिला Hisar, Haryana"],
  ["soils of", "की मिट्टियों में"],
  ["under", "के अंतर्गत"],
  ["Editor ", "संपादक "],
  ["published by", "द्वारा प्रकाशित"],
  ["Page no.", "पृष्ठ सं."],
  ["Page no-", "पृष्ठ सं.-"],
  ["P.no.", "पृ. सं."],
  ["P:-", "पृ.-"],
  ["P.no.&nbsp;", "पृ. सं.&nbsp;"],
  ["Certificate No.", "प्रमाणपत्र सं."],
  ["From 16", "16"],
  ["Six weeks training on", "पर छह सप्ताह का प्रशिक्षण"],
].sort((a, b) => b[0].length - a[0].length);

function normalizeHtml(html) {
  return html.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ");
}

function translateBlock(enHtml) {
  let out = normalizeHtml(enHtml);
  out = translateFacultyProfileHtml(out) ?? out;
  for (const [en, hi] of [...BAWAL_FACULTY_CURSOR_PHRASES, ...BLOCK_EXTRA_PHRASES].sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  return out;
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function loadEligibleBlocks(limit = 100) {
  const translated = JSON.parse(readFileSync(join(PROFILE_DIR, "blocks-translated.json"), "utf8"));
  const pending = JSON.parse(readFileSync(join(PROFILE_DIR, "blocks-pending.json"), "utf8"));
  const done = new Set(translated.blocks.map((b) => b.en_html));

  return pending.blocks
    .filter((b) => !done.has(b.en_html) && !b.en_html.includes("????"))
    .map((b) => ({
      en_html: b.en_html,
      used_by: b.used_by.length,
      plainLen: stripHtml(b.en_html).length,
    }))
    .filter((b) => b.plainLen >= 40 && b.plainLen <= 600)
    .sort((a, b) => b.used_by - a.used_by || b.plainLen - a.plainLen)
    .slice(0, limit);
}

const batchPath = join(PROFILE_DIR, "_batch-clean100.json");
const toTranslate = existsSync(batchPath)
  ? JSON.parse(readFileSync(batchPath, "utf8")).blocks
  : loadEligibleBlocks(100);

const existing = JSON.parse(readFileSync(join(PROFILE_DIR, "blocks-translated.json"), "utf8"));
const existingKeys = new Set(existing.blocks.map((b) => b.en_html));

let added = 0;
for (const block of toTranslate) {
  if (existingKeys.has(block.en_html)) continue;
  const hi_html = translateBlock(block.en_html);
  if (!hasDevanagari(hi_html)) continue;
  existing.blocks.push({
    en_html: block.en_html,
    hi_html,
    used_by: block.used_by_count ?? block.used_by ?? 1,
  });
  existingKeys.add(block.en_html);
  added++;
}

existing.exported_at = new Date().toISOString();
writeFileSync(join(PROFILE_DIR, "blocks-translated.json"), JSON.stringify(existing, null, 2) + "\n");

console.log(`NEW blocks added: ${added}`);
console.log(`Total blocks in blocks-translated.json: ${existing.blocks.length}`);
