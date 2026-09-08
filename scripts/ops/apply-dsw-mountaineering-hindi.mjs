#!/usr/bin/env node
/**
 * Curated Hindi for DSW Mountaineering Club page + sidebars.
 *
 *   node scripts/ops/apply-dsw-mountaineering-hindi.mjs
 *   node scripts/ops/apply-dsw-mountaineering-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "0c2d238d-2171-4443-9d34-9b3099dfd314";

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

const CONTENT_HI = `<p><br></p><p style="text-align: center;"><img class="fr-dib" src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/W6wcB8PxyeCDxr5cgIUFSrMtSrgk17aVOPW6lBGF.png" style="width: 268px; height: 257.28px;"></p><p style="text-align: justify;"><br></p><p style="text-align: justify;"><span style='font-size: 18px; font-family: "Times New Roman", Times, serif; color: rgb(34, 31, 31);'>युवावस्था एवं रोमांच एक ही सिक्के के दो पहलू हैं। वास्तव में युवावस्था को जीवित वर्षों से नहीं, बल्कि उस रोमांच की भावना से मापा जाता है जिससे व्यक्ति ओतप्रोत रहता है। इसलिए यह सही कहा गया है कि जो राष्ट्र रोमांच को प्रोत्साहित करता है, वह युवा बना रहता है और अजेय सिद्ध होता है। साहसिक खेल प्रकृति की चुनौतियों को मनुष्य के समक्ष रखते हैं तथा उसे साहसी एवं ऊर्जावान बनाते हैं। ये युवाओं में रोमांच की भावना जगाते हैं तथा अज्ञात के भय को दूर करते हैं।</span><br><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><span style="color: rgb(34, 31, 31);">पर्वतारोहण, जिसे अक्सर पर्वत आरोहण अथवा अल्पाइनवाद कहा जाता है, एक ऐसा खेल है जिसमें पर्वतीय क्षेत्रों की ऊँचाईयों तक पहुँचना या पहुँचने का प्रयास करना शामिल है, मुख्यतः आरोहण के आनंद हेतु। पर्वतारोहण कभी-कभी विविध भावनाओं से भरा होता है, जिनमें कुछ परस्पर टकरा भी सकती हैं। पर्वत पर चढ़ने से मिलने वाली स्वतंत्रता की अनुभूति शब्दों में वर्णित नहीं की जा सकती। यह एक आध्यात्मिक अनुभव है जो आपको जीवंत एवं ऊर्जावान बनाता है। पर्वतारोहण खेल आपकी अंतर्निहित शक्तियों को प्रकट करता है तथा नई शक्तियाँ भी विकसित करता है। प्रत्येक आरोहण पर अच्छे और बुरे समय अवश्यंभावी हैं—यही इस खेल को कठिन एवं चरित्र-निर्माण वाला बनाता है।</span></span></span><br><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><span style="color: rgb(34, 31, 31);">सी.सी.एस. एच.ए.यू. पर्वतारोहण क्लब परिसर के युवाओं को इस खेल में निहित चुनौतियों को स्वीकार करने के अवसर प्रदान करता है। युवाओं की रोमांच के प्रति आसक्ति ने हमें अपना ध्येय वाक्य &ldquo;Youth for Adventure&rdquo; रखने हेतु प्रेरित किया। वर्ष 1971 में अपनी स्थापना के बाद से क्लब उल्लेखनीय उपलब्धियों के साथ निरंतर प्रगति कर रहा है।</span></span></span><span style='font-size: 18px; font-family: "Times New Roman", Times, serif; color: rgb(34, 31, 31);'>अब तक कुल 2500 सदस्यों ने क्लब की एक या अन्य गतिविधियों में भाग लिया है। कुछ सदस्यों ने हिमालय में 5000 किलोमीटर से अधिक ट्रेकिंग की है। क्लब ने सफलतापूर्वक छह शिखर आरोहण अभियान (1977, 1993, 2004, 2018, 2019 एवं 2022) पूर्ण किए हैं।</span></p>`;

const OBJECTIVES_HI = `<div class="cont_main" style="font-size:18px !important;vertical-align:baseline;background:rgb(255, 255, 255);color:rgb(61, 61, 61);font-family:Arial;text-align:start">उद्देश्य</div><div class="inner_cont" style="font-size:14px;vertical-align:baseline;background:rgb(255, 255, 255);text-align:justify;color:rgb(61, 61, 61);font-family:verdana"><div style="font-size:14px;vertical-align:baseline;background:transparent;width:708px"><ul style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(85, 85, 85)"><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">क्लब द्वारा प्रायोजित कार्यक्रमों एवं सामाजिक गतिविधियों के माध्यम से पर्वतारोहण को बढ़ावा देना।</span></li><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">सदस्यों को भारत के महान पर्वतों का मूलभूत ज्ञान प्रदान करना।</span></li><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">भारत की विभिन्न पर्वत श्रृंखलाओं में सुव्यवस्थित एवं उचित पर्यवेक्षण युक्त नए ट्रेकिंग मार्ग उपलब्ध कराना, जिससे स्वस्थ बाह्य मनोरंजक गतिविधि कार्यक्रम सुनिश्चित हो।</span></li><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">योग्य प्रशिक्षकों के माध्यम से उचित बाह्य कौशलों के विकास को प्रोत्साहित करना।</span></li><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">सदस्यों में स्वस्थ पर्यावरणीय आदतों का विकास करना।</span></li><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">विभिन्न शिविरों में सदस्यों को एक साथ लाकर राष्ट्रीय एकता को बढ़ावा देना।</span></li><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">साहस, सहनशक्ति, विश्वास एवं अनुशासन की गहन भावना विकसित करना।</span></li><li style="font-size:12px;vertical-align:baseline;background:transparent;color:rgb(102, 102, 102)"><span style="font-size:14px;vertical-align:baseline;background:transparent;color:rgb(61, 61, 61);font-family:Verdana, Arial, Helvetica, sans-serif">सदस्यों को बेहतर नागरिक एवं बेहतर मनुष्य बनने योग्य बनाना।</span></li></ul></div></div>`;

const MEMBERSHIP_HI = `<p style="text-align:justify"><strong style="font-size:14px;vertical-align:baseline;background:transparent"><span style="font-size:18px;vertical-align:baseline;background:transparent;font-family:Arial, sans-serif">सदस्यता</span></strong></p><p style="text-align:justify"><span style="font-size:13px;vertical-align:baseline;background:transparent;color:black;font-family:Arial, sans-serif">सदस्यों का चयन गहन जाँच एवं परीक्षाओं—जिनमें <b style="font-size:13.3333px;vertical-align:baseline;background:transparent">शारीरिक फिटनेस परीक्षा, लिखित परीक्षा</b> एवं <b style="font-size:13.3333px;vertical-align:baseline;background:transparent">साक्षात्कार</b> शामिल हैं—के बाद किया जाता है। यह सामान्यतः अक्टूबर की पहली तिमाही में आयोजित होता है।<br /><br /><b style="font-size:13.3333px;vertical-align:baseline;background:transparent">शारीरिक फिटनेस परीक्षा</b>: लगभग 5 किलोमीटर की दूरी में भाग लेना अनिवार्य है।</span></p><p style="text-align:justify"><span style="font-size:13px;vertical-align:baseline;background:transparent;color:black;font-family:Arial, sans-serif"><strong style="font-size:13.3333px;vertical-align:baseline;background:transparent">लिखित परीक्षा</strong>: प्रतिभागियों को साहसिक खेलों एवं क्लब संबंधी सरल बहुविकल्पीय प्रश्नों के उत्तर देने होते हैं। <br /><br /><b style="font-size:13.3333px;vertical-align:baseline;background:transparent">साक्षात्कार</b>: प्रतिभागी क्लब सलाहकारों एवं वरिष्ठ अधिकारियों से मिलकर बनी साक्षात्कार समिति के समक्ष उपस्थित होते हैं। <br /><br />चयनित अभ्यर्थियों की अंतिम सूची महाविद्यालय सूचना पट्ट पर प्रदर्शित की जाती है, तथा सदस्यता शुल्क जमा करने की अंतिम तिथि निर्धारित की जाती है।</span></p>`;

const DISCLAIMER_HI = `<p align="left" style="text-align:justify"><strong>अस्वीकरण 1</strong></p><p style="text-align:justify">आरोहण एक व्यक्तिगत विकल्प है तथा इसके लिए व्यक्तिगत उत्तरदायित्व आवश्यक है। आरोहण एवं संबंधित गतिविधियाँ खतरनाक हैं तथा चोट और/या मृत्यु का कारण बन सकती हैं। आरोहण आपको जोखिमों के संपर्क में लाता है। प्रशिक्षण अथवा कौशल से जोखिम समाप्त नहीं होते। किसी भी एच.ए.यू.एम.सी. गतिविधि अथवा कार्यक्रम में भाग लेकर आप उस गतिविधि अथवा कार्यक्रम से जुड़े सभी जोखिमों—जिनमें लापरवाही से उत्पन्न जोखिम शामिल हैं—को स्वीकार करते हैं एवं स्वयं वहन करते हैं।</p><p align="left" style="text-align:justify"><strong>अस्वीकरण 2</strong></p><p style="text-align:justify">इस वेबसाइट की जानकारी आंशिक रूप से एच.ए.यू.एम.सी. की आधिकारिक पत्रिका &ldquo;Excelsior&rdquo; में निहित जानकारी पर आधारित है।</p><p style="text-align:justify">इस जानकारी का उपयोग केवल शैक्षणिक उद्देश्य हेतु किया जा सकता है। किसी भी साहसिक गतिविधि में सम्मिलित होने से पूर्व योग्य प्रशिक्षक से परामर्श करें।</p>`;

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  Objectives: "उद्देश्य",
  "Executive Committee": "कार्यकारी समिति",
  Memberships: "सदस्यता",
  "Glorious Past": "गौरवशाली अतीत",
  Guidelines: "दिशानिर्देश",
  Disclaimer: "अस्वीकरण",
  "Registration/Application Form for Mountaineering Club": "पर्वतारोहण क्लब हेतु पंजीकरण/आवेदन पत्र",
  "Gallery of Mountaineering Club": "पर्वतारोहण क्लब की गैलरी",
};

/** Longest-first phrases for Glorious Past, Gallery, Guidelines. */
const PHRASES = [
  // Glorious Past
  ["OUR DISTINGUISHED GUESTS", "हमारे विशिष्ट अतिथि"],
  ["Brigadier Gyan Singh at Club's Annual Function (1975-76)", "क्लब के वार्षिक समारोह (1975-76) में ब्रिगेडियर ज्ञान सिंह"],
  ["The President IMF, Mr. H. C. Sarin addressing HAUMC mountaineers", "आई.एम.एफ. के अध्यक्ष श्री एच. सी. सरीन एच.ए.यू.एम.सी. पर्वतारोहियों को संबोधित करते हुए"],
  ["The President IMF, Mr. H. C. Sarin at Club's Annual Function (1976-77)", "क्लब के वार्षिक समारोह (1976-77) में आई.एम.एफ. के अध्यक्ष श्री एच. सी. सरीन"],
  ["Major H.P.S. Ahluwalia at Club's Annual Function (1979-80)", "क्लब के वार्षिक समारोह (1979-80) में मेजर एच.पी.एस. अहलूवालिया"],
  [
    "Dr. R. C. Paul, Vice Chancellor, Punjab University and an avid adventurer at Club's Annual Function (1980-81)",
    "क्लब के वार्षिक समारोह (1980-81) में डॉ. आर. सी. पॉल, कुलपति, पंजाब विश्वविद्यालय एवं उत्साही साहसी",
  ],
  ["Comdr. Joginder Singh at Club's Annual Function (1983-84)", "क्लब के वार्षिक समारोह (1983-84) में कमांडर जोगिंदर सिंह"],
  ["Col. Cheema at Club's Annual Function (1984-87)", "क्लब के वार्षिक समारोह (1984-87) में कर्नल चीमा"],
  ["Brigadier Arjun Ray at Club's Annual Function (1987-90)", "क्लब के वार्षिक समारोह (1987-90) में ब्रिगेडियर अर्जुन रे"],
  ["(Source:", "(स्रोत:"],
  // Gallery captions
  ["Mountaineering club Alumni meet (2017)", "पर्वतारोहण क्लब पूर्व छात्र मिलन (2017)"],
  ["Certificate distribution (2012)", "प्रमाण पत्र वितरण (2012)"],
  ["Certificate distribution (2013)", "प्रमाण पत्र वितरण (2013)"],
  ["Certificate distribution (2014)", "प्रमाण पत्र वितरण (2014)"],
  ["Certificate distribution (2019)", "प्रमाण पत्र वितरण (2019)"],
  ["Certificate Distribution (2023)", "प्रमाण पत्र वितरण (2023)"],
  ["Certificate distribution (2023)", "प्रमाण पत्र वितरण (2023)"],
  ["Desert trekking (2011)", "मरुस्थल ट्रेकिंग (2011)"],
  ["Rock climbing Jan (2013)", "रॉक क्लाइम्बिंग जनवरी (2013)"],
  ["Rock climbing (2013)", "रॉक क्लाइम्बिंग (2013)"],
  ["water sports sept (2014)", "जल क्रीड़ा सितंबर (2014)"],
  ["water sports (2014)", "जल क्रीड़ा (2014)"],
  ["water sports (2017)", "जल क्रीड़ा (2017)"],
  ["Water Sports ( 2022)", "जल क्रीड़ा (2022)"],
  ["Water Sports (2022)", "जल क्रीड़ा (2022)"],
  ["Skiing (2012)", "स्कीइंग (2012)"],
  ["Skiing (2013)", "स्कीइंग (2013)"],
  ["Mt. Jagatsukh (2011)", "माउंट जगतसुख (2011)"],
  ["Mt. Friendship 2026", "माउंट फ्रेंडशिप 2026"],
  ["Dodital (2012", "डोडीताल (2012"],
  ["CB-14 (2012)", "सी.बी.-14 (2012)"],
  ["Shingo La, Zanskar (2013)", "शिंगो ला, ज़ांस्कर (2013)"],
  ["Hampta Pass (2013)", "हैंप्टा पास (2013)"],
  ["Hamta pass (2023)", "हैंप्टा पास (2023)"],
  ["Parang La (2014)", "परंग ला (2014)"],
  ["Saraumga Pass (2015)", "सरौंगा पास (2015)"],
  ["Har-Ki-Dun (2015)", "हर-की-दून (2015)"],
  ["Mt. Deotibba (2016)", "माउंट देओतिब्बा (2016)"],
  ["Kalihani Pass (2017)", "कालिहानी पास (2017)"],
  ["Mt. Kanamo 5964 M (2018)", "माउंट कनामो 5964 मी. (2018)"],
  ["Indrahaar Pass (2018)", "इंद्रहार पास (2018)"],
  ["Kareril Lake (2019)", "करेरी झील (2019)"],
  ["Mt. Yunum 6114 M (2019)", "माउंट यूनम 6114 मी. (2019)"],
  ["Mt. Kang Yatse-II (6253M) 2022", "माउंट कांग यात्से-II (6253 मी.) 2022"],
  ["Mt. Kun (2023)", "माउंट कुन (2023)"],
  ["Bara Bhangal (2025)", "बड़ा भंगाल (2025)"],
  // Guidelines headings + body phrases
  ["Gathering Information", "जानकारी एकत्र करना"],
  ["gathering information", "जानकारी एकत्र करना"],
  ["Understanding Maps", "मानचित्र समझना"],
  ["Planning the Route", "मार्ग की योजना"],
  ["March Times", "मार्च समय"],
  ["Physical Preparation", "शारीरिक तैयारी"],
  ["How to use compass to find the right direction:", "सही दिशा ज्ञात करने हेतु कम्पास का उपयोग कैसे करें:"],
  ["Respect of Nature", "प्रकृति का सम्मान"],
  ["The Journey", "यात्रा"],
  ["First Aid Kit", "प्राथमिक चिकित्सा किट"],
  ["Food & Water", "भोजन एवं जल"],
  ["Food &amp; Water", "भोजन एवं जल"],
  ["Hints to correctly service your boots:", "जूतों की सही देखभाल हेतु सुझाव:"],
  ["Hints for successful packing:", "सफल पैकिंग हेतु सुझाव:"],
  ["Coats Jackets and Windbreakers", "कोट, जैकेट एवं विंडब्रेकर"],
  ["Gloves, Hats and Sun Glasses", "दस्ताने, टोपी एवं धूप के चश्मे"],
  ["GPS (Global Positioning System) receivers", "जी.पी.एस. (ग्लोबल पोजिशनिंग सिस्टम) रिसीवर"],
  [
    "No matter if you're thinking about crossing Antarctica or just taking a walk in the woods, planning the trip is always very important: it will avoid the unexpected and allow you to take the most out of your journey.",
    "चाहे आप अंटार्कटिका पार करने की सोच रहे हों या केवल जंगल में टहलने की—यात्रा की योजना सदैव अत्यंत महत्वपूर्ण है: इससे अप्रत्याशित स्थितियों से बचा जा सकता है तथा यात्रा का अधिकतम लाभ लिया जा सकता है।",
  ],
  [
    "Maps, guides and books can be found in specialized book shops or at local tourist office",
    "मानचित्र, गाइड एवं पुस्तकें विशेषीकृत पुस्तक भंडारों अथवा स्थानीय पर्यटन कार्यालय में उपलब्ध हो सकती हैं",
  ],
  [
    "More valuable, fresh and accurate information can be found at Indian Mountaineering Foundation office, Mountaineering Institutes, or simply talking to someone who already did the same trip",
    "अधिक मूल्यवान, ताजा एवं सटीक जानकारी भारतीय पर्वतारोहण फाउंडेशन कार्यालय, पर्वतारोहण संस्थानों से, अथवा उसी यात्रा को पहले कर चुके व्यक्ति से बात करके प्राप्त की जा सकती है",
  ],
  [
    "Weather information can be acquired from national and local forecasts and also from local inhabitants (especially the ones who live in the mountains seem to have a sixth sense about weather)",
    "मौसम संबंधी जानकारी राष्ट्रीय एवं स्थानीय पूर्वानुमानों तथा स्थानीय निवासियों से प्राप्त की जा सकती है (विशेषकर पर्वतों में रहने वाले लोगों में मौसम के प्रति विशेष अंतर्ज्ञान होता है)",
  ],
  [
    "Be very concerned about finding accurate maps and above all reliable and precise weather forecast: the lack of correct information can be very dangerous in these two cases.",
    "सटीक मानचित्र तथा सबसे बढ़कर विश्वसनीय एवं सटीक मौसम पूर्वानुमान प्राप्त करने हेतु विशेष सावधानी बरतें: इन दोनों मामलों में सही जानकारी का अभाव अत्यंत खतरनाक हो सकता है।",
  ],
  [
    "Remember: the more background information you get, the better.",
    "याद रखें: जितनी अधिक पृष्ठभूमि जानकारी मिले, उतना बेहतर।",
  ],
  [
    "is a drawing that represents with conventional symbols a part of earth's surface. A map contains a wealth of information for a trekker: distances, altitudes (and consequently differences in level), ground morphology, works of man, and above all tracks. Maps are characterized by the following:",
    "पारंपरिक प्रतीकों द्वारा पृथ्वी की सतह के भाग का चित्रण है। ट्रेकर हेतु मानचित्र में दूरी, ऊँचाई (तथा स्तर अंतर), भू-आकृति, मानव निर्मित संरचनाएँ तथा सबसे बढ़कर पथ संबंधी समृद्ध जानकारी होती है। मानचित्रों की विशेषताएँ निम्नानुसार हैं:",
  ],
  [
    "scale refers to the size of the representation on the map as compared to the actual distance on the ground. A map on the scale of 1 to 25000 (1:25000) represents 1 kilometer on the ground with 4 centimeters on the drawing. The best scale for trekking maps is",
    "स्केल मानचित्र पर चित्रण के आकार का वास्तविक भू-दूरी से अनुपात है। 1 से 25000 (1:25000) स्केल का मानचित्र भूमि पर 1 किलोमीटर को चित्र पर 4 सेंटीमीटर से दर्शाता है। ट्रेकिंग मानचित्रों हेतु सर्वोत्तम स्केल है",
  ],
  [
    "but you may need several, different scaled maps depending on the trip (for example one 1:100000 for a global view and several 1:50000 or 1:25000 that cover thoroughly the whole trek)",
    "किंतु यात्रा के अनुसार कई भिन्न स्केल के मानचित्र आवश्यक हो सकते हैं (उदाहरणार्थ समग्र दृष्टि हेतु एक 1:100000 तथा पूरे ट्रेक हेतु कई 1:50000 अथवा 1:25000)",
  ],
  [
    "contours are lines that connect points of equal elevation and are used to represent reliefs, shorelines and lakes. Usually the elevation associated with each line is reported using numbers or color codes.",
    "समोच्च रेखाएँ समान ऊँचाई के बिंदुओं को जोड़ती हैं तथा उच्चावच, तट रेखाएँ एवं झीलों को दर्शाती हैं। सामान्यतः प्रत्येक रेखा से जुड़ी ऊँचाई संख्याओं अथवा रंग कोड से बताई जाती है।",
  ],
  [
    "for names and cultures, or works of man; blue for water features (or hydrography); brown for relief (or hypsography); green for vegetation classifications; red for road classes and special information. There are however infinite variations (especially in tourist maps) so be sure to read the legend",
    "नामों, संस्कृतियों अथवा मानव निर्मित संरचनाओं हेतु; नीला जल सुविधाओं (जलविज्ञान) हेतु; भूरा उच्चावच (उच्चावच विज्ञान) हेतु; हरा वनस्पति वर्गीकरण हेतु; लाल सड़क वर्गों एवं विशेष जानकारी हेतु। तथापि अनगिनत विविधताएँ हैं (विशेषकर पर्यटन मानचित्रों में), अतः लीजेंड अवश्य पढ़ें",
  ],
  [
    "brief description or key of symbols and conventions used in the map",
    "मानचित्र में प्रयुक्त प्रतीकों एवं परंपराओं का संक्षिप्त विवरण अथवा कुंजी",
  ],
  [
    "When choosing the route to follow during the trip you should consider the following points:",
    "यात्रा के दौरान अनुसरण हेतु मार्ग चुनते समय निम्नलिखित बिंदुओं पर ध्यान दें:",
  ],
  [
    "Difficulties of the route (steep trails, glaciers and moraines to cross, presence of snow, etc.)",
    "मार्ग की कठिनाइयाँ (खड़ी पगडंडियाँ, पार करने योग्य हिमनद एवं मोरेन, बर्फ की उपस्थिति आदि)",
  ],
  [
    "Experience of the trekkers related to the difficulty of the route",
    "मार्ग की कठिनाई के सापेक्ष ट्रेकरों का अनुभव",
  ],
  ["Physical conditions of every member in the group", "समूह के प्रत्येक सदस्य की शारीरिक स्थिति"],
  ["Time available for the trip", "यात्रा हेतु उपलब्ध समय"],
  [
    "Other dangers specific to the area (for example sudden weather changes in the mountains)",
    "क्षेत्र विशेष के अन्य खतरे (उदाहरणार्थ पर्वतों में अचानक मौसम परिवर्तन)",
  ],
  [
    "Use this simple procedure to calculate approximately how much time it will take under normal conditions (no snow on ground) to cover the route you planned:",
    "सामान्य परिस्थितियों (भूमि पर बर्फ न हो) में नियोजित मार्ग तय करने में लगभग कितना समय लगेगा, इसकी गणना हेतु इस सरल प्रक्रिया का उपयोग करें:",
  ],
  [
    "measure distances on beam on the map: compute 1 hour every four kilometers",
    "मानचित्र पर दूरी मापें: प्रत्येक चार किलोमीटर हेतु 1 घंटा गिनें",
  ],
  [
    "measure differences in level: compute 1 hour every 400 meters",
    "ऊँचाई का अंतर मापें: प्रत्येक 400 मीटर हेतु 1 घंटा गिनें",
  ],
  [
    "to cover a route 16 kilometers long with a difference in level of 800 meters you need 7 hours 30 minutes (4 hours for distances + 2 hours for differences in level = 6 hours + 6 x 15 minutes = 7 hours 30 minutes)",
    "800 मीटर ऊँचाई अंतर वाले 16 किलोमीटर लंबे मार्ग हेतु आपको 7 घंटे 30 मिनट चाहिए (दूरी हेतु 4 घंटे + ऊँचाई अंतर हेतु 2 घंटे = 6 घंटे + 6 × 15 मिनट = 7 घंटे 30 मिनट)",
  ],
  [
    "This formula is a very approximate way to estimate trekking times: physical conditions, knowledge of the ground and specific weather conditions can enormously distort the estimated value. Rangers, alpine guides and your personal experience will give you much more precise information.",
    "यह सूत्र ट्रेकिंग समय का अत्यंत अनुमानित तरीका है: शारीरिक स्थिति, भू-ज्ञान एवं विशिष्ट मौसम स्थितियाँ अनुमान को बहुत बदल सकती हैं। रेंजर, अल्पाइन गाइड एवं आपका व्यक्तिगत अनुभव अधिक सटीक जानकारी देंगे।",
  ],
  [
    "Science and engineering have dramatically improved materials and characteristics delivering high quality products: a good trekker should know how to take advantage from both new and traditional gear bringing the right things with him.",
    "विज्ञान एवं अभियंत्रण ने सामग्री एवं गुणों में उल्लेखनीय सुधार कर उच्च गुणवत्ता उत्पाद दिए हैं: अच्छे ट्रेकर को नई एवं पारंपरिक दोनों सामग्री का सही उपयोग जानना चाहिए तथा सही सामान साथ रखना चाहिए।",
  ],
  [
    "The most important piece of equipment for a trekker: poor boots can compromise the success of an excursion. Keywords are",
    "ट्रेकर हेतु सबसे महत्वपूर्ण उपकरण: खराब जूते भ्रमण की सफलता को प्रभावित कर सकते हैं। मुख्य शब्द हैं",
  ],
  [
    ". A good pair of walking-boots is characterized by the following:",
    "। अच्छे वॉकिंग बूट्स की विशेषताएँ निम्नानुसार हैं:",
  ],
  [
    "(the part of a boot covering the instep and the toes): can be made of cordura, classic leather or revolutionary plastic - should wrap up the foot and be very resistant",
    "(जूते का वह भाग जो पैर के ऊपरी भाग एवं उंगलियों को ढकता है): कॉर्डुरा, क्लासिक चमड़े अथवा आधुनिक प्लास्टिक से बना हो सकता है—पैर को अच्छी तरह लपेटे तथा अत्यंत मजबूत हो",
  ],
  [
    "(the bottom surface of the boot): very important, must be adherent on every kind of ground, better if provided with shock absorbers in the heel",
    "(जूते की निचली सतह): अत्यंत महत्वपूर्ण, हर प्रकार की भूमि पर पकड़ हो, एड़ी में शॉक एब्जॉर्बर हो तो बेहतर",
  ],
  [
    "(part of the boot in contact with the foot) better if anatomic, comfortable, exchangeable, hygienic and easily driable",
    "(पैर से संपर्क वाला भाग) शारीरिक अनुकूल, आरामदायक, बदलने योग्य, स्वच्छ एवं आसानी से सूखने वाला हो तो बेहतर",
  ],
  [
    "The old, heavy climbing-boot is history, many people still prefer it to modern boots but it's a wrong belief (or at least a very personal one). Recent researches show that",
    "पुराने भारी क्लाइम्बिंग बूट इतिहास बन चुके हैं; कई लोग अभी भी आधुनिक जूतों की तुलना में उन्हें पसंद करते हैं, किंतु यह गलत धारणा है (अथवा अत्यंत व्यक्तिगत)। हाल के शोध बताते हैं कि",
  ],
  [
    "on the back (!) because the weight on the back is distributed on all the body, whereas the one on the foot only on legs. Better to wear light, transpirant, and above all comfortable boots. Prefer the ones to the ankle in height: they give much more support and protect your ankles from scrapes. There's the right boot for every situation: resistant and waterproof models are perfect for hikes high in the mountains with snow problems, light and transpirant for hot climates, but you'll find good compromises. Long trips require two pair of shoes: robust boots for difficult trails and light ones or tennis shoes for easy parts and resting in the evening.",
    "पीठ पर (!) क्योंकि पीठ का भार पूरे शरीर पर बँटता है, जबकि पैर का भार केवल टाँगों पर। हल्के, साँस लेने वाले एवं सबसे बढ़कर आरामदायक जूते पहनें। टखने तक ऊँचे जूते बेहतर सहारा देते एवं खरोंच से बचाते हैं। हर स्थिति हेतु उपयुक्त जूते: बर्फीले उच्च पर्वतों हेतु मजबूत वाटरप्रूफ, गर्म जलवायु हेतु हल्के साँस लेने वाले—अच्छे समझौते भी उपलब्ध हैं। लंबी यात्राओं हेतु दो जोड़ी जूते: कठिन पथ हेतु मजबूत एवं आसान भाग/शाम विश्राम हेतु हल्के अथवा टेनिस जूते।",
  ],
  [
    "never dry boots near heat sources (sun rays, fires or stoves) but always naturally",
    "जूतों को ताप स्रोतों (सूर्य किरणें, आग अथवा स्टोव) के पास कभी न सुखाएँ, सदैव प्राकृतिक रूप से सुखाएँ",
  ],
  [
    "clean the vamp from dirt using a hard brush and always when the boot is dry",
    "वैम्प की गंदगी कठोर ब्रश से साफ करें तथा सदैव जूते सूखे होने पर",
  ],
  [
    "when extra waterproof is needed spray some silicon on seams of the vamp (use grease only in leather models)",
    "अतिरिक्त वाटरप्रूफिंग हेतु वैम्प की सीम पर सिलिकॉन स्प्रे करें (ग्रीस केवल चमड़े के मॉडल में)",
  ],
  [
    "at the end of trekking season you should always dry, clean thoroughly and stock boots filling them with balls of paper and lacing them up",
    "ट्रेकिंग सीजन के अंत में जूतों को सदैव सुखाएँ, अच्छी तरह साफ करें तथा कागज के गोले भरकर फीते बाँधकर रखें",
  ],
  [
    "Socks are very important because they are in direct contact with skin. They should be comfortable, transpirant, keep the foot warm and dry and protect from irritations, abrasions and blisters. Cotton is cheap and comfortable but absorbs sweat and becomes rough after a little washing, wool keeps warm but doesn't allow transpiration and is too rough, synthetic fibers are good because they keep the foot warm and prevent diseases like mushrooms. Some models are also stuffed to increase comfort and prevent blisters.",
    "मोज़े अत्यंत महत्वपूर्ण हैं क्योंकि वे त्वचा से सीधे संपर्क में रहते हैं। आरामदायक, साँस लेने वाले, पैर को गर्म-सूखा रखने वाले तथा जलन, घर्षण एवं छाले से बचाने वाले हों। कपास सस्ता एवं आरामदायक है किंतु पसीना सोखता है; ऊन गर्म रखती है किंतु साँस नहीं लेने देती; सिंथेटिक रेशे पैर गर्म रखते एवं फफूँद जैसी बीमारियों से बचाते हैं। कुछ मॉडल आराम बढ़ाने हेतु गद्देदार भी होते हैं।",
  ],
  [
    "Shirts should keep warm the body but allow transpiration. Again wool is bad because it absorbs sweat becoming wet. Cotton is generally good but don't use it for warming: it easily gets wet and cools the body. Polypropylene (Pile) is a right choice because it's light, soft, promptly eliminates sweat and keeps warm (but it's expensive). A good combination can be to change your underwear cotton shirt every time it's wet and use a pile sweater over it to keep warm.",
    "शर्ट शरीर को गर्म रखे किंतु साँस लेने दे। ऊन पसीना सोखकर गीली हो जाती है। कपास सामान्यतः अच्छी है किंतु गर्माहट हेतु न उपयोग करें: गीली होकर शरीर ठंडा करती है। पॉलीप्रोपाइलीन (पाइल) सही विकल्प है—हल्का, मुलायम, पसीना तुरंत हटाता एवं गर्म रखता है (किंतु महँगा)। अच्छा संयोजन: गीली होने पर अंडरशर्ट बदलें तथा ऊपर पाइल स्वेटर पहनें।",
  ],
  [
    "Long pants in robust cotton or Cordura® or even Gore-Tex® in cold season keep warm and are needed in presence of ticks, thorns, etc. Short pants are excellent in warm season and for large trails (without brambles). Pile is warm and soft but too fragile to be used for mountain trekking. Do",
    "ठंड में मजबूत कपास, कॉर्डुरा® अथवा गोर-टेक्स® की लंबी पैंट गर्म रखती हैं तथा किलनी, काँटों आदि से बचाती हैं। गर्म मौसम एवं चौड़े पथ हेतु शॉर्ट पैंट उत्तम हैं। पाइल गर्म-मुलायम है किंतु पर्वतीय ट्रेकिंग हेतु बहुत नाजुक। ",
  ],
  [
    "use jeans: they are too rigid, get easily wet and hardly dry.",
    "जींस न पहनें: वे कठोर हैं, आसानी से गीली हो जाती हैं एवं कठिनाई से सूखती हैं।",
  ],
  [
    "Coats in Gore-Tex® or other new materials are perfect for cold season, lighter jackets are good for mild climates, windbreakers are ideal to protect against rain but usually don't allow transpiration. Only one hint when choosing a jacket: be sure it has lots of pockets to store seperately and find easily all your little gadgets.",
    "गोर-टेक्स® अथवा नई सामग्री के कोट ठंड हेतु उत्तम हैं, हल्के जैकेट समशीतोष्ण जलवायु हेतु अच्छे हैं, विंडब्रेकर वर्षा से बचाते हैं किंतु प्रायः साँस नहीं लेने देते। जैकेट चुनते समय एक ही सुझाव: कई जेबें हों ताकि छोटी वस्तुएँ अलग-अलग रखकर आसानी से मिलें।",
  ],
  [
    "Never leave for a trek without these three objects. Better to bring waterproof, filled and transpirant gloves that let fingers move freely. Use wools or pile hats for winter and colonial-type or baseball hats (with a bandana to cover the neck) for summer. Sun glasses are fundamental: protect yourself with high quality lenses both on snow or in the desert and prefer models that cover totally your eyes avoiding rays to enter from the sides.",
    "इन तीन वस्तुओं के बिना ट्रेक पर कभी न निकलें। वाटरप्रूफ, गद्देदार एवं साँस लेने वाले दस्ताने लें जो उंगलियों को स्वतंत्र रखें। सर्दी में ऊनी/पाइल टोपी तथा गर्मी में कॉलोनियल अथवा बेसबॉल टोपी (गर्दन ढकने हेतु बैंडाना सहित)। धूप के चश्मे आवश्यक हैं: बर्फ अथवा मरुस्थल में उच्च गुणवत्ता लेंस उपयोग करें तथा पार्श्व से किरणें रोकने वाले मॉडल चुनें।",
  ],
  [
    "A backpack must fit well your back and feel very comfortable: prefer anatomical models with filled shoulder-straps, a large belt around the waist and a smaller one on your breast. There should be lots (repeat lots) of pockets and the main bag should be divided into parts to better organize your stuff. Newer models also have a spacer between the backpack and your back to avoid sweating.",
    "बैकपैक पीठ पर सही बैठे एवं आरामदायक हो: गद्देदार कंधे की पट्टियाँ, कमर पर बड़ी बेल्ट एवं छाती पर छोटी बेल्ट वाले शारीरिक अनुकूल मॉडल चुनें। कई जेबें हों तथा मुख्य बैग संगठित रखने हेतु भागों में बँटा हो। नए मॉडल में पसीना कम करने हेतु बैकपैक एवं पीठ के बीच स्पेसर भी होता है।",
  ],
  [
    "Packing everything you need (even for the unexpected) but nothing more. Fill the backpack starting with things you'll hardly use putting on the top the stuff that must be available immediately (i.e. sweatshirt and windbreaker), put important things inside a waterproof bag (backpacks are never that waterproof), organize all your stuff balancing well every weight to avoid extra stress to your back (heavy objects near the body, bony ones on the external side).",
    "आवश्यक सब कुछ पैक करें (अप्रत्याशित हेतु भी) किंतु अधिक नहीं। कम उपयोग की वस्तुएँ नीचे, तुरंत चाहिए वस्तुएँ (स्वेटशर्ट, विंडब्रेकर) ऊपर रखें; महत्वपूर्ण वस्तुएँ वाटरप्रूफ थैले में रखें; पीठ पर अतिरिक्त दबाव से बचने हेतु भार संतुलित करें (भारी वस्तुएँ शरीर के पास, कठोर बाहरी ओर)।",
  ],
  [
    "that pleasure in travel is directly proportionate to how light your bags are: before leaving walk to the end of the block loaded with your backpack, than return home ... you'll certainly think something you packed isn't that vital!.",
    "यात्रा का आनंद बैग की हल्काई के समानुपाती है: निकलने से पहले बैकपैक लेकर गली के अंत तक चलें फिर लौटें… निश्चित ही लगेगा कि कुछ अनावश्यक पैक किया है!",
  ],
  [
    "There are basically two instruments a trekker can't live without:",
    "मूल रूप से दो यंत्र ऐसे हैं जिनके बिना ट्रेकर नहीं रह सकता:",
  ],
  [
    ". Both let you position yourself on the map and exactly know where you are, the second usually has a barometer that allows you to estimate weather forecast (increasing pressure generally means good weather, decreasing bad weather). For important trips high precision compass and altimeter are required, for easier ones may be the instruments present in some digital watches are enough (but the map should be accurate).",
    "। दोनों मानचित्र पर स्थिति जानने देते हैं; दूसरे में प्रायः बैरोमीटर होता है जिससे मौसम अनुमान लगाया जा सकता है (बढ़ता दबाव अच्छा मौसम, घटता खराब)। महत्वपूर्ण यात्राओं हेतु उच्च परिशुद्धता कम्पास एवं अल्टीमीटर आवश्यक; आसान हेतु डिजिटल घड़ी के यंत्र पर्याप्त हो सकते हैं (किंतु मानचित्र सटीक हो)।",
  ],
  [
    "Recently, new high technology devices are able to help even further a trekker.",
    "हाल ही में नई उच्च तकनीक युक्तियाँ ट्रेकर की और अधिक सहायता कर सकती हैं।",
  ],
  [
    ", relying on a network of satellites, allow you to determine actual postion and altitude. Advanced models are also capable of locating your position on a digital map and, if your previously set up your course, indicating the direction to take. Precision for normal GPS instruments is +/- 50-100 meters for position and +/- 200 meters for altitude. More precise values can be obtained if your device is able to decode DGPS correction on ultra short waves.",
    ", उपग्रह नेटवर्क पर आधारित, वास्तविक स्थिति एवं ऊँचाई बताते हैं। उन्नत मॉडल डिजिटल मानचित्र पर स्थिति तथा पूर्व निर्धारित मार्ग की दिशा भी दर्शाते हैं। सामान्य जी.पी.एस. परिशुद्धता स्थिति हेतु ±50–100 मीटर एवं ऊँचाई हेतु ±200 मीटर है। डी.जी.पी.एस. सुधार सक्षम उपकरण अधिक सटीक मान देते हैं।",
  ],
  [
    "For a long trip, may be without rests in equipped areas (huts, chalets, etc.), food becomes a serious matter. Bring highly nutritional food and don't rely only on snacks. Lyophilized food could be the right choice but do not exaggerate: after some time you'll start hating it. A full breakfast, many little meals during the day (better after a climb) and a complete dinner allow to cover adequately all your nutritional needs. Avoid stodgy food and think seriously about dry or fresh fruit and choccolate for fast snacks to restore energy. Water is also fundamental: trekking means losing a lot of water and mineral salts from sweating that you must promptly restore. Plain water isn't enough, add mineral salts through tablets or directly drinking saline integrators (i.e. sport drinks).",
    "लंबी यात्रा में (झोपड़ी आदि बिना विश्राम) भोजन गंभीर विषय बन जाता है। पौष्टिक भोजन लें, केवल स्नैक्स पर निर्भर न रहें। लियोफिलाइज्ड भोजन उपयुक्त हो सकता है किंतु अति न करें। पूर्ण नाश्ता, दिन में छोटे भोजन (आरोहण के बाद बेहतर) एवं पूर्ण रात्रिभोज पोषण आवश्यकताएँ पूरी करते हैं। भारी भोजन से बचें; ऊर्जा हेतु सूखे/ताजे फल एवं चॉकलेट सोचें। जल भी मूलभूत है: ट्रेकिंग में पसीने से जल एवं खनिज लवण खोते हैं जिन्हें तुरंत पूरा करें। सादा जल पर्याप्त नहीं; टैबलेट अथवा स्पोर्ट ड्रिंक से लवण जोड़ें।",
  ],
  [
    "during days before departure try to eat a little more than usual to accumulate supplies, always bring more water than needed ... you never know, during the trek drink regularly even if you are not thirsty: if you are it means your body already lost too much water and is fighting to recover.",
    "प्रस्थान से पहले के दिनों में सामान्य से थोड़ा अधिक खाएँ; आवश्यक से अधिक जल साथ रखें… पता नहीं कब काम आए; ट्रेक पर नियमित पिएँ भले प्यास न लगे: प्यास का अर्थ है शरीर पहले ही बहुत जल खो चुका है।",
  ],
  [
    "During the trek keep constantly aware of your position consulting the map and using instruments (compass and altimeter). The map must be kept in front of you folded in order to show your position and the route you still have to run. Use natural elements (mountains, watersheds, rivers), trails and man works to determine your position. For navigation memorize the next part of the trek focusing on specific characteristics and elements showed on the map. If visibility is scarce or you are unsure about your position you should consult your instruments. Altimeter is very useful to determine your position, compass is mainly used to find the direction you want to take as shown in the paragraph below. It's also very smart to turn back and look at the trails you've just walked through in order to better recognize the route on the way back (do this even if you're not planning to pass through the same trails on the way back ... emergency situations do occur).",
    "ट्रेक के दौरान मानचित्र एवं यंत्रों (कम्पास, अल्टीमीटर) से अपनी स्थिति निरंतर जानें। मानचित्र मोड़कर सामने रखें ताकि वर्तमान स्थिति एवं शेष मार्ग दिखे। पर्वत, जलविभाजक, नदी, पथ एवं मानव संरचनाओं से स्थिति निर्धारित करें। नेविगेशन हेतु अगले खंड की विशेषताएँ याद रखें। दृश्यता कम हो अथवा स्थिति अनिश्चित हो तो यंत्र देखें। अल्टीमीटर स्थिति हेतु उपयोगी; कम्पास दिशा हेतु (नीचे पैरा)। पीछे मुड़कर देखे गए पथ याद रखें ताकि वापसी पर पहचान आसान हो (भले वापसी उसी पथ से न हो… आपात स्थिति आ सकती है)।",
  ],
  [
    "place the compass on the map making sure the arrow on the instrument coincides with the direction you want to take on the map",
    "कम्पास को मानचित्र पर रखें ताकि यंत्र का तीर मानचित्र पर इच्छित दिशा से मेल खाए",
  ],
  [
    "rotate the graduated wheel until its north is aligned with the one on the map",
    "स्नातक चक्र घुमाएँ जब तक उसका उत्तर मानचित्र के उत्तर से संरेखित न हो",
  ],
  [
    "keep the magnetic needle aligned with the north on the wheel ... the arrow indicates the direction to take",
    "चुंबकीय सुई को चक्र के उत्तर से संरेखित रखें… तीर इच्छित दिशा दर्शाता है",
  ],
  [
    "Summer storms generally mean thunders. In this case remember that thunderstorms arise usually late in the afternoon and that a thunder strucks where distance between clouds and ground is shorter. Avoid high, naked plateaus, old tall trees and above all any sort of metallic object. A thunder usually strikes at most at three kilometers from the storm and you can calculate (approximately) the distance from you and the storm using this simple and famous rule: count the seconds between the lighting and the thunder, that's the distance in kilometers (I'll came up with a more scientific and less rural rule in the next edition). One last observation: if you notice your hair rising, itching of the skin or blue flames in the air ... start praying!",
    "ग्रीष्म तूफान प्रायः वज्रपात लाते हैं। याद रखें कि आँधी-तूफान प्रायः दोपहर बाद उठते हैं तथा वज्र जहाँ बादल एवं भूमि की दूरी कम हो वहाँ गिरता है। ऊँचे नंगे पठार, पुराने ऊँचे वृक्ष एवं धातु वस्तुएँ से बचें। वज्र प्रायः तूफान से अधिकतम तीन किलोमीटर तक गिरता है; दूरी अनुमान हेतु बिजली एवं गर्जन के बीच सेकंड गिनें—वही किलोमीटर में दूरी है। अंतिम अवलोकन: यदि बाल खड़े हों, त्वचा में खुजली हो अथवा नीली ज्वाला दिखे… प्रार्थना आरंभ करें!",
  ],
  [
    "Fresh, powdery snow is bad for walking and you'll need snow-shoes. Old (usually blue) snow is dangerous and subject to avalanches. If you have to cross a dangerous section, do it one at a time: a man overwhelmed by an avalanche has far more chances to survive if the other members of the party can find help.",
    "ताजा पाउडर बर्फ चलने हेतु कठिन है—स्नो-शू चाहिए। पुरानी (प्रायः नीली) बर्फ खतरनाक एवं हिमस्खलन प्रवण है। खतरनाक खंड एक-एक कर पार करें: हिमस्खलन में फँसे व्यक्ति के जीवित रहने की संभावना अधिक होती है यदि दल के अन्य सदस्य सहायता खोज सकें।",
  ],
  [
    "Weather is the most important factor in trekking: the large majority of accidents and tragedies that affect both inexperienced and professional trekkers is caused by bad weather. The one and only lesson you must always think about is: if you aren't sure about weather conditions or if you notice bad weather coming up during a trek terminate the trip immediately!",
    "ट्रेकिंग में मौसम सबसे महत्वपूर्ण कारक है: अनुभवहीन एवं पेशेवर दोनों ट्रेकरों के अधिकांश दुर्घटनाओं एवं त्रासदियों का कारण खराब मौसम है। एकमात्र पाठ जो सदैव याद रखें: यदि मौसम की स्थिति अनिश्चित हो अथवा ट्रेक के दौरान खराब मौसम आ रहा हो तो यात्रा तुरंत समाप्त करें!",
  ],
  [
    "Fog is a major problem in the mountains, it makes it impossible to orient yourself using instinct and natural elements forcing you to rely only on map and instruments. When you encounter fog check your position more frequently and if in group send one or more trekkers to examine the route in front of you always keeping a voice contact while the rest of the party remains at a well defined point. This will slow down your trip but will avoid taking wrong trails.",
    "पर्वतों में कोहरा बड़ी समस्या है; यह सहज ज्ञान एवं प्राकृतिक तत्वों से दिशा ज्ञान असंभव बना देता है तथा आपको केवल मानचित्र एवं उपकरणों पर निर्भर करता है। कोहरा आने पर स्थिति अधिक बार जाँचें तथा समूह में एक या अधिक ट्रेकरों को आगे का मार्ग जाँचने भेजें, आवाज़ संपर्क बनाए रखते हुए शेष दल निश्चित बिंदु पर रहे। इससे यात्रा धीमी होगी किंतु गलत पथ से बचा जा सकेगा।",
  ],
  [
    "Rain is a common phenomenon during a trek. Try to accustom yourself to the idea and prepare yourself to wear a waterproof jacket or better a \"poncho\" that covers even your backpack. Be also aware that the ground becomes very slicky (slow down).",
    "ट्रेक के दौरान वर्षा सामान्य है। इसके लिए तैयार रहें तथा वाटरप्रूफ जैकेट अथवा बेहतरतः बैकपैक को भी ढकने वाला \"पोंचो\" पहनने हेतु तैयार रहें। भूमि फिसलन भरी हो जाती है (गति धीमी करें)।",
  ],
  [
    "Trekking is aimed at exploring and enjoying nature. This means you must respect it. Don't litter the areas you visit and always bring some plastic bags to carry back home all your garbage. Don't tear vegetation or pull up mushrooms without good reasons. Leave alone wild animals and above all don't feed them: they won't be able to feed themselves when nobody will be there.",
    "ट्रेकिंग का उद्देश्य प्रकृति का अन्वेषण एवं आनंद है। अतः इसका सम्मान करें। भ्रमण क्षेत्रों में कचरा न फैलाएँ तथा अपना कचरा वापस लाने हेतु प्लास्टिक थैले साथ रखें। बिना उचित कारण वनस्पति न तोड़ें अथवा मशरूम न उखाड़ें। वन्य जीवों को अकेला छोड़ें तथा उन्हें खिलाएँ नहीं: जब कोई नहीं होगा तो वे स्वयं भोजन नहीं खोज पाएँगे।",
  ],
  [
    "This section contains some important information to use when your are \"on the field\" but the main idea is: be cautious and prepared for the unexpected.",
    "इस अनुभाग में \"मैदान\" पर उपयोग हेतु महत्वपूर्ण जानकारी है, किंतु मूल विचार है: सावधान रहें तथा अप्रत्याशित हेतु तैयार रहें।",
  ],
  [
    "Long trips require an excellent physical preparation but don't leave even for a short trek if you don't feel good. Before leaving for a journey you should practice and improve your body capabilities: start with short walks and a light backpack and gradually increase length, difficulty and weight. Be aerobically prepared for the climbs and concentrate on building your quadriceps muscles to take the strain off the knee joint when descending (down hill trekking can be harder than climbing). Use this period also to improve your skills using compass, altimeter and maps: practicing in known areas is better and you'll be smarter when the moment comes.",
    "लंबी यात्राओं हेतु उत्कृष्ट शारीरिक तैयारी आवश्यक है, किंतु अच्छा महसूस न हो तो छोटी ट्रेक पर भी न जाएँ। प्रस्थान से पहले अभ्यास कर शारीरिक क्षमता बढ़ाएँ: हल्के बैकपैक से छोटी सैर से आरंभ करें तथा धीरे-धीरे दूरी, कठिनाई एवं भार बढ़ाएँ। आरोहण हेतु एरोबिक तैयारी रखें तथा अवरोहण में घुटनों पर भार कम करने हेतु क्वाड्रिसेप्स मांसपेशियाँ मजबूत करें (नीचे की ट्रेकिंग ऊपर चढ़ने से कठिन हो सकती है)। इसी अवधि में कम्पास, अल्टीमीटर एवं मानचित्र कौशल भी सुधारें: ज्ञात क्षेत्रों में अभ्यास बेहतर है।",
  ],
  [
    "Never leave without a first aid kit. It should be adequate to the trip and cover at least the most frequent traumas (distortions and abrasions). Use a waterproof, shockproof and possibly thermic box to protect medicaments and try not to exaggerate: disinfectant, gauzes, cotton wool, band aids, scissors and forceps, anti-inflammatories and analgesics are the main items ... complete the list yourself.",
    "बिना प्राथमिक चिकित्सा किट के कभी न निकलें। यह यात्रा के अनुरूप हो तथा कम से कम सामान्य चोटों (मोच एवं घर्षण) को कवर करे। दवाओं की सुरक्षा हेतु वाटरप्रूफ, शॉकप्रूफ एवं संभवतः थर्मिक बॉक्स उपयोग करें तथा अति न करें: एंटीसेप्टिक, गॉज, रुई, बैंड-एड, कैंची एवं फोर्सेप्स, एंटी-इंफ्लेमेटरी एवं दर्द निवारक मुख्य वस्तुएँ हैं… सूची स्वयं पूर्ण करें।",
  ],
  ["Planning", "योजना"],
  ["Equipment", "उपकरण"],
  ["Navigation", "नेविगेशन"],
  ["Packing", "पैकिंग"],
  ["Instruments", "उपकरण / यंत्र"],
  ["Example:", "उदाहरण:"],
  ["Remember:", "याद रखें:"],
  ["Remember", "याद रखें"],
  ["Scale:", "स्केल:"],
  ["Contours:", "समोच्च रेखाएँ:"],
  ["Colors:", "रंग:"],
  ["Legend:", "लीजेंड:"],
  ["Boots", "जूते"],
  ["Clothing", "वस्त्र"],
  ["Socks", "मोज़े"],
  ["Shirts", "शर्ट"],
  ["Pants", "पैंट"],
  ["Weather", "मौसम"],
  ["Fog", "कोहरा"],
  ["Rain", "वर्षा"],
  ["Thunderbolts", "वज्रपात"],
  ["Snow", "बर्फ"],
  ["compass", "कम्पास"],
  ["altimeter", "अल्टीमीटर"],
  ["comfort", "आराम"],
  ["adherence", "पकड़"],
  ["Vamp", "वैम्प"],
  ["Sole", "सोल"],
  ["Plantar", "प्लांटर"],
  ["A map", "मानचित्र"],
  ["map", "मानचित्र"],
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

function captionHi(contentEn, labelHi) {
  if (!contentEn || contentEn.length > 500) return null;
  let hi = contentEn;
  if (/<strong>/i.test(hi)) {
    hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
  } else if (/<a[^>]*>/i.test(hi)) {
    hi = hi.replace(/(<a[^>]*>)([^<]+)(<\/a>)/i, `$1${labelHi}$3`);
  }
  return hi !== contentEn ? hi : null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("content_hi", CONTENT_HI.length);

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en,content_hi")
    .eq("page_id", PAGE_ID);

  const curated = {
    Objectives: OBJECTIVES_HI,
    Memberships: MEMBERSHIP_HI,
    Disclaimer: DISCLAIMER_HI,
  };

  for (const row of sides ?? []) {
    if (curated[row.label_en]) {
      console.log(`curated ${row.label_en} → ${curated[row.label_en].length}`);
    } else if (row.content_en && row.content_en.length > 100) {
      const hi = translateHtml(row.content_en);
      const letters = hi.replace(/<[^>]+>/g, " ").replace(/[^A-Za-z]/g, "").length;
      console.log(`phrase ${row.label_en}: en=${row.content_en.length} hi=${hi.length} leftoverLetters≈${letters}`);
    }
  }

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      title_hi: "पर्वतारोहण क्लब",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत पर्वतारोहण क्लब।",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("OK page");

  for (const row of sides ?? []) {
    const label_hi = LABEL_HI[row.label_en];
    if (!label_hi) continue;
    const patch = { label_hi, updated_at: now };

    if (curated[row.label_en]) {
      patch.content_hi = curated[row.label_en];
    } else if (row.label_en === "Glorious Past" || row.label_en === "Guidelines" || row.label_en === "Gallery of Mountaineering Club") {
      patch.content_hi = translateHtml(row.content_en || "");
    } else {
      const cap = captionHi(row.content_en, label_hi);
      if (cap) patch.content_hi = cap;
    }

    const { error: upErr } = await sb.from("ccshau_page_sidebar_items").update(patch).eq("id", row.id);
    if (upErr) throw upErr;
    console.log(`OK ${row.label_en} → ${label_hi}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
