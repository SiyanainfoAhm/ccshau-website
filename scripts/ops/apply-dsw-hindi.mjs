#!/usr/bin/env node
/**
 * Fix DSW Hindi: page titles (top menu/submenu), contacts, Ajanta sidebar,
 * and curated about content for root + accommodation.
 *
 *   node scripts/ops/apply-dsw-hindi.mjs
 *   node scripts/ops/apply-dsw-hindi.mjs --apply
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
  "directorate-of-students-welfare": "छात्र कल्याण निदेशालय",
  dsw: "छात्र कल्याण निदेशालय",
  "dsw-department": "डी.एस.डब्ल्यू. अनुभाग",
  "dsw-accommodation": "आवास",
  "dsw-art-graphics": "कला एवं ग्राफिक्स",
  "dsw-counseling-placement": "परामर्श एवं प्लेसमेंट",
  "dsw-dramatics-music-club": "नाट्य एवं संगीत क्लब",
  "dsw-literary-society": "साहित्यिक समिति",
  "dsw-mountaineering-club": "पर्वतारोहण क्लब",
  "dsw-national-cadet-corps": "राष्ट्रीय कैडेट कोर",
  "dsw-national-cadet-corps-kaul": "राष्ट्रीय कैडेट कोर, कौल",
  "dsw-national-service-scheme": "राष्ट्रीय सेवा योजना",
  "dsw-national-service-scheme-bawal": "राष्ट्रीय सेवा योजना, बावल",
  "dsw-national-service-scheme-kaul": "राष्ट्रीय सेवा योजना, कौल",
  "dsw-sports-activity": "खेल गतिविधि",
  "dsw-young-journalism-cell": "युवा पत्रकारिता प्रकोष्ठ",
  "dsw-youth-red-cross": "युवा रेड क्रॉस",
  "dsw-section-gallery": "डी.एस.डब्ल्यू. अनुभाग गैलरी",
  "faculty-of-adsw": "ए.डी.एस.डब्ल्यू. संकाय",
};

const EXCERPT_HI = {
  "directorate-of-students-welfare": "चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार का छात्र कल्याण निदेशालय।",
  "dsw-accommodation": "छात्र कल्याण निदेशालय के अंतर्गत आवास व्यवस्था।",
  "dsw-art-graphics": "छात्र कल्याण निदेशालय के अंतर्गत कला एवं ग्राफिक्स।",
  "dsw-counseling-placement": "छात्र कल्याण निदेशालय के अंतर्गत परामर्श एवं प्लेसमेंट।",
  "dsw-dramatics-music-club": "छात्र कल्याण निदेशालय के अंतर्गत नाट्य एवं संगीत क्लब।",
  "dsw-literary-society": "छात्र कल्याण निदेशालय के अंतर्गत साहित्यिक समिति।",
  "dsw-mountaineering-club": "छात्र कल्याण निदेशालय के अंतर्गत पर्वतारोहण क्लब।",
  "dsw-national-cadet-corps": "छात्र कल्याण निदेशालय के अंतर्गत राष्ट्रीय कैडेट कोर।",
  "dsw-national-service-scheme": "छात्र कल्याण निदेशालय के अंतर्गत राष्ट्रीय सेवा योजना।",
  "dsw-sports-activity": "छात्र कल्याण निदेशालय के अंतर्गत खेल गतिविधि।",
  "dsw-section-gallery": "छात्र कल्याण निदेशालय अनुभाग गैलरी।",
};

const ROOT_CONTENT_HI = `<p style="text-align:justify">निदेशक, छात्र कल्याण आवास, भोजन व्यवस्था तथा छात्रों के कल्याण एवं शैक्षणिक कार्य के अतिरिक्त विभिन्न सह-पाठ्यचर्या गतिविधियों की व्यवस्था के लिए उत्तरदायी हैं। छात्र कल्याण निदेशालय अपने सभी संघटक महाविद्यालयों के लिए छात्र मार्गदर्शन, परामर्श एवं प्लेसमेंट गतिविधियों का केंद्र है। निदेशालय सी.सी.एस. एच.ए.यू. स्नातकों को विभिन्न राष्ट्रीयकृत बैंकों, कृषि आधारित कंपनियों/उद्योगों/बहुराष्ट्रीय कंपनियों/गैर-सरकारी संगठनों आदि में उपयुक्त प्लेसमेंट प्राप्त करने में सहायता करता है। यह कोचिंग कक्षाएँ, प्रेरक व्याख्यान, मॉक समूह चर्चाएँ एवं साक्षात्कार अभ्यास आदि आयोजित कर छात्रों को भारत एवं विदेश में उच्च शिक्षा जारी रखने हेतु सुविधा प्रदान करता है। अंतिम उद्देश्य व्यक्तित्व विकास एवं बेहतर जीवन कौशल के माध्यम से छात्रों को देश के अच्छे नागरिक बनाना है। डी.एस.डब्ल्यू. कार्यालय में कल्याण गतिविधियों हेतु अन्य विभागों से अतिरिक्त कर्तव्य सौंपे गए विभिन्न संवर्ग के अधिकारी भी शामिल हैं। निदेशालय विश्वविद्यालय के पूर्व छात्रों से सम्मेलन एवं संपर्क भी आयोजित करता है।</p>`;

const ACCOMMODATION_CONTENT_HI = `<p style="text-align: justify;"><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, Times, serif;">छात्र कल्याण निदेशालय छात्रों के आवास एवं भोजन व्यवस्था के लिए उत्तरदायी है। हम सी.सी.एस. एच.ए.यू. हिसार में लड़कों हेतु पाँच छात्रावास, लड़कियों हेतु सात छात्रावास तथा पी.जी. विवाहित छात्रों हेतु एक छात्रावास; कौल परिसर में दो छात्रावास (एक लड़कों एवं एक लड़कियों हेतु) तथा बावल परिसर में दो छात्रावास (एक लड़कों एवं एक लड़कियों हेतु) संचालित करते हैं। छात्रों के आरामदायक प्रवास हेतु छात्रावासों में वाई-फाई कनेक्शन, एल.ई.डी., समाचार पत्र, पत्रिकाएँ, सौर एवं विद्युत जल-तापन प्रणाली, गैस कनेक्शन, फर्नीचर, ई.पी.ए.बी.एक्स. फोन सुविधा, शुद्धिकरण प्रणाली वाले वाटर कूलर तथा इनडोर खेल सुविधाएँ आदि आधुनिक सुविधाएँ उपलब्ध कराई गई हैं। छात्रावासों में कॉमन रूम, भोजन कक्ष, अध्ययन कक्ष आदि हैं। लगभग 1600 छात्र छात्रावासों में निवास करते हैं। छात्रावास कार्यक्रम तथा अंतः एवं अंतर-छात्रावास खेल प्रतियोगिताएँ आयोजित की जाती हैं। प्रशासन, अनुशासन, अच्छे व्यवहार एवं छात्रावास नियमों के प्रवर्तन हेतु प्रत्येक लड़कों के छात्रावास में दो वार्डन तथा प्रत्येक लड़कियों के छात्रावास में एक वार्डन नियुक्त हैं। छात्रावास प्रशासन में सहायता हेतु अच्छे स्तर के छात्रों में से हॉस्टल प्रीफेक्ट नियुक्त किए जाते हैं। छात्रों से मिलकर छात्रावासों में छात्र कल्याण समितियाँ गठित की जाती हैं। बर्तन, क्रॉकरी एवं अन्य सुविधाएँ विश्वविद्यालय द्वारा प्रदान की जाती हैं। प्रत्येक छात्रावास में दो मेस सहकारी आधार पर चलते हैं। छात्र स्वयं इन मेसों का संचालन करते हैं तथा मेस समिति का गठन करते हैं। पी.जी. (विवाहित) छात्रावास में 36 फ्लैट हैं तथा पी.जी. विवाहित छात्र (सी.सी.एस.एच.ए.यू. के ऐसे सेवारत छात्रों को छोड़कर जिनके पास विश्वविद्यालय के किसी स्टेशन पर सी.सी.एस.एच.ए.यू. आवास उपलब्ध है) अधिकतम 2 बच्चों के साथ परिवार सहित वहाँ रहने के पात्र हैं।</span></p><p style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;"><strong>छात्रावास प्रबंधन पर्यवेक्षण</strong></span></p><ul><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">प्रत्येक छात्र को छात्रावासों में अनुशासन एवं शांतिपूर्ण वातावरण बनाए रखना आवश्यक है।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">विश्वविद्यालय छात्रावासों में निवास करने वाले छात्रों को परिसर में मोटर चालित वाहन रखने एवं उपयोग की अनुमति नहीं होगी।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">किसी भी छात्रावास निवासी को वार्डन की पूर्व अनुमति के बिना रात्रि में छात्रावास से बाहर नहीं रहना चाहिए।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">लड़कियों के छात्रावासों में सायं दैनिक उपस्थिति ली जाती है तथा प्रत्येक छात्रा को रात्रि की निर्धारित समय पर व्यक्तिगत रूप से उपस्थित होना होता है।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">उपलब्धता के आधार पर विश्वविद्यालय में प्रवेशित छात्रों को छात्रावास आवास प्रदान किया जाएगा। तथापि स्नातक छात्राओं, विशेषकर प्रथम वर्ष की छात्राओं, को प्राथमिकता दी जाएगी।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">पी.जी. डिप्लोमा पाठ्यक्रमों के छात्रों हेतु छात्रावास सुविधा उपलब्ध नहीं है।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">विश्वविद्यालय के छात्रावास में प्रवेश चाहने वाले छात्र को आवेदन के साथ इन नियमों के प्रोफार्मा I एवं प्रोफार्मा II में निर्धारित प्रारूप में माता-पिता/अभिभावकों द्वारा प्रतिहस्ताक्षरित अतिरिक्त शपथ पत्र जमा करने होंगे।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">वार्डन सभी समय उपलब्ध रहेंगे तथा टेलीफोन एवं अन्य संचार माध्यमों पर संपर्क योग्य होंगे।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">कक्षाएँ समाप्त होने के बाद छात्रावासों में रैगिंग रोकने हेतु डीन/प्राचार्य/डी.एस.डब्ल्यू. द्वारा छात्रावास परिसर में चौबीसों घंटे निगरानी सुनिश्चित की जाती है।</span></li></ul>`;

const CONTENT_HI = {
  "directorate-of-students-welfare": ROOT_CONTENT_HI,
  "dsw-accommodation": ACCOMMODATION_CONTENT_HI,
};

const AJANTA_HI = "अजंता छात्रावास (हिसार परिसर)";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  const slugs = Object.keys(TITLE_HI);
  const { data: pages, error } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,title_hi,excerpt_hi,content_hi")
    .in("slug", slugs);
  if (error) throw error;

  for (const page of pages ?? []) {
    const title_hi = TITLE_HI[page.slug];
    const excerpt_hi = EXCERPT_HI[page.slug];
    const content_hi = CONTENT_HI[page.slug];
    const changes = [];
    if (title_hi && title_hi !== page.title_hi) changes.push(`title→${title_hi}`);
    if (excerpt_hi && excerpt_hi !== page.excerpt_hi) changes.push("excerpt");
    if (content_hi && content_hi !== page.content_hi) changes.push(`content(${content_hi.length})`);
    if (!changes.length) {
      console.log(`  skip ${page.slug}`);
      continue;
    }
    console.log(`  ${page.slug}: ${changes.join(", ")}`);
    if (!APPLY) continue;
    const patch = { updated_at: now };
    if (title_hi) patch.title_hi = title_hi;
    if (excerpt_hi) patch.excerpt_hi = excerpt_hi;
    if (content_hi) patch.content_hi = content_hi;
    const { error: upErr } = await sb.from("ccshau_pages").update(patch).eq("id", page.id);
    if (upErr) throw upErr;
  }

  // Contacts on root
  const root = (pages ?? []).find((p) => p.slug === "directorate-of-students-welfare");
  if (root && APPLY) {
    const mailingHi = "छात्र कल्याण निदेशालय\nसी.सी.एस. एच.ए.यू. हिसार";
    const addressHi = "निदेशक, छात्र कल्याण, सी.सी.एस. एच.ए.यू., हिसार";
    await sb
      .from("ccshau_page_contact_lines")
      .update({ value_hi: mailingHi, updated_at: now })
      .eq("page_id", root.id)
      .eq("label_en", "Mailing Address");
    await sb
      .from("ccshau_page_contact_lines")
      .update({ value_hi: addressHi, updated_at: now })
      .eq("page_id", root.id)
      .eq("label_en", "Address");
    console.log("OK root contact value_hi");
  }

  // Fix Ajanta sidebar labels on any DSW page
  const { data: ajantaRows } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,page_id")
    .eq("label_en", "Ajanta Hostel (Hisar Campus)");
  for (const row of ajantaRows ?? []) {
    console.log(`  Ajanta sidebar ${row.id}: ${row.label_hi} → ${AJANTA_HI}`);
    if (!APPLY) continue;
    await sb
      .from("ccshau_page_sidebar_items")
      .update({ label_hi: AJANTA_HI, updated_at: now })
      .eq("id", row.id);
  }

  // Also fix any label_hi that still has broken अजanta
  const { data: brokenAjanta } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi")
    .ilike("label_hi", "%अजanta%");
  for (const row of brokenAjanta ?? []) {
    const fixed = (row.label_hi || "").replace(/अजanta/g, "अजंता");
    console.log(`  fix broken Ajanta hi: ${row.label_hi} → ${fixed}`);
    if (!APPLY) continue;
    await sb
      .from("ccshau_page_sidebar_items")
      .update({ label_hi: fixed, updated_at: now })
      .eq("id", row.id);
  }

  if (!APPLY) console.log("\nPass --apply to write.");
  else console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
