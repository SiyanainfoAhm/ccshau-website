#!/usr/bin/env node
/**
 * Hindi transliterations for Counseling & Placement industry company lists.
 *
 *   node scripts/ops/apply-dsw-cp-industry-hindi.mjs
 *   node scripts/ops/apply-dsw-cp-industry-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "f3d78041-424f-4dd9-8d84-308db0299d1b";

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

/** Longest-first company / phrase → Hindi (transliteration + common terms). */
const NAMES = [
  ["The Kanan Devan Hills Plantations Co (P) Ltd", "द कन्नन देवन हिल्स प्लांटेशंस कंपनी (प्रा.) लिमिटेड"],
  ["CLAAS Agricultural Machinery Pvt Ltd", "क्लास कृषि मशीनरी प्राइवेट लिमिटेड"],
  ["Kubota Agricultural Machinery India Pvt Ltd", "कुबोटा कृषि मशीनरी इंडिया प्राइवेट लिमिटेड"],
  ["LEMKEN India Agro Equipment Pvt Ltd", "लेम्केन इंडिया एग्रो इक्विपमेंट प्राइवेट लिमिटेड"],
  ["Deccan Farm Equipment Pvt Ltd", "दक्कन फार्म इक्विपमेंट प्राइवेट लिमिटेड"],
  ["Godrej Consumer Products Limited", "गोदरेज कंज्यूमर प्रोडक्ट्स लिमिटेड"],
  ["Britannia Industries Limited", "ब्रिटानिया इंडस्ट्रीज लिमिटेड"],
  ["Hindustan Unilever Limited", "हिंदुस्तान यूनिलीवर लिमिटेड"],
  ["Duncans Industries Limited", "डंकन इंडस्ट्रीज लिमिटेड"],
  ["Jay Shree Tea & Industries Ltd", "जय श्री टी एंड इंडस्ट्रीज लिमिटेड"],
  ["Jay Shree Tea &amp; Industries Ltd", "जय श्री टी एंड इंडस्ट्रीज लिमिटेड"],
  ["Phalada Agro Research Foundation", "फलादा एग्रो रिसर्च फाउंडेशन"],
  ["National Agro Industries", "नेशनल एग्रो इंडस्ट्रीज"],
  ["Naan Dan Jain Irrigation Co", "नान दान जैन इरिगेशन कंपनी"],
  ["Jain Irrigation System Ltd", "जैन इरिगेशन सिस्टम लिमिटेड"],
  ["United Genetics India", "यूनाइटेड जेनेटिक्स इंडिया"],
  ["Krishidhan Seeds (P) Ltd", "कृषिधन सीड्स (प्रा.) लिमिटेड"],
  ["Geo Seeds (P) Ltd", "जियो सीड्स (प्रा.) लिमिटेड"],
  ["Rasi Seeds (P) Ltd", "रासी सीड्स (प्रा.) लिमिटेड"],
  ["Ankur Seeds (P) Ltd", "अंकुर सीड्स (प्रा.) लिमिटेड"],
  ["Tokita Seed India (P) Ltd", "टोकिता सीड इंडिया (प्रा.) लिमिटेड"],
  ["National Seed Association of India", "नेशनल सीड एसोसिएशन ऑफ इंडिया"],
  ["Colgate-Palmolive Company", "कोलगेट-पामोलिव कंपनी"],
  ["Bayer CropScience", "बायर क्रॉपसाइंस"],
  ["Excel Crop Care", "एक्सेल क्रॉप केयर"],
  ["PI Industries", "पी.आई. इंडस्ट्रीज"],
  ["Meghmani Organics", "मेघमणि ऑर्गेनिक्स"],
  ["Insecticides India", "इंसेक्टिसाइड्स इंडिया"],
  ["Dhanuka Agritech", "धनुका एग्रीटेक"],
  ["Nagarjuna Agrichem", "नागार्जुन एग्रीकेम"],
  ["Excel Industries", "एक्सेल इंडस्ट्रीज"],
  ["Bharat Rasayan", "भारत रसायन"],
  ["Namdhari Seeds", "नामधारी सीड्स"],
  ["Nuziveedu seeds", "नुजीवीडू सीड्स"],
  ["Nuziveedu Seeds", "नुजीवीडू सीड्स"],
  ["Kaveri Seeds", "कावेरी सीड्स"],
  ["Mahyco Seed Co", "महिको सीड कंपनी"],
  ["Parixit Industries", "परिक्सीत इंडस्ट्रीज"],
  ["Escort Group", "एस्कॉर्ट ग्रुप"],
  ["Escorts Group", "एस्कॉर्ट्स ग्रुप"],
  ["Mahindra tractors", "महिंद्रा ट्रैक्टर्स"],
  ["Mahindra Tractors", "महिंद्रा ट्रैक्टर्स"],
  ["McLeod Russel Group", "मैकलियोड रसेल ग्रुप"],
  ["Prithvi Group", "पृथ्वी ग्रुप"],
  ["Parle Agro", "पारले एग्रो"],
  ["Dabur India Ltd", "डाबर इंडिया लिमिटेड"],
  ["ITC Limited", "आई.टी.सी. लिमिटेड"],
  ["Haldiram's", "हल्दीराम"],
  ["Haldiram&rsquo;s", "हल्दीराम"],
  ["Haldiram&#39;s", "हल्दीराम"],
  ["Future Group", "फ्यूचर ग्रुप"],
  ["ING Vysya Bank", "आई.एन.जी. वैश्य बैंक"],
  ["AXIS Bank", "एक्सिस बैंक"],
  ["YES Bank", "येस बैंक"],
  ["HDFC Bank", "एच.डी.एफ.सी. बैंक"],
  ["Kotak Mahindra Bank", "कोटक महिंद्रा बैंक"],
  ["IndusInd Bank Ltd", "इंडसइंड बैंक लिमिटेड"],
  ["ICICI Bank", "आई.सी.आई.सी.आई. बैंक"],
  ["South Indian Bank", "साउथ इंडियन बैंक"],
  ["DCB Bank Ltd", "डी.सी.बी. बैंक लिमिटेड"],
  ["Advanta India", "एडवांटा इंडिया"],
  ["Rallis India", "रैलीस इंडिया"],
  ["Monsanto India", "मॉन्सांटो इंडिया"],
  ["Godrej Agrovet Limited", "गोदरेज एग्रोवेट लिमिटेड"],
  ["ABT Industries", "ए.बी.टी. इंडस्ट्रीज"],
  ["Heinz DuPont India", "हाइंज़ ड्यूपॉन्ट इंडिया"],
  ["Heinz DuPont", "हाइंज़ ड्यूपॉन्ट"],
  ["Heinz", "हाइंज़"],
  ["DuPont India", "ड्यूपॉन्ट इंडिया"],
  ["DuPont", "ड्यूपॉन्ट"],
  ["Netafim", "नेटाफिम"],
  ["Sabero", "सबेरॉ"],
  ["Nirma", "निर्मा"],
  ["AGCO", "ए.जी.सी.ओ."],
  ["Pvt Ltd", "प्राइवेट लिमिटेड"],
  ["(P) Ltd", "(प्रा.) लिमिटेड"],
  ["Limited", "लिमिटेड"],
  [" Ltd", " लिमिटेड"],
];

const INDUSTRY_LABELS = new Set([
  "Agro-Chemicals Industry",
  "Seed Industry",
  "Agril Machinery Industry",
  "Tea & Plantation Industry",
  "Food & Health Care Industry",
  "Agri-Rural Finance Industry",
  "Agricultural Industry",
]);

function translateNames(html) {
  let out = html;
  const sorted = [...NAMES].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of sorted) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: sides, error } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en,content_hi")
    .eq("page_id", PAGE_ID)
    .eq("is_active", true);
  if (error) throw error;

  const plans = [];
  for (const row of sides ?? []) {
    if (!INDUSTRY_LABELS.has(row.label_en)) continue;
    if (!row.content_en?.trim()) continue;
    const content_hi = translateNames(row.content_en);
    plans.push({
      id: row.id,
      label: row.label_en,
      fromLen: row.content_en.length,
      toLen: content_hi.length,
      preview: content_hi.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120),
      content_hi,
    });
  }

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  for (const p of plans) {
    const leftover = [
      ...new Set(
        (p.content_hi.match(/>([A-Za-z][^<]{1,80})</g) || []).map((s) => s.slice(1, -1).trim()),
      ),
    ].filter((s) => /[A-Za-z]{2}/.test(s));
    console.log(`\n${p.label} (${p.fromLen} → ${p.toLen})`);
    console.log(" ", p.preview);
    if (leftover.length) console.log("  leftover:", leftover.join(" | "));
  }

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  for (const p of plans) {
    const { error: upErr } = await sb
      .from("ccshau_page_sidebar_items")
      .update({ content_hi: p.content_hi, updated_at: now })
      .eq("id", p.id);
    if (upErr) throw upErr;
    console.log(`OK ${p.label}`);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
