#!/usr/bin/env node
/**
 * Curated Hindi for DSW Art & Graphics page body + sidebar labels.
 *
 *   node scripts/ops/apply-dsw-art-graphics-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "e23eb90a-5eff-4599-a80c-cdeed5b811d7";

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

const S = "font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;";
const S19 = "font-size:19px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;";

const CONTENT_HI = `<p style="text-align:center;"><strong><span style="${S19}">कला एवं ग्राफिक्स सोसायटी</span></strong></p><p><strong><span style="${S}">परिचय</span></strong></p><p><span style="${S}">चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय की कला एवं ग्राफिक्स सोसायटी की स्थापना वर्ष 1970 में छात्रों में रचनात्मकता, कलात्मक उत्कृष्टता एवं दृश्य संचार को बढ़ावा देने के उद्देश्य से की गई थी। यह सोसायटी ललित कलाओं, फोटोग्राफी एवं ग्राफिक डिज़ाइन के क्षेत्रों में कलात्मक तथा तकनीकी कौशलों के पोषण हेतु एक बहु-विषयक मंच के रूप में कार्य करती है। सोसायटी में चित्रकला, रेखाचित्र, रंगोली, मिट्टी की मॉडलिंग, कोलाज निर्माण, कार्टूनिंग, पोस्टर डिज़ाइन, डिजिटल ग्राफिक्स एवं फोटोग्राफी सहित रचनात्मक विधाओं की विस्तृत श्रृंखला सम्मिलित है। विश्वविद्यालय शैक्षणिक ढाँचे के अंतर्गत स्नातक छात्रों हेतु सह-पाठ्यचर्या गतिविधि के रूप में फोटोग्राफी भी प्रस्तावित है। सोसायटी संरचित शैक्षणिक एवं पाठ्येतर गतिविधियों के माध्यम से छात्रों में रचनात्मक अभिरुचि, सौंदर्यबोध एवं व्यावसायिक दक्षताओं के विकास में सक्रिय योगदान करती है।</span></p><p><strong><span style="${S}">दृष्टि</span></strong></p><p><span style="${S}">एक जीवंत रचनात्मक वातावरण विकसित करना जो नवाचार, कलात्मक अभिव्यक्ति एवं दृश्य संचार को प्रोत्साहित करे तथा छात्रों में सांस्कृतिक एवं बौद्धिक विकास को बढ़ावा दे।</span></p><p><strong><span style="${S}">मिशन</span></strong></p><p><span style="${S}">कला, ग्राफिक्स एवं फोटोग्राफी में व्यवस्थित प्रशिक्षण एवं अनुभव प्रदान करना।</span></p><p><span style="${S}">छात्रों को रचनात्मक चिंतन एवं कलात्मक नवाचार का अन्वेषण करने हेतु प्रोत्साहित करना।</span></p><p><span style="${S}">विश्वविद्यालय की शैक्षणिक, सांस्कृतिक एवं सामाजिक गतिविधियों के साथ दृश्य कलाओं का एकीकरण करना।</span></p><p><span style="${S}">प्रतियोगिताओं, प्रदर्शनियों एवं सहयोगी परियोजनाओं के माध्यम से कलात्मक उत्कृष्टता को बढ़ावा देना।</span></p><p><strong><span style="${S}">सोसायटी का महत्व</span></strong></p><p><span style="${S}">कला एवं ग्राफिक्स सोसायटी विश्वविद्यालय के रचनात्मक एवं सांस्कृतिक पारिस्थितिकी तंत्र को सुदृढ़ करने में महत्वपूर्ण भूमिका निभाती है। सोसायटी का योगदान है:</span></p><ul><li><span style="${S}">रचनात्मकता, कल्पनाशक्ति एवं नवाचार का विकास।</span></li><li><span style="${S}">दृश्य प्रस्तुति के माध्यम से संचार में वृद्धि।</span></li><li><span style="${S}">सांस्कृतिक जागरूकता एवं कलात्मक सराहना को बढ़ावा।</span></li><li><span style="${S}">अवलोकन, विश्लेषणात्मक एवं डिज़ाइन कौशलों में सुधार।</span></li><li><span style="${S}">रचनात्मक एवं सह-पाठ्यचर्या गतिविधियों में छात्र सहभागिता को सुदृढ़ करना।</span></li></ul><p><span style="${S}">आधुनिक शिक्षा, विस्तार एवं सामाजिक जागरूकता में दृश्य संचार एक आवश्यक घटक बन चुका है। अतः सोसायटी ज्ञान प्रसार के साथ रचनात्मकता के एकीकरण हेतु एक महत्वपूर्ण माध्यम के रूप में कार्य करती है।</span></p><p><strong><span style="${S}">उद्देश्य</span></strong></p><ul><li><span style="${S}">छात्रों में कलात्मक प्रतिभा एवं रचनात्मक क्षमताओं का पोषण करना।</span></li><li><span style="${S}">चित्रकला, रेखाचित्र, फोटोग्राफी, डिजिटल कला एवं ग्राफिक डिज़ाइन में कौशल विकास के अवसर प्रदान करना।</span></li><li><span style="${S}">विश्वविद्यालय, राज्य एवं राष्ट्रीय स्तर पर छात्रों की रचनात्मक कृतियों के प्रदर्शन हेतु मंच तैयार करना।</span></li><li><span style="${S}">पोस्टर, बैनर, ब्रोशर, मंच पृष्ठभूमि एवं प्रचार सामग्री के रचनात्मक डिज़ाइन के माध्यम से विश्वविद्यालय कार्यक्रमों का समर्थन करना।</span></li><li><span style="${S}">कलात्मक गतिविधियों के माध्यम से टीमवर्क, नेतृत्व एवं आत्म-अभिव्यक्ति को प्रोत्साहित करना।</span></li><li><span style="${S}">विश्वविद्यालय समुदाय में सौंदर्यबोध एवं सांस्कृतिक समृद्धि को बढ़ावा देना।</span></li></ul><p><strong><span style="${S}">प्रमुख गतिविधियाँ एवं पहल</span></strong></p><p><strong><span style="${S}">प्रशिक्षण एवं कार्यशालाएँ</span></strong></p><p><span style="${S}">सोसायटी नियमित रूप से निम्नलिखित विषयों में कार्यशालाएँ, व्याख्यान एवं व्यावहारिक प्रशिक्षण कार्यक्रम आयोजित करती है:</span></p><ul><li><span style="${S}">रेखाचित्र एवं चित्रकला</span></li><li><span style="${S}">फोटोग्राफी एवं फोटो संपादन</span></li><li><span style="${S}">ग्राफिक डिज़ाइन एवं डिजिटल चित्रण</span></li><li><span style="${S}">कैलीग्राफी एवं रचनात्मक कला तकनीकें</span></li><li><span style="${S}">पोस्टर एवं दृश्य संचार डिज़ाइन</span></li></ul><p style="text-align:justify;"><strong><span style="${S}">प्रतियोगिताएँ एवं रचनात्मक कार्यक्रम</span></strong></p><p style="text-align:justify;"><span style="${S}">छात्रों को विभिन्न प्रतियोगिताओं में भाग लेने हेतु प्रोत्साहित किया जाता है, जैसे:</span></p><ul><li><span style="${S}">पोस्टर निर्माण</span></li><li><span style="${S}">लोगो डिज़ाइन</span></li><li><span style="${S}">रंगोली एवं कोलाज निर्माण</span></li><li><span style="${S}">फोटोग्राफी प्रतियोगिताएँ</span></li><li><span style="${S}">कार्टूनिंग एवं रेखाचित्र प्रतियोगिताएँ</span></li></ul><p style="text-align:justify;"><span style="${S}">ये गतिविधियाँ छात्रों की रचनात्मकता, तकनीकी कौशल एवं प्रतिस्पर्धी क्षमताओं को बढ़ाने में सहायक हैं।</span></p><p style="text-align:justify;"><strong><span style="${S}">विश्वविद्यालय कार्यक्रमों को समर्थन</span></strong></p><p style="text-align:justify;"><span style="${S}">सोसायटी विश्वविद्यालय के शैक्षणिक एवं सांस्कृतिक कार्यक्रमों हेतु रचनात्मक समर्थन प्रदान करती है:</span></p><ul><li><span style="${S}">मंच पृष्ठभूमि एवं सजावट का डिज़ाइन</span></li><li><span style="${S}">निमंत्रण पत्र, ब्रोशर एवं बैनर तैयार करना</span></li><li><span style="${S}">प्रचार एवं जागरूकता सामग्री का विकास</span></li></ul><p><strong><span style="${S}">कला प्रदर्शनी</span></strong></p><p><span style="${S}">सोसायटी छात्रों द्वारा निर्मित चित्रों, रेखाचित्रों, फोटोग्राफों एवं डिजिटल कलाकृतियों के प्रदर्शन हेतु प्रदर्शनियाँ आयोजित करती है। ये प्रदर्शियाँ कलात्मक प्रतिभा के प्रदर्शन एवं सहपाठी अधिगम हेतु एक व्यावसायिक मंच प्रदान करती हैं।</span></p><p><strong><span style="${S}">सामाजिक जागरूकता अभियान</span></strong></p><p><span style="${S}">सोसायटी निम्नलिखित विषयों से संबंधित सूचनात्मक पोस्टर एवं रचनात्मक संचार सामग्री डिज़ाइन कर सामाजिक एवं पर्यावरणीय जागरूकता अभियानों में सक्रिय रूप से भाग लेती है:</span></p><ul><li><span style="${S}">स्वास्थ्य एवं स्वच्छता</span></li><li><span style="${S}">पर्यावरण संरक्षण</span></li><li><span style="${S}">सामाजिक जागरूकता</span></li><li><span style="${S}">शैक्षिक विस्तार गतिविधियाँ</span></li></ul><p style="text-align:justify;"><strong><span style="${S}">कला एवं ग्राफिक्स सोसायटी की भूमिका</span></strong></p><p style="text-align:justify;"><span style="${S}">कला एवं ग्राफिक्स सोसायटी विश्वविद्यालय की एक महत्वपूर्ण रचनात्मक एवं सांस्कृतिक इकाई के रूप में कार्य करती है। इसके प्रमुख योगदान हैं:</span></p><ul><li><span style="${S}">कलात्मक एवं दृश्य समर्थन के माध्यम से विश्वविद्यालय कार्यक्रमों को सुदृढ़ करना।</span></li><li><span style="${S}">रचनात्मक ब्रांडिंग एवं डिज़ाइन के माध्यम से संस्थागत पहचान को बढ़ावा देना।</span></li><li><span style="${S}">दृश्य माध्यमों के उपयोग से संचार प्रभावशीलता बढ़ाना।</span></li><li><span style="${S}">छात्रों को नवाचार, रचनात्मकता एवं अंतःविषय अधिगम की ओर प्रेरित करना।</span></li><li><span style="${S}">व्यक्तित्व विकास एवं रचनात्मक नेतृत्व हेतु अवसर प्रदान करना।</span></li></ul><p style="text-align:justify;"><strong><span style="${S}">भविष्य की योजनाएँ</span></strong></p><p style="text-align:justify;"><span style="${S}">सोसायटी कला एवं डिजिटल मीडिया के उभरते क्षेत्रों में अपनी गतिविधियों का विस्तार निम्नलिखित माध्यमों से करना चाहती है:</span></p><ul><li><span style="${S}">उन्नत डिजिटल कला एवं ग्राफिक डिज़ाइन कार्यशालाओं का आरंभ।</span></li><li><span style="${S}">एनीमेशन एवं मल्टीमीडिया डिज़ाइन में प्रशिक्षण कार्यक्रम।</span></li><li><span style="${S}">वार्षिक कला महोत्सव एवं प्रदर्शनियों का आयोजन।</span></li><li><span style="${S}">अंतःविषय रचनात्मक परियोजनाओं हेतु अन्य छात्र समितियों एवं संस्थानों के साथ सहयोग।</span></li></ul><p><span style="${S}">व्यावसायिक मेंटरिंग एवं उद्योग अंतःक्रिया कार्यक्रमों की स्थापना।</span></p><p style="text-align:justify;"><strong><span style="${S}">निष्कर्ष</span></strong></p><p style="text-align:justify;"><span style="${S}">कला एवं ग्राफिक्स रचनात्मकता, नवाचार एवं संचार के सशक्त माध्यम हैं जो व्यक्तिगत विकास एवं सांस्कृतिक समृद्धि में महत्वपूर्ण योगदान देते हैं। कला एवं ग्राफिक्स सोसायटी छात्रों को अपनी कलात्मक क्षमता का अन्वेषण करने, व्यावसायिक रचनात्मक कौशल विकसित करने तथा विश्वविद्यालय के शैक्षणिक एवं सांस्कृतिक वातावरण में सार्थक योगदान देने के अवसर प्रदान करने हेतु प्रतिबद्ध है।</span></p><p style="text-align:center;"><span style="${S}">&ldquo;<strong>रचनात्मकता वह बुद्धिमत्ता है जो आनंद ले रही हो</strong>।&rdquo; &ndash; <strong>अल्बर्ट आइंस्टीन</strong></span></p><p style="text-align:justify;"><br></p>`;

const LABEL_HI = {
  Achievers: "उपलब्धियाँ",
  "Art & Graphic Gallery": "कला एवं ग्राफिक गैलरी",
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("content_hi len", CONTENT_HI.length);
  console.log("preview", CONTENT_HI.replace(/\s+/g, " ").slice(0, 200));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      title_hi: "कला एवं ग्राफिक्स",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत कला एवं ग्राफिक्स।",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("OK page content_hi");

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en,content_hi")
    .eq("page_id", PAGE_ID);

  for (const row of sides ?? []) {
    const label_hi = LABEL_HI[row.label_en];
    if (!label_hi) continue;
    const patch = { label_hi, updated_at: now };
    // PDF/short content: translate anchor if Achievers has a link label
    if (row.content_en && row.content_en.length < 400 && /<strong>|<span/.test(row.content_en)) {
      let hi = row.content_en;
      if (hi.includes("<strong>")) {
        hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${label_hi}</strong>`);
      } else {
        hi = hi.replace(/(<span[^>]*>)([^<]+)(<\/span>)/i, `$1${label_hi}$3`);
      }
      if (!hi.trim().startsWith("<p")) hi = `<p>${hi}</p>`;
      patch.content_hi = hi;
    }
    const { error: upErr } = await sb.from("ccshau_page_sidebar_items").update(patch).eq("id", row.id);
    if (upErr) throw upErr;
    console.log(`OK sidebar ${row.label_en} → ${label_hi}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
