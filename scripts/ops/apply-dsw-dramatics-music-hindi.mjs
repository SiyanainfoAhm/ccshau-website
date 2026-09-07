#!/usr/bin/env node
/**
 * Curated Hindi for DSW Dramatics & Music Club page + About sidebar + labels.
 *
 *   node scripts/ops/apply-dsw-dramatics-music-hindi.mjs
 *   node scripts/ops/apply-dsw-dramatics-music-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "130e76cc-0433-4a52-91e2-1eaedaf06c43";

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

const S =
  'font-size: 18px; font-family: "Times New Roman", Times, serif; color: windowtext;';

const CONTENT_HI = `<p style="text-align: justify;"><span style='${S}'>अपनी स्थापना के बाद से एच.ए.यू. <strong>संगीत एवं नाट्य क्लब</strong> शिक्षक-छात्र संबंधों को सुदृढ़ करने के अपने प्रमुख उद्देश्यों की पूर्ति में सक्रिय रूप से संलग्न रहा है। यह संगीत, नृत्य एवं नाटक पर विशेष बल देते हुए सांस्कृतिक गतिविधियों को बढ़ावा देता है। ऐसी गतिविधियाँ छात्रों के व्यक्तित्व विकास एवं युवा ऊर्जा के सही दिशा में उपयोग हेतु प्रेरणा का स्रोत हैं। क्लब को वर्ष 1973 में नियमित क्रेडिट गतिविधि के रूप में मान्यता मिली तथा तब से यह विश्वविद्यालय के छात्रों में संगीत, नाटक एवं नृत्य की प्रतिभा को खोजने, बढ़ावा देने, पोषित करने एवं विकसित करने में निरंतर सक्रिय है। संगीत एवं नाट्य क्लब प्रतिभाशाली एवं योग्य छात्रों को राज्य एवं राष्ट्रीय स्तर पर प्रदर्शन के अवसर प्रदान करता है तथा उन्हें प्रशिक्षित करता है। निदेशालय द्वारा हाल ही में लोक परंपराओं को पुनर्जीवित करने हेतु हरियाणवी <strong><em>स्वांग</em></strong> का मंचन एक महत्वपूर्ण पहल है। इन सभी प्रयासों से छात्र देश एवं राज्य की समृद्ध सांस्कृतिक विरासत से परिचित हुए हैं।</span></p>`;

const ABOUT_HI = `<p style="text-align:justify">सी.सी.एस. एच.ए.यू. नाट्य एवं संगीत क्लब शिक्षक-छात्र संबंधों को सुदृढ़ करने के अपने प्रमुख उद्देश्य की पूर्ति में सक्रिय रूप से संलग्न रहा है। यह नाटक, नृत्य एवं संगीत पर विशेष बल देते हुए सांस्कृतिक गतिविधियों को बढ़ावा देता है। ऐसी गतिविधियाँ छात्रों के व्यक्तित्व विकास एवं युवा ऊर्जा को उचित एवं रचनात्मक दिशा देने हेतु प्रेरणा का स्रोत हैं। क्लब को वर्ष 1973 में नियमित क्रेडिट गतिविधि के रूप में मान्यता मिली तथा तब से यह विश्वविद्यालय के छात्रों में नाटक, नृत्य एवं संगीत की प्रतिभा को खोजने, बढ़ावा देने, पोषित करने एवं विकसित करने में निरंतर सक्रिय है। यह क्लब विश्वविद्यालय के सबसे बड़े एवं लोकप्रिय क्लबों में से एक है, जिसमें प्रतिवर्ष औसतन लगभग दो सौ छात्र जुड़े रहते हैं। यह विश्वविद्यालय की प्रमुख सह-पाठ्यचर्या गतिविधि क्लब रहा है जो छात्रों के रचनात्मक पक्षों का विकास एवं प्रदर्शन करता है।</p><ul><li style="text-align:justify">इस क्लब के छात्रों ने विभिन्न राज्य/क्षेत्रीय/राष्ट्रीय स्तर के युवा महोत्सवों में भाग लिया है। विश्वविद्यालय टीम ने वर्ष 1986 में रूस में आयोजित भारतीय महोत्सव में हरियाणवी लोक नृत्य प्रस्तुत किया।</li><li style="text-align:justify">कई छात्र स्नातक पूर्ण करने के बाद राष्ट्रीय नाट्य विद्यालय, नई दिल्ली में शामिल हुए हैं। भारतीय कृषि अनुसंधान परिषद ने वर्ष 2000 से अखिल भारतीय राज्य कृषि विश्वविद्यालय युवा महोत्सव प्रतियोगिताएँ आरंभ की हैं।</li><li style="text-align:justify">क्लब टीम ने आई.सी.ए.आर. द्वारा आयोजित दस अखिल भारतीय राज्य कृषि विश्वविद्यालय युवा महोत्सवों में भाग लिया है तथा नाट्य प्रतियोगिताओं में चार बार चैंपियन घोषित हुई है। संगीत श्रेणी में समूह गीत प्रतियोगिताओं में क्लब के छात्रों ने छह बार प्रथम स्थान भी प्राप्त किया है।</li><li style="text-align:justify">अपनी स्थापना के बाद से क्लब ने राज्य / उत्तर क्षेत्र / राष्ट्रीय युवा महोत्सवों में प्रतियोगिताएँ जीतकर विश्वविद्यालय के लिए अनेक गौरव अर्जित किए हैं।</li></ul>`;

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  "About Drama and Music Club": "नाट्य एवं संगीत क्लब के बारे में",
  Objectives: "उद्देश्य",
  Achievements: "उपलब्धियाँ",
  "Glimpses of Dramatic Activities": "नाटकीय गतिविधियों की झलकियाँ",
  "Glimpses of Dramatic Activities 2024-25": "नाटकीय गतिविधियों की झलकियाँ 2024-25",
  "Cultural Facilities": "सांस्कृतिक सुविधाएँ",
  "Daramatics and Music Club Gallery": "नाट्य एवं संगीत क्लब गैलरी",
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("content_hi len", CONTENT_HI.length);
  console.log("about_hi len", ABOUT_HI.length);
  console.log("preview:", CONTENT_HI.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      title_hi: "नाट्य एवं संगीत क्लब",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत नाट्य एवं संगीत क्लब।",
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

    if (row.label_en === "About Drama and Music Club") {
      patch.content_hi = ABOUT_HI;
    } else if (row.content_en && row.content_en.length < 400) {
      // PDF / short link captions → use Hindi label
      let hi = row.content_en;
      if (/<strong>/i.test(hi)) {
        hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${label_hi}</strong>`);
      } else if (/<span[^>]*>/i.test(hi)) {
        hi = hi.replace(/(<span[^>]*>)([^<]+)(<\/span>)/i, `$1${label_hi}$3`);
      } else if (/<a[^>]*>/i.test(hi)) {
        hi = hi.replace(/(<a[^>]*>)([^<]+)(<\/a>)/i, `$1${label_hi}$3`);
      }
      if (hi !== row.content_en) patch.content_hi = hi;
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
