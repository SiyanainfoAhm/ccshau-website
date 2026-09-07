#!/usr/bin/env node
/**
 * Curated Hindi for DSW National Service Scheme page + sidebar labels.
 *
 *   node scripts/ops/apply-dsw-nss-hindi.mjs
 *   node scripts/ops/apply-dsw-nss-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "38496075-0a01-4482-a741-1c6e114ce4b6";

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

const S = 'font-size: 18px; font-family: "Times New Roman", Times, serif;';
const SF = "font-family: Times New Roman,Times,serif;";
const S18 = "font-size: 18px;";

const CONTENT_HI = `<p><strong><span style='${S}'>एन.एस.एस. के बारे में</span></strong></p><p style=""><br></p><p style="text-align:center;"><span style='font-size:15px;font-family:"Times New Roman","serif";'><img width="100" height="100" src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/W1fISxtCNw88jXbEqnNrAwqVihM2x1K9ffWFJsYQ.jpeg" alt="https://nss.highereduhry.ac.in/Images/NSS_Small.jpeg" class="fr-fic fr-dii"></span></p><p><br></p><p style="text-align: justify;"><strong><span style='${S}'>राष्ट्रीय सेवा योजना</span></strong><span style="${SF}"><span style="${S18}">, जिसे लोकप्रिय रूप से एन.एस.एस. कहा जाता है, का औपचारिक शुभारंभ 24 सितंबर, 1969 को राष्ट्रपिता की जन्म शताब्दी पर किया गया था। राष्ट्रीय सेवा योजना एक छात्र-केंद्रित कार्यक्रम है तथा यह शिक्षा की पूरक है। यह शैक्षणिक विस्तार का एक उत्कृष्ट प्रयोग है। सतत सामुदायिक अंतःक्रिया के माध्यम से यह छात्रों एवं शिक्षकों में स्वैच्छिक कार्य की भावना विकसित करती है। यह हमारे शैक्षणिक संस्थानों को समाज के निकट लाती है। यह परिसर एवं समुदाय, महाविद्यालय एवं गाँव, ज्ञान एवं कर्म के बीच की कड़ी है। एन.एस.एस. का समग्र उद्देश्य सामुदायिक सेवा के माध्यम से छात्रों का व्यक्तित्व विकास है। यह उच्च शिक्षा प्रणाली को विस्तार आयाम प्रदान करती है तथा छात्र युवाओं को सामुदायिक सेवा की ओर उन्मुख करती है।</span></span></p><p style="text-align: justify;"><span style="${SF}"><span style="${S18}"><strong>एन.एस.एस. के लक्ष्य</strong></span></span></p><ul><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">शिक्षा को अधिक प्रासंगिक बनाना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">छात्रों को ग्रामीण परिस्थिति से आमने-सामने परिचित कराना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">विकास परियोजनाओं की योजना एवं क्रियान्वयन में अपनी भूमिका निभाने हेतु छात्रों को अवसर प्रदान करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">छात्रों एवं गैर-छात्रों को साथ मिलकर कार्य करने हेतु प्रोत्साहित करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">नेतृत्व के गुण विकसित करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">श्रम की गरिमा एवं स्वावलंबन पर बल देना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">शारीरिक श्रम को बौद्धिक प्रयासों के साथ जोड़ने की आवश्यकता पर बल देना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">युवाओं को राष्ट्रीय विकास प्रक्रिया में उत्साहपूर्वक भाग लेने हेतु प्रोत्साहित करना तथा राष्ट्रीय एकता को बढ़ावा देना।</span></span></li></ul><p style="text-align: justify;"><span style="${SF}"><span style="${S18}"><strong>एन.एस.एस. के उद्देश्य</strong></span></span></p><ul><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">समुदाय को समझना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">अपने समुदाय के संबंध में स्वयं को समझना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">आवश्यकताओं एवं समस्याओं की पहचान करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">उन्हें समस्या-समाधान प्रक्रिया में सम्मिलित करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">अपने भीतर सामाजिक एवं नागरिक उत्तरदायित्व की भावना विकसित करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">व्यक्तिगत एवं सामुदायिक समस्याओं के व्यावहारिक समाधान खोजने में अपने ज्ञान का उपयोग करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">समूह जीवन हेतु आवश्यक दक्षता विकसित करना एवं उत्तरदायित्वों को साझा करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">सामुदायिक सहभागिता जुटाने के कौशल प्राप्त करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">नेतृत्व गुण एवं लोकतांत्रिक दृष्टिकोण अर्जित करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">आपात स्थितियों एवं प्राकृतिक आपदाओं का सामना करने की क्षमता विकसित करना।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">राष्ट्रीय एकता एवं सामाजिक सद्भाव का अभ्यास करना।</span></span></li></ul><p style="text-align: justify;"><span style="${SF}"><span style="${S18}"><strong>एन.एस.एस. ध्येय वाक्य</strong></span></span></p><ul><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">एन.एस.एस. का ध्येय वाक्य है <strong>&lsquo;न मैं, अपितु तुम&rsquo;</strong> (NOT Me But You)।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">यह लोकतांत्रिक जीवन के सार को प्रतिबिंबित करता है।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">निःस्वार्थ सेवा की आवश्यकता का समर्थन करता है।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">दूसरे व्यक्ति के दृष्टिकोण की सराहना विकसित करने में सहायक है।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">अन्य जीवों के प्रति विचारशीलता दर्शाना।</span></span></li></ul><p style="text-align: justify;"><span style="${SF}"><span style="${S18}"><strong>एन.एस.एस. बैज</strong></span></span></p><ul><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">एन.एस.एस. प्रतीक एन.एस.एस. बैज पर अंकित होता है। एन.एस.एस. स्वयंसेवक सामुदायिक सेवा के किसी भी कार्यक्रम के दौरान इसे पहनते हैं।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">प्रतीक में कोणार्क चक्र की आठ अरें दिन के 24 घंटों का प्रतिनिधित्व करती हैं।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">बैज का लाल रंग दर्शाता है कि एन.एस.एस. स्वयंसेवक रक्त से भरे हैं—अर्थात् जीवंत, सक्रिय, ऊर्जावान एवं उच्च उत्साह से युक्त।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">नेवी ब्लू रंग ब्रह्मांड को दर्शाता है जिसका एन.एस.एस. एक छोटा भाग है, जो मानव कल्याण हेतु अपना योगदान देने हेतु तैयार है।</span></span></li></ul><p style="text-align: justify;"><span style="${SF}"><span style="${S18}"></span></span><span style="${SF}"><span style="${S18}"><strong>एन.एस.एस. लोगो</strong></span></span></p><ul><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">एन.एस.एस. का प्रतीक ओडिशा स्थित कोणार्क सूर्य मंदिर के <strong>&lsquo;रथ&rsquo;</strong> चक्र पर आधारित है।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">सूर्य मंदिर के ये विशाल चक्र सृजन, संरक्षण एवं मुक्ति के चक्र को दर्शाते हैं तथा समय एवं स्थान में जीवन की गति को संकेतित करते हैं।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">यह समुदाय एवं परिवर्तन दोनों का प्रतीक है तथा सामाजिक रूपांतरण एवं उत्थान हेतु राष्ट्रीय सेवा योजना के निरंतर प्रयासों को दर्शाता है।</span></span></li></ul><p style="text-align: justify;"><span style="${SF}"><span style="${S18}"><strong>एन.एस.एस. दिवस</strong></span></span></p><ul><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">एन.एस.एस. का औपचारिक शुभारंभ 24 सितंबर, 1969 को किया गया था।</span></span></li><li style="text-align: justify;"><span style="${SF}"><span style="${S18}">यह राष्ट्रपिता की जन्म शताब्दी वर्ष था।</span></span></li><li style="text-align: justify;"><span style='${S}'>प्रत्येक वर्ष 24 सितंबर को उपयुक्त कार्यक्रमों एवं गतिविधियों के साथ एन.एस.एस. दिवस के रूप में मनाया जाता है।</span></li></ul>`;

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  "About NSS and Achievers": "एन.एस.एस. एवं उपलब्धियाँ",
  "NSS Report of COFS May 2025": "सी.ओ.एफ.एस. एन.एस.एस. रिपोर्ट मई 2025",
  "NSS Gallery": "एन.एस.एस. गैलरी",
};

function captionHi(contentEn, labelHi) {
  if (!contentEn || contentEn.length > 500) return null;
  let hi = contentEn;
  if (/<strong>/i.test(hi)) {
    hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
  } else if (/<a[^>]*>/i.test(hi)) {
    if (/<strong>/i.test(hi)) {
      hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
    } else if (/<span[^>]*>/i.test(hi)) {
      hi = hi.replace(/(<span[^>]*>)([^<]+)(<\/span>)/i, `$1${labelHi}$3`);
    } else {
      hi = hi.replace(/(<a[^>]*>)([^<]+)(<\/a>)/i, `$1${labelHi}$3`);
    }
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
  console.log("content_hi len", CONTENT_HI.length);
  console.log("preview:", CONTENT_HI.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 220));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      title_hi: "राष्ट्रीय सेवा योजना",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत राष्ट्रीय सेवा योजना।",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("OK page");

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en")
    .eq("page_id", PAGE_ID);

  for (const row of sides ?? []) {
    const label_hi = LABEL_HI[row.label_en];
    if (!label_hi) continue;
    const patch = { label_hi, updated_at: now };
    const cap = captionHi(row.content_en, label_hi);
    if (cap) patch.content_hi = cap;
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
