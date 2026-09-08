#!/usr/bin/env node
/**
 * Replace mixed EN+HI content_hi with full curated Hindi for KVK Ambala & Karnal.
 *
 *   node scripts/ops/apply-kvk-ambala-karnal-hindi.mjs --apply
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
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const AZURE = "https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage";

const AMBALA_HI = `<table><tbody><tr><td><img src="${AZURE}/myQXsMBbJCazCIzBd1WmHSu8ZcNQKUDV47ZQwF4b.jpeg" style="width:300px" class="fr-fic fr-dib" /></td><td><p>वरिष्ठ समन्वयक,</p><p>श्रीमती सुनीता अहूजा</p><p>कृषि विज्ञान केंद्र, अंबाला</p><p><strong>ई-मेल:</strong> <a href="mailto:sckvkambala@gmail.com">sckvkambala@gmail.com</a></p><p><strong>फोन:</strong> 9416457774</p></td></tr></tbody></table><p><br /></p><p style="text-align:justify"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार ने किसानों, कृषि महिलाओं एवं विस्तार कर्मियों के प्रशिक्षण तथा कृषि एवं संबद्ध क्षेत्रों में व्यावसायिक पाठ्यक्रमों के माध्यम से प्रौद्योगिकी विकास प्रक्रिया में केंद्रों की भागीदारी के लिए मानव संसाधन विकास हेतु कृषि विज्ञान केंद्रों का एक नवाचारी विज्ञान-आधारित संस्थानों का नेटवर्क विकसित एवं स्थापित किया है। कृषि विज्ञान केंद्र एक जमीनी स्तर का संस्थान है जो कृषि क्षेत्र के लाभार्थियों को आवश्यकता-आधारित एवं कौशल-उन्मुख अल्पकालिक तथा दीर्घकालिक व्यावसायिक प्रशिक्षण प्रदान करता है।</span></p><p style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:18px">छोटे, सीमांत एवं कृषि मजदूरों की स्थिति सुधारने पर विशेष बल दिया जा रहा है। अंबाला जिले के कृषक समुदाय की सेवा हेतु चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार ने 2 फरवरी, 1970 को अंबाला सिटी में कृषि विज्ञान केंद्र, अंबाला की स्थापना की। इसके पास स्वयं की 37 एकड़ कृषि भूमि है। केंद्र वैज्ञानिकों, विषय विशेषज्ञों, विस्तार कर्मियों एवं किसानों की सहयोगात्मक भागीदारी के सिद्धांत पर कार्य करता है। कृषि विज्ञान केंद्र के अस्तित्व का विस्तृत विवरण निम्नानुसार है:</span></span></p><p><span style="font-family:Times New Roman,Times,serif"><span style="font-size:18px"><strong>कृषि विज्ञान केंद्र की स्थापना: </strong>कृषि विज्ञान केंद्र, अंबाला (पूर्व में कृषि ज्ञान केंद्र) की स्थापना हरियाणा कृषि विश्वविद्यालय, हिसार के गठन से पूर्व विस्तार शिक्षा निदेशालय, पंजाब कृषि विश्वविद्यालय, लुधियाना के अधीन हुई थी। संसद अधिनियम द्वारा पंजाब कृषि विश्वविद्यालय के पुनर्गठन के फलस्वरूप 2 फरवरी 1970 को हरियाणा कृषि विश्वविद्यालय अस्तित्व में आया। अत: कृषि ज्ञान केंद्र, अंबाला 2 फरवरी 1970 को हरियाणा कृषि विश्वविद्यालय, हिसार के प्रशासनिक नियंत्रण में आ गया और उसी दिन से एचएयू के अधीन कार्य करना प्रारंभ किया। कृषि ज्ञान केंद्र भवन का उद्घाटन 27 फरवरी 1976 को तत्कालीन कृषि मंत्री, हरियाणा सरकार, कर्नल महा सिंह ने किया। यह अंबाला सिटी (जिला न्यायालयों के निकट) में स्थित है, जो हरियाणा के उत्तर-पूर्वी कोने में राष्ट्रीय राजमार्ग-1 पर राज्य राजधानी चंडीगढ़ से लगभग 45 कि.मी. तथा मुख्यालय एचएयू हिसार से लगभग 180 कि.मी. की दूरी पर है।</span></span></p><p style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:18px"><strong>संगठन में परिवर्तनों का इतिहास: </strong></span></span><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">आरंभ में केंद्र पर तीन घटक थे — कृषि ज्ञान केंद्र, वर्षा आधारित परिस्थितियों में गेहूँ अनुसंधान केंद्र तथा रोग जाँच प्रयोगशाला (पशु चिकित्सा)। पूरे हरियाणा में समान नामकरण हेतु कृषि ज्ञान केंद्र का नाम बदलकर कृषि विज्ञान केंद्र कर दिया गया। वर्ष 2003 में गेहूँ अनुसंधान योजना को सब्जी अनुसंधान योजना में परिवर्तित किया गया तथा बाद में 2006 में अनुसंधान घटक को कृषि विज्ञान केंद्र में विलय कर दिया गया, साथ ही वर्षा आधारित गेहूँ पर अनुसंधान भी जारी रहा। वर्षा आधारित परिस्थितियों में गेहूँ अनुसंधान घटक 2014-15 तक संचालित रहा। चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार के पुनर्गठन एवं नई विश्वविद्यालय लाला लाजपत राय पशु चिकित्सा एवं पशु विज्ञान विश्वविद्यालय के गठन (01.12.2010) के साथ, कृषि विज्ञान केंद्र अंबाला की रोग जाँच प्रयोगशाला 07.04.2010 को नई विश्वविद्यालय के प्रशासनिक नियंत्रण में आ गई।</span></p><p></p>`;

const KARNAL_HI = `<table><tbody><tr><td><img src="${AZURE}/0OtezUkCrULQsFKUuaJmaXEcweOCBYMmniziMrdL.jpeg" style="width:300px" class="fr-fic fr-dib" /></td><td><p>डॉ. महा सिंह जगलान</p><p>वरिष्ठ समन्वयक (अतिरिक्त प्रभार)</p><p>कृषि विज्ञान केंद्र, करनाल</p><p>09416218761</p><p><strong>ई-मेल:</strong> <a href="mailto:sckvkkarnal123@gmail.com">sckvkkarnal123@gmail.com</a></p><p><strong>फोन:</strong> 08708283551</p></td></tr></tbody></table><p style="text-align:justify"><br /></p><p style="text-align:justify"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif;color:rgb(51, 51, 51);background:white">कृषि विज्ञान केंद्र की स्थापना 1966 में हुई और यह पंजाब कृषि विश्वविद्यालय, लुधियाना के अधीन था। 2 फरवरी, 1970 को हरियाणा कृषि विश्वविद्यालय अस्तित्व में आया, तभी हरियाणा के सभी कृषि विज्ञान केंद्र भी एचएयू, हिसार के नियंत्रण में आ गए। स्थापना के समय इसका नाम कृषि ज्ञान केंद्र था और वर्ष 2002 में इसका नामकरण बदलकर कृषि विज्ञान केंद्र कर दिया गया। जिस परिसर में कृषि विज्ञान केंद्र स्थित है, वहाँ अन्य किसान सलाहकार सेवाएँ भी उपलब्ध हैं जैसे सीसीएसएचएयू क्षेत्रीय अनुसंधान स्टेशन, मृदा एवं जल परीक्षण प्रयोगशाला, लुवास का क्षेत्रीय अनुसंधान स्टेशन, उद्यान विज्ञान प्रशिक्षण संस्थान, जिला उद्यान विज्ञान कार्यालय, बीज परीक्षण प्रयोगशाला तथा अभियांत्रिकी इकाई, हरियाणा सरकार। केंद्र तक पहुँच राष्ट्रीय राजमार्ग संख्या 1 तथा यमुनानगर-इंद्री मार्ग दोनों से है; यह नया बस स्टैंड, करनाल से पैदल दूरी पर है। करनाल का महाभारत काल से ऐतिहासिक महत्व है और इसका नाम दानवीर राजा कर्ण के नाम पर पड़ा। करनाल कृषि अनुसंधान संस्थानों का केंद्र है जैसे आईएआरआई क्षेत्रीय अनुसंधान केंद्र, भारतीय गेहूँ एवं जौ अनुसंधान संस्थान, राष्ट्रीय डेयरी अनुसंधान संस्थान, सीएसएसआरआई, अतः इस जिले के किसान अत्यंत नवाचारी एवं प्रगतिशील हैं तथा खेती की नवीनतम प्रौद्योगिकी अपना रहे हैं। करनाल जिले की स्थलाकृति मैदानी है और ट्यूबवेल तथा नहरों से सुसिंचित है। किसान सामान्यतः धान, गेहूँ, गन्ना, सब्जियाँ एवं फल फसलें उगाते हैं। करनाल जिला <strong>बासमती धान की खेती</strong> के लिए प्रसिद्ध है, जिसे अपने ट्रेडमार्क <strong>तरावड़ी बासमती</strong> के नाम से अन्य देशों को निर्यात किया जाता है। कृषि विज्ञान केंद्र, करनाल टोल फ्री नंबर 18001803111 के माध्यम से हरियाणा एवं अन्य राज्यों के किसानों को सलाहकार सेवाएँ भी प्रदान करता है।</span></p><p style="text-align:justify"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif;color:rgb(51, 51, 51);background:white">कृषि विज्ञान केंद्र की गतिविधियों में प्रौद्योगिकी आकलन, परिष्करण एवं हस्तांतरण शामिल हैं, जिनका उद्देश्य अनुसंधान संस्थानों में विकसित प्रौद्योगिकी तथा किसानों द्वारा खेत स्तर पर उसका अपनाने के बीच की दूरी को प्रौद्योगिकी/उत्पाद आदि के प्रदर्शन एवं किसानों, ग्रामीण युवाओं तथा विस्तार कर्मियों के प्रशिक्षण के माध्यम से पाटना है। प्रौद्योगिकी आकलन एवं परिष्करण की अवधारणा सहभागी पद्धति पर आधारित है, जो वैज्ञानिक-किसान संबंध को सुदृढ़ करती है तथा अनुसंधान प्रणालियों द्वारा विकसित कृषि प्रौद्योगिकियों तक कृषक समुदाय की पहुँच सुनिश्चित करती है। इसके लिए विभिन्न अनुसंधान एवं प्रौद्योगिकी हस्तांतरण तंत्रों के माध्यम से समग्र कृषि एवं ग्रामीण विकास हेतु कृषि विज्ञान केंद्रों की भूमिका अत्यंत महत्वपूर्ण है।</span></p><p></p>`;

const UPDATES = [
  { slug: "krishi-vigyan-kendra-ambala", content_hi: AMBALA_HI },
  { slug: "home-17", content_hi: AMBALA_HI },
  { slug: "krishi-vigyan-kendra-karnal", content_hi: KARNAL_HI },
  { slug: "home-38", content_hi: KARNAL_HI },
];

async function main() {
  console.log(`KVK Ambala/Karnal full Hindi | ${APPLY ? "APPLY" : "dry-run"}`);
  for (const u of UPDATES) {
    const { data, error } = await supabase.from("ccshau_pages").select("id, slug").eq("slug", u.slug).maybeSingle();
    if (error) throw error;
    if (!data) {
      console.log(`  skip missing: ${u.slug}`);
      continue;
    }
    console.log(`  ${APPLY ? "SET" : "WOULD"} ${u.slug} (${u.content_hi.length} chars)`);
    if (!APPLY) continue;
    const { error: upErr } = await supabase.from("ccshau_pages").update({ content_hi: u.content_hi }).eq("id", data.id);
    if (upErr) throw new Error(`${u.slug}: ${upErr.message}`);
  }
  if (!APPLY) console.log("Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
