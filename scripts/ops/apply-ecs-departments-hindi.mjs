#!/usr/bin/env node
/**
 * Hindi for all Estate Office (ECS) department about bodies + titles.
 *
 *   node scripts/ops/apply-ecs-departments-hindi.mjs
 *   node scripts/ops/apply-ecs-departments-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PARENT_ID = "53ed7025-d955-4a62-af09-7a7c38b6125e";

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

const TITLE_HI = {
  "House Allotment": "आवास आवंटन",
  "Executive Engineer (Electrical)": "कार्यकारी अभियंता (विद्युत)",
  "Executive Engineer (C.I)": "कार्यकारी अभियंता (सी.आई.)",
  "Executive Engineer (C.II)": "कार्यकारी अभियंता (सी.आई.आई.)",
  "Executive Engineer (Public Health)": "कार्यकारी अभियंता (सार्वजनिक स्वास्थ्य)",
  "Deputy Estate Officer": "उप एस्टेट अधिकारी",
  Sections: "अनुभाग",
};

const EXCERPT_HI = {
  "House Allotment": "एस्टेट कार्यालय के अंतर्गत आवास आवंटन।",
  "Executive Engineer (Electrical)": "एस्टेट कार्यालय के अंतर्गत कार्यकारी अभियंता (विद्युत)।",
  "Executive Engineer (C.I)": "एस्टेट कार्यालय के अंतर्गत कार्यकारी अभियंता (सी.आई.)।",
  "Executive Engineer (C.II)": "एस्टेट कार्यालय के अंतर्गत कार्यकारी अभियंता (सी.आई.आई.)।",
  "Executive Engineer (Public Health)": "एस्टेट कार्यालय के अंतर्गत कार्यकारी अभियंता (सार्वजनिक स्वास्थ्य)।",
  "Deputy Estate Officer": "एस्टेट कार्यालय के अंतर्गत उप एस्टेट अधिकारी।",
};

const CONTENT_HI = {
  "ecs-executive-engineer-electrical": `<p style="text-align:justify">अनुरक्षण मंडल एस्टेट अधिकारी-सह-मुख्य अभियंता के नियंत्रण में अधीक्षण अभियंता के माध्यम से दो उप-मंडलीय अभियंताओं (एस.डी.ई.), कनिष्ठ अभियंताओं (जे.ई.) एवं अन्य सहायक स्टाफ के साथ कार्य करता है। यह मंडल एच.ए.यू. परिसर, हिसार में अनुरक्षण कार्यों की देखरेख करता है। यह मंडल कार्यालय भवनों, महाविद्यालय भवनों, छात्रावासों, पुस्तकालय एवं आवासीय मकानों में दैनिक विद्युत आपूर्ति बनाए रखता है। विश्वविद्यालय परिसर, फार्म क्षेत्र एवं आर.डी.एस. फार्म सिरसा रोड की एच.टी./एल.टी. लाइनें भी विद्युत मंडल द्वारा अनुरक्षित की जाती हैं। आवंटन से पूर्व मकानों तथा छात्रावासों व कार्यालय भवनों में सिविल, लोक स्वास्थ्य एवं विद्युत कार्य भी अनुरक्षण मंडल के माध्यम से कराए जाते हैं। यह मंडल विद्युत विफलता की स्थिति में आपात आपूर्ति हेतु जेनरेटरों के अनुरक्षण एवं रखरखाव, स्ट्रीट लाइटों के अनुरक्षण, ई.पी.ए.बी.एक्स. प्रणाली के अनुरक्षण तथा इंदिरा गांधी सभागार के संचालन एवं अनुरक्षण हेतु उत्तरदायी है। परिसर एवं बाहरी केंद्रों में उपयोग/स्थापना हेतु विद्युत सामग्री की व्यवस्था के लिए सेंटर स्टोर (विद्युत) भी संचालित किया जाता है।</p>`,

  "ecs-executive-engineer-ci": `<p style="text-align:justify">बाहरी केंद्र सिविल मंडल, जिसका नेतृत्व कार्यकारी अभियंता (बाहरी केंद्र) करते हैं, अधीक्षण अभियंता के माध्यम से एस्टेट अधिकारी-सह-मुख्य अभियंता के समग्र नियंत्रण में चार उप-मंडलीय अभियंताओं (एस.डी.ई.), कनिष्ठ अभियंताओं (जे.ई.) एवं अन्य सहायक स्टाफ के साथ कार्य करता है। यह मंडल सभी बाहरी केंद्रों पर सड़कों, छात्रावासों, पुराने परिसर आवासीय क्षेत्र तथा कार्यालय भवनों के निर्माण/अनुरक्षण हेतु उत्तरदायी है। स्मिथी एवं बढ़ईगीरी कार्यशाला भी कार्यकारी अभियंता (बाहरी केंद्र) के नियंत्रण में कार्य करती है। नए निर्माण/मरम्मत कार्यों सहित विश्वविद्यालय की सभी परियोजनाओं के संरचनात्मक डिज़ाइन का कार्य भी इसी मंडल के नियंत्रण में है।</p>`,

  "ecs-executive-engineer-cii": `<p style="text-align:justify">सिविल मंडल संख्या 2, जिसका नेतृत्व कार्यकारी अभियंता (निर्माण) करते हैं, अधीक्षण अभियंता के माध्यम से एस्टेट अधिकारी-सह-मुख्य अभियंता के नियंत्रण में पाँच उप-मंडलीय अभियंताओं (एस.डी.ई.), कनिष्ठ अभियंता (जे.ई.) एवं अन्य सहायक स्टाफ के साथ कार्य करता है। यह मंडल एच.ए.यू. परिसर एवं सभी बाहरी केंद्रों—जिनमें के.जी.के., कृषि विज्ञान केंद्र एवं क्षेत्रीय अनुसंधान केंद्र आदि शामिल हैं—पर निर्माण कार्यों हेतु उत्तरदायी है। इस कार्यालय में सीमेंट एवं इस्पात आदि की व्यवस्था हेतु एक केंद्रीय स्टोर (सिविल) भी है। यह कार्यालय निर्धारित विभागीय शुल्कों के साथ केंद्र सरकार, राज्य सरकार, बोर्डों एवं अन्य बाहरी एजेंसियों के जमा कार्य भी करता है।</p>`,

  "ecs-executive-engineer-public-health": `<p style="text-align:justify">लोक स्वास्थ्य मंडल, जिसका नेतृत्व कार्यकारी अभियंता (सार्वजनिक स्वास्थ्य) करते हैं, अधीक्षण अभियंता के माध्यम से एस्टेट अधिकारी-सह-मुख्य अभियंता के नियंत्रण में उप-मंडलीय अभियंताओं (एस.डी.ई.), कनिष्ठ अभियंताओं (जे.ई.) एवं अन्य सहायक स्टाफ के साथ कार्य करता है। लोक स्वास्थ्य मंडल सी.सी.एस. एच.ए.यू. के परिसर एवं फार्मों में जल आपूर्ति बनाए रखता है। इस मंडल के पास दो जलकार्य (पुराना एवं नया) तथा 2.5 एम.एल.डी. क्षमता वाले सीवेज ट्रीटमेंट प्लांट (एस.टी.पी.) का अनुरक्षण है। एस.टी.पी. का कार्य विश्वविद्यालय परिसर के समस्त मलजल का उपचार करना तथा उपचार के पश्चात् इसे अनुसंधान फार्मों, उद्यानों आदि की सिंचाई जैसे बहुउपयोग हेतु उपलब्ध कराना है। यह मंडल विश्वविद्यालय परिसर की समग्र स्वच्छता एवं स्वस्थ वातावरण की भी देखरेख करता है।</p>`,
};

const DEPUTY_ABOUT_HI = `उप एस्टेट अधिकारी अधीक्षण अभियंता के माध्यम से एस्टेट अधिकारी-सह-मुख्य अभियंता के नियंत्रण में कार्य करते हैं। यह कार्यालय हिसार परिसर एवं सभी बाहरी केंद्रों पर एच.ए.यू. की भूमि के अभिलेख बनाए रखने तथा आवास आवंटन एवं दुकान आवंटन समिति द्वारा आवंटित मकानों व दुकानों आदि के लाइसेंस शुल्क की वसूली हेतु उत्तरदायी है। उप एस्टेट कार्यालय एच.ए.यू. परिसर में सफाई कार्य हेतु भी उत्तरदायी है।`;

const DEPUTY_PHRASES = [
  [
    "The Deputy Estate Officer works under the control of Estate Officer-cum-Chief Engineer through Superintending Engineer. This office is responsible for maintaining record of land of HAU at Hisar Campus as well as at all outstations and collection of licence fee of houses and shops etc. allotted by the House Allotment and Shop Allotment Committee. The Deputy Estate Office is also responsible for sweeping work in the HAU campus.",
    DEPUTY_ABOUT_HI,
  ],
  [
    "Regarding intimation about Transfer/Deputation of University Employees",
    "विश्वविद्यालय कर्मचारियों के स्थानांतरण/प्रतिनियुक्ति संबंधी सूचना",
  ],
  [
    "Regarding intimation about Transfer/deputation of University Employees",
    "विश्वविद्यालय कर्मचारियों के स्थानांतरण/प्रतिनियुक्ति संबंधी सूचना",
  ],
  [
    "Rate contract of Washing, Ironing and Dry Cleaning",
    "धुलाई, इस्त्री एवं ड्राई क्लीनिंग की दर अनुबंध",
  ],
  [
    "Rate contact of Washing, Ironing and Dry Cleaning",
    "धुलाई, इस्त्री एवं ड्राई क्लीनिंग की दर अनुबंध",
  ],
  ["Revised charges of university facilities", "विश्वविद्यालय सुविधाओं के संशोधित शुल्क"],
  [
    "Regarding realization of Liecence fees in respect of University Accommodation",
    "विश्वविद्यालय आवास के संबंध में लाइसेंस शुल्क की वसूली",
  ],
  [
    "Details of Residential Houses of CCS HAU Hisar as well as outstations",
    "सी.सी.एस. एच.ए.यू. हिसार एवं बाहरी केंद्रों के आवासीय मकानों का विवरण",
  ],
  [
    "DETAILS OF LAND AT CCS HAU HISAR CAMPUS AS WELL AS AT OUTSTATIONS",
    "सी.सी.एस. एच.ए.यू. हिसार परिसर एवं बाहरी केंद्रों पर भूमि का विवरण",
  ],
  ["NAME OF STATION", "केंद्र का नाम"],
  ["LAND TRANSFERRED", "हस्तांतरित भूमि"],
  ["LAND PURCHASED", "क्रय की गई भूमि"],
  ["LAND ON LEASE", "पट्टे पर भूमि"],
  ["LAND GIFTED", "दान की गई भूमि"],
  ["TOTAL LAND", "कुल भूमि"],
  ["Acre", "एकड़"],
  ["Kanal", "कनाल"],
  ["Marla", "मरला"],
  ["Hisar", "हिसार"],
  ["Buria (Yamunanagar)", "बुरिया (यमुनानगर)"],
  ["Kaul", "कौल"],
  ["Sirsa", "सिरसा"],
  ["Bawal", "बावल"],
  ["Rohtak", "रोहतक"],
  ["Uchani (Karnal)", "उचानी (करनाल)"],
  ["Fatehabad", "फतेहाबाद"],
  ["Jind", "जिंद"],
  ["Sonepat", "सोनीपत"],
  ["Bhiwani", "भिवानी"],
  ["Mahendergarh", "महेंद्रगढ़"],
  ["Mandkola", "मंदकोला"],
  ["Faridabad", "फरीदाबाद"],
  ["Palwal", "पलवल"],
  ["Kaithal", "कैथल"],
  ["Kurukshetra", "कुरुक्षेत्र"],
  ["Ambala", "अंबाला"],
  ["Pinjore", "पिंजौर"],
];

function translatePhrases(html, phrases) {
  let out = html
    .replace(/&nbsp;/gi, " ")
    .replace(/&rsquo;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
  const sorted = [...phrases].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of sorted) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  return out.replace(/&(?![a-zA-Z#0-9]+;)/g, "&amp;");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: kids, error } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,title_hi,content_en,content_hi")
    .eq("parent_id", PARENT_ID);
  if (error) throw error;

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("departments", kids?.length);

  for (const row of kids || []) {
    const title_hi = TITLE_HI[row.title_en] ?? row.title_hi;
    const excerpt_hi = EXCERPT_HI[row.title_en];
    let content_hi = CONTENT_HI[row.slug];
    if (row.slug === "ecs-deputy-estate-officer" && row.content_en) {
      content_hi = translatePhrases(row.content_en, DEPUTY_PHRASES);
    }
    console.log(
      `\n${row.slug}: title→${title_hi} content=${content_hi ? content_hi.length : "skip/empty"}`,
    );
    if (content_hi) {
      console.log(" ", content_hi.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 140));
    }

    if (!APPLY) continue;

    const patch = { title_hi, updated_at: now };
    if (excerpt_hi) patch.excerpt_hi = excerpt_hi;
    if (content_hi) patch.content_hi = content_hi;

    const { error: upErr } = await sb.from("ccshau_pages").update(patch).eq("id", row.id);
    if (upErr) throw upErr;
    console.log("  OK");
  }

  // Parent section title
  if (APPLY) {
    await sb
      .from("ccshau_pages")
      .update({ title_hi: "अनुभाग", updated_at: now })
      .eq("id", PARENT_ID);
    console.log("\nOK parent अनुभाग");
  }

  if (!APPLY) console.log("\nPass --apply to write.");
  else console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
