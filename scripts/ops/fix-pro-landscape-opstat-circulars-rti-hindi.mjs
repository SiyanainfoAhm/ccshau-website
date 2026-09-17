#!/usr/bin/env node
/**
 * Hindi translations for:
 * - Circular office/branch category labels
 * - RTI download titles
 * - Pages: pro, landscape-unit, o-p-stat
 *
 *   node scripts/ops/fix-pro-landscape-opstat-circulars-rti-hindi.mjs
 *   node scripts/ops/fix-pro-landscape-opstat-circulars-rti-hindi.mjs --apply
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

function applyMap(html, pairs) {
  let out = (html || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of sorted) {
    const key = en
      .replace(/\u00a0/g, " ")
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
    out = out.split(key).join(hi);
  }
  return out;
}

const CIRCULAR_CATEGORY_HI = {
  "REGISTRAR OFFICE": "रजिस्ट्रार कार्यालय",
  "COMPTROLLER OFFICE": "नियंत्रक कार्यालय",
  "STORE PURCHASE OFFICE": "भंडार क्रय कार्यालय",
  "DIRECTORATE OF RESEARCH": "अनुसंधान निदेशालय",
  BUDGET: "बजट",
  "ESTABLISHMENT CAU": "स्थापना सीएयू",
  "ESTABLISHMENT REG": "स्थापना रजि",
  PENSION: "पेंशन",
  "INSPECTION BRANCH": "निरीक्षण शाखा",
  "ACCOUNTS BRANCH": "लेखा शाखा",
  "SEVENTH PAY COMMISSION": "सातवाँ वेतन आयोग",
  "OUTSOURCING  CELL": "आउटसोर्सिंग प्रकोष्ठ",
  "OUTSOURCING CELL": "आउटसोर्सिंग प्रकोष्ठ",
  "ACADEMIC BRANCH REG": "शैक्षणिक शाखा रजि",
  "GENERAL BRANCH": "सामान्य शाखा",
  "RECRUITMENT CELL": "भर्ती प्रकोष्ठ",
  "SENIORITY LIST OF EMPLOYEES REG": "कर्मचारियों की वरिष्ठता सूची रजि",
  FACULTY: "संकाय",
};

const RTI_TITLE_HI = {
  "List of First Appellate Authority and SPIOs under RTI Act, 2005":
    "आरटीआई अधिनियम, 2005 के अंतर्गत प्रथम अपीलीय प्राधिकारी एवं एसपीआईओ की सूची",
  "RTI Act, 2005 in English": "आरटीआई अधिनियम, 2005 (अंग्रेज़ी)",
  "RTI Act, 2005 in Hindi": "आरटीआई अधिनियम, 2005 (हिंदी)",
  "Haryana Right to information Rules, 2005": "हरियाणा सूचना का अधिकार नियम, 2005",
  "Haryana Right to information Rules, 2009 (Hindi & English)":
    "हरियाणा सूचना का अधिकार नियम, 2009 (हिंदी एवं अंग्रेज़ी)",
  "Clarification regarding Actual Postal Charges": "वास्तविक डाक शुल्क के संबंध में स्पष्टीकरण",
  "Haryana Right to information Rules, 2016 (Hindi & English)":
    "हरियाणा सूचना का अधिकार नियम, 2016 (हिंदी एवं अंग्रेज़ी)",
  "Decision dated 13.11.2019 of Hon'ble Supreme Court of India, in civil Appeal No. 10044 of 2010 titled as Central Public Information Officer, Supreme Court of India Vs. Subhash Chandra Agarwal regarding personal Information.":
    "माननीय भारत के सर्वोच्च न्यायालय का दिनांक 13.11.2019 का निर्णय, सिविल अपील संख्या 10044/2010 — केंद्रीय लोक सूचना अधिकारी, भारत का सर्वोच्च न्यायालय बनाम सुभाष चंद्र अग्रवाल (व्यक्तिगत सूचना संबंधी)।",
  "Haryana Right to information Rules, 2021 (Hindi & English)":
    "हरियाणा सूचना का अधिकार नियम, 2021 (हिंदी एवं अंग्रेज़ी)",
  "Disclosure of RTI Information under section 4(1) (b) 17 Manuals points (i) to (xvii) Suo- Motuo Disclosure":
    "आरटीआई अधिनियम की धारा 4(1)(ख) के अंतर्गत 17 मैनुअल बिंदुओं (i) से (xvii) की सूचना का स्वतः प्रकटीकरण",
  "Haryana & Punjab Agricultural University Act 1970":
    "हरियाणा एवं पंजाब कृषि विश्वविद्यालय अधिनियम 1970",
  "Act & Statutes 2014": "अधिनियम एवं परिनियम 2014",
  "Act & Statutes Amendment 01/2015 to 3/2020": "अधिनियम एवं परिनियम संशोधन 01/2015 से 3/2020",
  "Calendar Volume - III": "कैलेंडर खंड - III",
  "Nominate Dr. Seema Rani, Professor, SPIO of Extension Education and Communication Management (EECM) under RTI Act, 2005":
    "आरटीआई अधिनियम, 2005 के अंतर्गत डॉ. सीमा रानी, प्रोफेसर को विस्तार शिक्षा एवं संचार प्रबंधन (ईईसीएम) का एसपीआईओ नामित करना",
  "Nomination of SPIO-cum-Nodal Officer under RTI Act, 2005.":
    "आरटीआई अधिनियम, 2005 के अंतर्गत एसपीआईओ-सह-नोडल अधिकारी का नामांकन।",
  "Nominate Dr. Renu Munjal, Associate Director, Human Resource Management (DHRM) under RTI Act, 2005":
    "आरटीआई अधिनियम, 2005 के अंतर्गत डॉ. रेनू मुंजाल, एसोसिएट डायरेक्टर, मानव संसाधन प्रबंधन (डीएचआरएम) को नामित करना",
  "RTI Information Handbook": "आरटीआई सूचना पुस्तिका",
};

const OPSTAT_CONTENT_HI = `<p><a href="http://192.168.2.7/opstat/default.asp" target="_blank"><span style="font-size:18px"> परिसर उपयोगकर्ता</span></a></p><p><span style="font-size:18px"><br /></span><a href="http://14.139.232.173/opstat/default.asp" target="_blank"><span style="font-size:18px"> परिसर से बाहर के उपयोगकर्ता</span></a></p><p style="text-align:center"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif;color:rgb(226, 80, 65)">यदि खराब इंटरनेट कनेक्टिविटी या बिजली व्यवधान के कारण ओपीस्टेट उपलब्ध न हो, तो निःशुल्क विश्लेषण हेतु एक अन्य साइट उपलब्ध है।</span></p><p style="text-align:center"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif;color:rgb(61, 142, 185)">कृपया निम्नलिखित लिंक पर क्लिक करें</span></p><p style="text-align:center"><a href="http://opstat.pythonanywhere.com/" rel="noopener noreferrer" target="_blank"><span style="font-size:24px">opstat.pythonanywhere.com</span></a></p><p style="text-align:center"><strong>नोट:-</strong> यह विकास अधीन बीटा संस्करण है। किसी भी कठिनाई एवं टिप्पणी/सुझाव हेतु opsheoran1968@yahoo.co.in पर लिखें।</p>`;

const PRO_MAP = [
  ["Media Advisor", "मीडिया सलाहकार"],
  ["Email Id:", "ई-मेल:"],
  ["Telephone No.", "दूरभाष संख्या"],
  [
    "The Public Relations Office is a part of the Vice-Chancellor's Secretariat, headed by Media Advisor. The office has been entrusted with the duty of developing and maintaining rapport with general public and scientific community and to project healthy image of the University through print and electronic media. This office also performs as Nodal Office in respect of release and publication of advertisements of different departments of the University in newspapers and magazines. Besides, publication of a quarterly newsletter of the University-CCSHAU Newsletter, this office ensures media coverage of the multifarious activities of the University like  workshops,  seminars, trainings, innovations, prize distribution functions, youth festivals, athletic meet, Kisan Melas, field days, visits of distinguished visitors/delegations from outside etc. through local, regional and National print and electronic media. Photo features and articles on distinctive highlights of the University and its colleges/departments are released from time to time.",
    "जन संपर्क कार्यालय कुलपति सचिवालय का भाग है, जिसका नेतृत्व मीडिया सलाहकार करते हैं। इस कार्यालय को जनसामान्य एवं वैज्ञानिक समुदाय से संपर्क विकसित व बनाए रखने तथा मुद्रित एवं इलेक्ट्रॉनिक मीडिया के माध्यम से विश्वविद्यालय की स्वस्थ छवि प्रस्तुत करने का दायित्व सौंपा गया है। यह कार्यालय विश्वविद्यालय के विभिन्न विभागों के विज्ञापनों के समाचार-पत्रों एवं पत्रिकाओं में प्रकाशन हेतु नोडल कार्यालय के रूप में भी कार्य करता है। विश्वविद्यालय की त्रैमासिक न्यूज़लेटर—सीसीएसएचएयू न्यूज़लेटर—के प्रकाशन के अतिरिक्त, यह कार्यालय कार्यशालाओं, सेमिनारों, प्रशिक्षणों, नवाचारों, पुरस्कार वितरण समारोहों, युवा महोत्सवों, एथलेटिक मीट, किसान मेलों, फील्ड डे तथा विशिष्ट अतिथियों/प्रतिनिधिमंडलों के दौरे आदि बहुआयामी गतिविधियों का स्थानीय, क्षेत्रीय एवं राष्ट्रीय मुद्रित व इलेक्ट्रॉनिक मीडिया में कवरेज सुनिश्चित करता है। विश्वविद्यालय एवं इसके महाविद्यालयों/विभागों की विशिष्ट उपलब्धियों पर फोटो फीचर एवं लेख समय-समय पर जारी किए जाते हैं।",
  ],
  ["Corona Report Hindi and English", "कोरोना रिपोर्ट हिंदी एवं अंग्रेज़ी"],
  ["News Letter April to June 2022", "न्यूज़लेटर अप्रैल से जून 2022"],
  ["News Letter July to September 2022", "न्यूज़लेटर जुलाई से सितंबर 2022"],
  ["HAU Newsletter October to December 2022", "एचएयू न्यूज़लेटर अक्टूबर से दिसंबर 2022"],
  ["HAU Newsletter January to March 2023", "एचएयू न्यूज़लेटर जनवरी से मार्च 2023"],
  ["HAU Newsletter April to June 2023", "एचएयू न्यूज़लेटर अप्रैल से जून 2023"],
  ["News Letter January-March 2024", "न्यूज़लेटर जनवरी-मार्च 2024"],
  ["News Letter April-June 2024", "न्यूज़लेटर अप्रैल-जून 2024"],
  ["News Letter July -Sept 2024", "न्यूज़लेटर जुलाई-सितंबर 2024"],
  ["News Letter October-December 2024", "न्यूज़लेटर अक्टूबर-दिसंबर 2024"],
  ["News Letter -2017", "न्यूज़लेटर -2017"],
  ["News Letter - 2018", "न्यूज़लेटर - 2018"],
  ["News Letter - 2019", "न्यूज़लेटर - 2019"],
  ["News Letter - 2021", "न्यूज़लेटर - 2021"],
  ["News Letter - 2022", "न्यूज़लेटर - 2022"],
];

const LANDSCAPE_MAP = [
  ["Controlling officer", "नियंत्रण अधिकारी"],
  [
    "Land Scape Unit (LSU), CCS Haryana Agricultural University Hisar - 125 004, India.",
    "लैंडस्केप इकाई (एलएसयू), सीसीएस हरियाणा कृषि विश्वविद्यालय, हिसार - 125 004, भारत।",
  ],
  ["Phone :", "दूरभाष :"],
  ["Mobile :", "मोबाइल :"],
  ["Office :", "कार्यालय :"],
  ["Email Id :", "ई-मेल :"],
  ["About Landscape Unit", "लैंडस्केप इकाई के बारे में"],
  [
    "Landscape Unit was established during the year 1970 to enhance the  quality of environment, to provide the unique beautification in the University campus i.e. ",
    "लैंडस्केप इकाई की स्थापना वर्ष 1970 में पर्यावरण की गुणवत्ता बढ़ाने तथा विश्वविद्यालय परिसर—अर्थात् ",
  ],
  [
    "Offices/Colleges/Sports complex (Giri center) ",
    "कार्यालयों/महाविद्यालयों/खेल परिसर (गिरी केंद्र) ",
  ],
  [
    "as well as in  residential area. This Unit organizes plantation drives in University campus   on various occasions. Landscape Unit Nursery having rich biodiversity of  about 200 species including, trees, shrubs, herbs, climbers, aquatic plants, seasonal flowers &amp; plants etc. LSU have various implements/instruments i.e. Brush cutters, Shrub master, JCB,  Tractors, Grass cutting machines  and hydraulic lift for maintaining &amp; managing  different types of landscaping task. ",
    "तथा आवासीय क्षेत्र में विशिष्ट सौंदर्यीकरण हेतु की गई। यह इकाई विभिन्न अवसरों पर विश्वविद्यालय परिसर में वृक्षारोपण अभियान आयोजित करती है। लैंडस्केप इकाई नर्सरी में लगभग 200 प्रजातियों की समृद्ध जैव विविधता है—वृक्ष, झाड़ियाँ, जड़ी-बूटियाँ, लताएँ, जलीय पौधे, मौसमी फूल एवं पौधे आदि। एलएसयू के पास ब्रश कटर, श्रब मास्टर, जेसीबी, ट्रैक्टर, घास काटने की मशीनें एवं हाइड्रॉलिक लिफ्ट जैसी विभिन्न मशीनरी/उपकरण उपलब्ध हैं, जिनसे विविध लैंडस्केपिंग कार्यों का रखरखाव एवं प्रबंधन किया जाता है। ",
  ],
  ["Message from the Controlling Officer", "नियंत्रण अधिकारी का संदेश"],
  [
    "I &amp; my team are dedicated &amp; committed to provide an unique  beautification &amp; dense greenery",
    "मैं एवं मेरी टीम विश्वविद्यालय परिसर को विशिष्ट सौंदर्यीकरण एवं घनी हरियाली प्रदान करने हेतु समर्पित एवं प्रतिबद्ध हैं",
  ],
  [" to the University campus.", "।"],
  [
    "It means   a lot   to me to be a part of such a supportive team. ",
    "इतनी सहयोगी टीम का हिस्सा होना मेरे लिए अत्यंत महत्वपूर्ण है। ",
  ],
  [
    "We are always capable for the interpretation, how natural &amp; cultural forces combined in shaping a healthy environment. ",
    "हम सदैव यह समझने में सक्षम हैं कि प्राकृतिक एवं सांस्कृतिक शक्तियाँ मिलकर स्वस्थ पर्यावरण कैसे गढ़ती हैं। ",
  ],
  [
    "The employees of the University &amp; outside residents of the city ",
    "विश्वविद्यालय के कर्मचारी एवं शहर के बाहरी निवासी ",
  ],
  ["experience the benefit of ", "इन लाभों का अनुभव करते हैं—"],
  [
    "mental stability, relaxed mind, avoid stress and pressure, improve on their behavior and their mental health by way of interaction and direct contact with the environment developed by Landscape Unit ",
    "मानसिक स्थिरता, शांत मन, तनाव एवं दबाव से मुक्ति, व्यवहार एवं मानसिक स्वास्थ्य में सुधार—लैंडस्केप इकाई द्वारा विकसित पर्यावरण से संपर्क एवं सीधा जुड़ाव के माध्यम से ",
  ],
  ["under the valuable guidance of ", "के मूल्यवान मार्गदर्शन में "],
  ["Hon’ble", "माननीय"],
  [" Vice-Chancellor Prof.(Dr.) B.R. Kamboj", " कुलपति प्रो.(डॉ.) बी.आर. कम्बोज"],
  ["Facutly", "संकाय"],
  ["Photos", "फोटो"],
  ["Name", "नाम"],
  ["Designation", "पदनाम"],
  ["Mobile No", "मोबाइल नंबर"],
  ["Email", "ई-मेल"],
  ["Head, Landscape unit &amp;Assistant Professor(HORT)", "प्रमुख, लैंडस्केप इकाई एवं सहायक प्रोफेसर (बागवानी)"],
  ["Thrust Area ", "मुख्य क्षेत्र "],
  ["Mandate/Objective of Landscape Unit", "लैंडस्केप इकाई का अधिदेश/उद्देश्य"],
  [
    "To enhance the quality of environment of the delineated space. ",
    "निर्धारित स्थान के पर्यावरण की गुणवत्ता में वृद्धि करना। ",
  ],
  [
    "Landscape interpretation amounted essentially to the explanation of how natural and cultural forces combined in shaping environment. ",
    "लैंडस्केप व्याख्या मूलतः यह समझाना है कि प्राकृतिक एवं सांस्कृतिक शक्तियाँ मिलकर पर्यावरण कैसे गढ़ती हैं। ",
  ],
  [
    "As a result of the hard work put up by One &amp; All, Landscape Unit has planted approx 75,000 plants of various species in University Campus, Farm areas &amp; Residential areas towards developing dense greenery in the University campus as well as at outstations.",
    "सभी के परिश्रम के फलस्वरूप, लैंडस्केप इकाई ने विश्वविद्यालय परिसर, फार्म क्षेत्रों एवं आवासीय क्षेत्रों में विभिन्न प्रजातियों के लगभग 75,000 पौधे लगाए हैं, जिससे परिसर एवं बाहरी स्टेशनों में घनी हरियाली विकसित हुई है।",
  ],
  ["Infrastructure", "अवसंरचना"],
  [
    "Plantation on the occasion of Earth day, 22nd April 2025 Swachhta Programme and Van Mahotsav",
    "पृथ्वी दिवस, 22 अप्रैल 2025 के अवसर पर वृक्षारोपण, स्वच्छता कार्यक्रम एवं वन महोत्सव",
  ],
  [
    "Photographs of Tiranga Yatra, Van Mahotsav &amp; Azadi ka Amrit Mahotsav activities, Covocation Programme, Landscaping Activities",
    "तिरंगा यात्रा, वन महोत्सव एवं आज़ादी का अमृत महोत्सव गतिविधियों, दीक्षांत समारोह, लैंडस्केपिंग गतिविधियों के फोटोग्राफ",
  ],
  ["Photographs of Tiranga Yatra 15.08.2023", "तिरंगा यात्रा 15.08.2023 के फोटोग्राफ"],
  [
    "Plantation ofAmaltas (",
    "अमलतास (",
  ],
  [
    ")by worthy Vice Chancellor in the nursery unit of LSU, CCSHAU, Hisar on the occasion of ICAR foundation day (16 July, 2021)",
    ") का माननीय कुलपति द्वारा एलएसयू, सीसीएसएचएयू, हिसार की नर्सरी इकाई में आईसीएआर स्थापना दिवस (16 जुलाई, 2021) के अवसर पर रोपण",
  ],
];

async function updateCircularCategories() {
  const { data, error } = await sb
    .from("ccshau_circular_categories")
    .select("id, slug, name_en, name_hi");
  if (error) throw error;
  let updated = 0;
  for (const row of data || []) {
    const hi = CIRCULAR_CATEGORY_HI[row.name_en];
    if (!hi || row.name_hi === hi) continue;
    console.log(`category ${row.slug}: ${row.name_en} → ${hi}`);
    if (!APPLY) continue;
    const { error: upErr } = await sb
      .from("ccshau_circular_categories")
      .update({ name_hi: hi, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated += 1;
  }
  console.log(`circular categories ${APPLY ? "updated" : "planned"}: ${updated || Object.keys(CIRCULAR_CATEGORY_HI).length}`);
}

async function updateRtiTitles() {
  const { data, error } = await sb
    .from("ccshau_downloads")
    .select("id, title_en, title_hi")
    .eq("category", "rti");
  if (error) throw error;
  let updated = 0;
  for (const row of data || []) {
    const hi = RTI_TITLE_HI[row.title_en];
    if (!hi || row.title_hi === hi) continue;
    console.log(`rti: ${row.title_en.slice(0, 60)}… → ${hi.slice(0, 40)}…`);
    if (!APPLY) continue;
    const { error: upErr } = await sb
      .from("ccshau_downloads")
      .update({ title_hi: hi, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated += 1;
  }
  console.log(`rti titles ${APPLY ? "updated" : "planned"}: ${updated}`);
}

async function updatePage(slug, { title_hi, excerpt_hi, content_hi }) {
  const { data, error } = await sb
    .from("ccshau_pages")
    .select("id, content_en")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const html = typeof content_hi === "function" ? content_hi(data.content_en) : content_hi;
  console.log(`\n=== ${slug} ===`);
  console.log({ title_hi, excerpt_hi, len: html.length });
  if (!APPLY) return;
  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      title_hi,
      excerpt_hi,
      content_hi: html,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  if (upErr) throw upErr;
  console.log("updated OK");
}

async function main() {
  console.log({ mode: APPLY ? "APPLY" : "dry-run" });
  await updateCircularCategories();
  await updateRtiTitles();
  await updatePage("o-p-stat", {
    title_hi: "ओपीस्टेट",
    excerpt_hi: "ओपीस्टेट — सीसीएस एचएयू।",
    content_hi: OPSTAT_CONTENT_HI,
  });
  await updatePage("pro", {
    title_hi: "जन संपर्क कार्यालय",
    excerpt_hi: "जन संपर्क कार्यालय — सीसीएस एचएयू।",
    content_hi: (en) => {
      const html = applyMap(en, PRO_MAP);
      const leftover = ["Public Relations Office is a part", "Media Advisor", "News Letter"].filter((s) =>
        html.includes(s),
      );
      console.log("pro leftover:", leftover.length ? leftover : "none");
      return html;
    },
  });
  await updatePage("landscape-unit", {
    title_hi: "लैंडस्केप इकाई",
    excerpt_hi: "लैंडस्केप इकाई — सीसीएस एचएयू।",
    content_hi: (en) => {
      const html = applyMap(en, LANDSCAPE_MAP);
      const leftover = [
        "About Landscape Unit",
        "Message from the Controlling",
        "Facutly",
        "Designation",
        "Thrust Area",
        "Infrastructure",
        "Plantation on the occasion",
      ].filter((s) => html.includes(s));
      console.log("landscape leftover:", leftover.length ? leftover : "none");
      return html;
    },
  });
  if (!APPLY) console.log("\nDry-run complete. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
