#!/usr/bin/env node
/**
 * Curated Hindi for DSW Sports Activity about + glimpses + labels.
 *
 *   node scripts/ops/apply-dsw-sports-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "c6395ed7-60b1-4fd5-b5da-206a127f3750";

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

const CONTENT_HI = `<p style="text-align: justify;"><span style='font-size: 18px; font-family: "Times New Roman", Times, serif; color: black;'>विभाग के बारे में</span></p><p style="text-align: justify;"><span style='font-size: 18px; font-family: "Times New Roman", Times, serif; color: rgb(51, 51, 51); background: white;'>खेल एवं क्रीड़ा मानव संसाधन के शारीरिक, मानसिक एवं सामाजिक विकास में अत्यंत महत्वपूर्ण भूमिका निभाते हैं, तथा खेलों में उत्कृष्टता उपलब्धि की भावना को बढ़ाती है। सुस्थापित एवं पर्याप्त रूप से सुसज्जित गिरी केंद्र खेल गतिविधियों हेतु वॉलीबॉल, हैंडबॉल, फुटबॉल, बास्केटबॉल, क्रिकेट, कबड्डी, इंडोर मुक्केबाजी, इंडोर कुश्ती, इंडोर बैडमिंटन, टेनिस, हॉकी, एथलेटिक्स सिंथेटिक ट्रैक, टेबल टेनिस, वूशू, सिंथेटिक टेनिस कोर्ट, शहीद मदन लाल ढींगरा मल्टी पर्पस हॉल एवं अन्य खेलों की सुविधाएँ उपलब्ध कराता है। छात्रों के लिए खेलों के महत्व को देखते हुए, विश्वविद्यालय ने सभी स्नातक छात्रों हेतु सह-पाठ्यचर्या गतिविधियों में अनिवार्य भागीदारी निर्धारित की है। विश्वविद्यालय सभी छात्रों को 0+1 क्रेडिट पाठ्यक्रम प्रदान करता है, जिसके माध्यम से विश्वविद्यालय का प्रत्येक छात्र खेल गतिविधि में भाग लेता है। इससे छात्र न केवल शारीरिक रूप से स्वस्थ बनते हैं, अपितु मानसिक एवं सामाजिक रूप से भी सुदृढ़ होते हैं। विश्वविद्यालय के छात्र विभिन्न प्रतियोगिताओं में भाग लेते हैं तथा स्थान प्राप्त करने वाले खिलाड़ियों को निःशुल्क भोजन, निःशुल्क दूध एवं नकद प्रोत्साहन मिलते हैं। यह हरियाणा का पहला विश्वविद्यालय है जिसने स्थान प्राप्त करने वाले खिलाड़ियों को ये सुविधाएँ प्रदान की हैं।</span></p>`;

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  "Sports Coordinator": "खेल समन्वयक",
  Objectives: "उद्देश्य",
  "Sports Achievements": "खेल उपलब्धियाँ",
  "Glorious Past": "गौरवशाली अतीत",
  "Sports Clubs": "खेल क्लब",
  "Sports Council": "खेल परिषद",
  "Sports Infrastructure": "खेल अवसंरचना",
  "Glimpses of Sports Activities": "खेल गतिविधियों की झलकियाँ",
  "Annual report 2024-25": "वार्षिक रिपोर्ट 2024-25",
};

const GLIMPSES_PHRASES = [
  ["Glimpses of Sport Activity", "खेल गतिविधियों की झलकियाँ"],
  ["Glimpses of Sports Activities", "खेल गतिविधियों की झलकियाँ"],
  ["19th Vice Chancellor Cricket Cup (Nov 2022)", "19वाँ कुलपति क्रिकेट कप (नवंबर 2022)"],
  ["21st Agri-Sports Meet (22-24 Feb, 2023)", "21वाँ कृषि-खेल मेला (22–24 फरवरी, 2023)"],
  ["Inauguration of Synthetic Tennis Court (Feb, 2023)", "सिंथेटिक टेनिस कोर्ट का उद्घाटन (फरवरी, 2023)"],
  ["International Day of Yoga (21 June, 2022)", "अंतरराष्ट्रीय योग दिवस (21 जून, 2022)"],
  ["International day of Yoga (21 June, 2023)", "अंतरराष्ट्रीय योग दिवस (21 जून, 2023)"],
  ["Shaheed Madan Lal Dhingra MPH (March, 2022)", "शहीद मदन लाल ढींगरा एम.पी.एच. (मार्च, 2022)"],
];

function translatePhrases(html, phrases) {
  let out = html;
  const sorted = [...phrases].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of sorted) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  return out;
}

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
  console.log("content_hi", CONTENT_HI.length);
  console.log("preview:", CONTENT_HI.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      title_hi: "खेल गतिविधि",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत खेल गतिविधि।",
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

    if (row.label_en === "Glimpses of Sports Activities" && row.content_en) {
      patch.content_hi = translatePhrases(row.content_en, GLIMPSES_PHRASES);
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
