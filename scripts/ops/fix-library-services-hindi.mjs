#!/usr/bin/env node
/**
 * Full curated Hindi for Nehru Library → Library Services page.
 *
 *   node scripts/ops/fix-library-services-hindi.mjs
 *   node scripts/ops/fix-library-services-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "1803e44e-9ed7-45da-ac4d-11e90f9a5b0a";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

const CELL = 'style="padding:13px 11px;background-color:rgb(247, 218, 100)"';
const Y = "rgb(247, 218, 100)";

const CONTENT_HI = `<table><tbody><tr><td colspan="2" style="padding:13px 11px;font-size:18px;background-color:${Y}"><div class="text-center"><strong>पुस्तकालय सेवाएँ</strong></div></td></tr><tr><td ${CELL}><div style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;, Times, serif">सम्मेलन सुविधा:<span style="font-size:16px">  </span></span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;, Times, serif"><span style="font-size:16px">विश्वविद्यालय के वैज्ञानिकों को विभिन्न शैक्षणिक प्रयोजनों हेतु सम्मेलन सुविधा प्रदान की जाती है। इसे पुस्तकालय की प्रमुख उपलब्धियों में गिना जाता है। इस सुविधा से सी.सी.एस.एच.ए.यू. के वैज्ञानिक एवं छात्र दूरस्थ स्थानों पर अपने साथियों से सीधा संवाद कर सकते हैं। यह बहुउद्देशीय सुविधा है तथा पावरपॉइंट प्रस्तुति हेतु भी उपयोगी है। रिपोर्ट अवधि में इसका अनेक शैक्षणिक प्रयोजनों हेतु उपयोग हुआ।</span></span></div></td><td ${CELL}><div style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:black;background:#F7DA64">संदर्भ सेवा</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> अधिगम संसाधनों हेतु मार्गदर्शक के रूप में मानव सहायता का प्रावधान है। यह पुस्तकालय नैतिकता का सकारात्मक परिणाम दर्शाती है तथा उपयोगकर्ताओं में पुस्तकालय की प्रतिष्ठा का मापदंड है। वरिष्ठ पुस्तकालय पेशेवर के नेतृत्व में संदर्भ डेस्क प्रथम तल पर केंद्रीय स्थान पर स्थित है। संदर्भ पुस्तकालयाध्यक्ष अन्य स्टाफ की सहायता से उपयोगकर्ताओं को प्रलेख/सूचना खोजने-चुनने, ओपैक उपयोग तथा आवश्यकतानुसार अन्य पुस्तकालयों से सूचना प्राप्त करने में सहायता करते हैं। यहीं नव आगंतुकों हेतु अभिविन्यास कार्यक्रम भी आयोजित होते हैं, जिससे वे पुस्तकालय संगठन एवं सेवाओं से परिचित हो सकें।</span></div></td></tr><tr><td ${CELL}><p style="text-align:justify"><span style="font-size:16px;font-family:&quot;Times New Roman&quot;, Times, serif;color:black;background:${Y}">नेहरू पुस्तकालय अद्वितीय </span><span style="font-family:Times New Roman,Times,serif"><strong>पठन सुविधाएँ</strong> प्रदान करता है। यहाँ 650 पाठकों की क्षमता वाले 6 पठन कक्ष हैं। आधा पठन क्षेत्र वातानुकूलित है तथा शेष के वातानुकूलन पर सक्रिय विचार किया जा रहा है। इसके अतिरिक्त भूतल पर लगभग 75 पाठकों की क्षमता वाली रात्रि पठन सुविधा भी है।</span></p></td><td ${CELL}><p style="text-align:justify"><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black">पुस्तकालय में स्नातकोत्तर छात्रों को पी.जी.एस.-501 पाठ्यक्रम पढ़ाने हेतु <strong>स्मार्ट कक्षा कक्ष</strong> है। यह पुस्तकालय के द्वितीय तल पर स्थित है। रिपोर्ट अवधि में विश्वविद्यालय के विभिन्न महाविद्यालयों, लुवास, सी.एफ.एस.टी. एवं एम.एच.यू. के स्नातकोत्तर एवं पीएच.डी. छात्रों को इस स्मार्ट कक्ष की दृश्य-श्रव्य सुविधाओं से पुस्तकालय पाठ्यक्रम पढ़ाया गया। अन्य अवसरों पर व्याख्यान/संवाद हेतु भी इसका उपयोग होता है।</span></p></td></tr><tr><td ${CELL}><p style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:black;background:#F7DA64">इंटरनेट सर्फिंग सुविधा</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> वर्ष 2001 में स्थापित की गई। तब से पुस्तकालय छात्रों एवं संकाय को शैक्षणिक एवं अनुसंधान हेतु इंटरनेट सर्फिंग सुविधा देता है। इस हेतु 32 नवीनतम पी.सी. वाली सुसज्जित कंप्यूटर प्रयोगशाला तथा लैपटॉप उपयोगकर्ताओं हेतु 32 इंटरनेट बिंदु उपलब्ध हैं। <span style="color:black;background:#F7DA64">प्रामाणिक उपयोगकर्ताओं को यह सेवा निःशुल्क है। खोजे गए लेखों के प्रिंटआउट प्रति पृष्ठ 1.00 रुपये पर उपलब्ध हैं।</span></span></p></td><td ${CELL}><p style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:black">ऑनलाइन कैटलॉग</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> (ऑनलाइन पब्लिक एक्सेस कैटलॉग) तथा </span><strong><span style="font-size:16px;color:black">पत्रिका धारण सूची</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> का डेटाबेस परिसर नेटवर्क से जुड़े पी.सी. तथा विश्वविद्यालय परिसर के विभिन्न स्थानों से वैज्ञानिकों/शिक्षकों/विस्तार विशेषज्ञों/छात्रों/अन्य हेतु उपलब्ध है।</span></p><br /></td></tr><tr><td ${CELL}><div style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:16px;color:black;background:${Y}">समस्त</span><strong> परिसंचरण कार्य</strong> — आर.एफ.आई.डी. युक्त विश्वविद्यालय स्मार्ट पहचान पत्र से पठन सामग्री का निर्गम-वापसी, अतिदेय शुल्क गणना, गेट पास मुद्रण, पुस्तकों का आरक्षण, बकाया पुस्तकों हेतु अनुस्मारक, पुस्तक उपलब्धता/निर्गम स्थिति जाँच, उपयोगकर्ता खाता अवरोधन, सांख्यिकीय डेटा एवं अन्य परिसंचरण कार्य — कम्प्यूटरीकृत हैं।</span></div></td><td rowspan="2" style="padding:13px 11px;background-color:${Y};text-align:left"><p style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:black;background:#F7DA64">एच.ए.यू. बुकशॉप</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> विश्वविद्यालय समुदाय को इस पुस्तकालय द्वारा प्रदान की जाने वाली अनूठी सेवा है। देश के किसी अन्य पुस्तकालय में इस प्रकार की सुविधा नहीं है। नेहरू पुस्तकालय अपनी पठन सामग्री खरीद हेतु भी बुकशॉप का उपयोग करता है। विश्वविद्यालय स्टाफ एवं छात्र व्यक्तिगत पुस्तकें खरीदकर छूट का लाभ उठा सकते हैं। नकद बिक्री पर प्राप्त संपूर्ण छूट विश्वविद्यालय समुदाय को दी जाती है, जबकि उधार बिक्री पर आंशिक छूट रखी जाती है।</span></p></td></tr><tr><td ${CELL}><p style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:black;background:#F7DA64">स्व-निर्गम एवं वापसी</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> उपयोगकर्ता स्वयं इस सुविधा से प्रलेख निर्गत करवा सकते हैं। स्मार्ट पहचान पत्र एवं वांछित प्रलेख आर.एफ.आई.डी. मशीन पर रखना आवश्यक है। निर्गम के बाद ए.टी.एम. की तरह स्लिप बनती है, जिसे संपत्ति काउंटर पर दिखाना होता है।</span></p></td></tr><tr><td ${CELL}><p style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:black;background:#F7DA64">बुक बैंक</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> पाठ्यपुस्तकों की बहुप्रतियों का संग्रह है। छात्र इन्हें नाममात्र किराये पर एक सेमेस्टर (सेमेस्टर प्रणाली) या एक वर्ष (वार्षिक प्रणाली) हेतु उधार ले सकते हैं (पुस्तक मूल्य 100 रुपये तक हो तो 10%, अथवा 10 रुपये + 100 रुपये से अधिक मूल्य का 5%)। बुक बैंक में समाज कल्याण अनुभाग भी है, जिसकी पुस्तकें अनुसूचित जाति/जनजाति छात्रों हेतु आरक्षित एवं निःशुल्क हैं। प्रत्येक छात्र बैंक से चार पुस्तकें ले सकता है।</span></p></td><td style="background-color:${Y}"><p style="text-align:justify"><strong><span style="font-size:16px;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:black">नवीन आगमन</span></strong><span style="font-size:16px;font-family:&quot;Times New Roman&quot;,&quot;serif&quot;;color:black;background:#F7DA64"> पुस्तकों का प्रदर्शन भूतल पर परिसंचरण काउंटर के निकट किया जाता है, जिससे उपयोगकर्ता नवीनतम संग्रह से अवगत हो सकें।</span></p><br /></td></tr></tbody></table>`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const strip = (h) => (h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("preview:", strip(CONTENT_HI).slice(0, 280));
  console.log("has leftover EN?", /implies the provision|There are 6 Reading|Smart Class Room|Reference Desk/.test(CONTENT_HI));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({ content_hi: CONTENT_HI, excerpt_hi: "नेहरू पुस्तकालय सेवाएँ।", updated_at: new Date().toISOString() })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("OK library-services content_hi");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
