#!/usr/bin/env node
/**
 * Curated Hindi for DSW National Cadet Corps page + Objectives + labels.
 *
 *   node scripts/ops/apply-dsw-ncc-hindi.mjs
 *   node scripts/ops/apply-dsw-ncc-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "7a61ed5c-b31f-4ce5-85ea-2c4752c2ba3b";

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

const CONTENT_HI = `<p style="text-align: justify;"><br></p><table style="width: 100%;"><tbody><tr><td style="width: 25%;"><img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/zvaDqO8bI12Im2CLn9KwbeGAO1TVkLgM2EKvCMvX.png" style="width: 192px; height: 250.065px;" class="fr-fic fr-dib"></td><td style="width: 75%;">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<span style='font-size: 18px; font-family: "Times New Roman", Times, serif;'>&nbsp; &nbsp; &nbsp;<strong>डॉ. विक्रम</strong><br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; प्रमुख, राष्ट्रीय कैडेट कोर (बालक)<br><br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ईमेल : vghiyal06@hau.ac.in<br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; फोन नं. : 9992070170</span></td></tr></tbody></table><p style="text-align: justify;"><br></p><p style="text-align: justify;"><span style='font-size: 18px; font-family: "Times New Roman", Times, serif;'>कैडेट इकाई &ldquo;</span><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">1HAR R&amp;V SQN NCC, HISAR</span></span><span style='font-size: 18px; font-family: "Times New Roman", Times, serif;'>&rdquo;, &ldquo;NCC 1(Air) Haryana Bn. Hisar&rdquo;, &nbsp;&ldquo;3 Haryana Girls BN NCC&rdquo; एवं &ldquo;3 Haryana &nbsp;BN NCC&rdquo; के अंतर्गत नामांकित होते हैं; एन.सी.सी. ग्रुप&ndash;रोहतक तथा निदेशालय &ldquo;पंजाब, हिमाचल प्रदेश, हरियाणा एवं चंडीगढ़।&rdquo;&nbsp;</span></p>`;

const OBJECTIVES_HI = `<p style="text-align:justify"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif;color:black">एन.सी.सी. कैडेटों में साहस, अनुशासन, नेतृत्व एवं खेल भावना के गुण विकसित करने में महत्वपूर्ण भूमिका निभाता है। एन.सी.सी. कैडेटों द्वारा की गई प्रत्येक गतिविधि उनके व्यक्तित्व निर्माण पर गहरा प्रभाव छोड़ती है। &lsquo;सी&rsquo; प्रमाण पत्र धारक कैडेट सशस्त्र बलों में रिक्तियों हेतु लिखित परीक्षा दिए बिना सीधे कमीशनिंग हेतु पात्र होते हैं।</span></p><ul><li style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:18px">छात्रों/युवाओं में चरित्र, साथीपन, अनुशासन, नेतृत्व, धर्मनिरपेक्ष दृष्टिकोण, साहसिक भावना, खेल भावना एवं निःस्वार्थ सेवा के आदर्श विकसित करना</span></span></li><li style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:18px">संगठित, प्रशिक्षित एवं प्रेरित युवा मानव संसाधन तैयार करना, जो जीवन के सभी क्षेत्रों में नेतृत्व प्रदान करें तथा सदैव राष्ट्र सेवा हेतु उपलब्ध रहें</span></span></li><li style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:18px">युवाओं को सशस्त्र बलों में कैरियर अपनाने हेतु प्रेरित करने के लिए उपयुक्त वातावरण प्रदान करना</span></span></li></ul><p style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:18px"><strong><em>ध्येय वाक्य</em></strong><strong>:</strong></span></span><strong><em><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"> एकता एवं अनुशासन</span></em></strong></p>`;

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  Objectives: "उद्देश्य",
  Achievers: "उपलब्धियाँ",
  "3 Haryana Bn NCC (Boys)": "3 हरियाणा बटालियन एन.सी.सी. (बालक)",
  "3 Haryana Girls (Bn) NCC": "3 हरियाणा गर्ल्स बटालियन एन.सी.सी.",
  "Report of NCC 2024-25": "एन.सी.सी. रिपोर्ट 2024-25",
  "Photo Gallery of NCC": "एन.सी.सी. फोटो गैलरी",
};

function captionHi(contentEn, labelHi) {
  if (!contentEn || contentEn.length > 500) return null;
  let hi = contentEn;
  if (/<strong>/i.test(hi)) {
    hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
  } else if (/<span[^>]*>/i.test(hi) && /<a/i.test(hi)) {
    hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
    if (hi === contentEn) {
      hi = hi.replace(/(<span[^>]*>)([^<]+)(<\/span>)/i, `$1${labelHi}$3`);
    }
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
  console.log("content_hi", CONTENT_HI.length, "objectives", OBJECTIVES_HI.length);
  console.log("preview:", CONTENT_HI.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      title_hi: "राष्ट्रीय कैडेट कोर",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत राष्ट्रीय कैडेट कोर।",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("OK page");

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en,content_hi")
    .eq("page_id", PAGE_ID);

  for (const row of sides ?? []) {
    const label_hi = LABEL_HI[row.label_en];
    if (!label_hi) continue;
    const patch = { label_hi, updated_at: now };
    if (row.label_en === "Objectives") {
      patch.content_hi = OBJECTIVES_HI;
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
