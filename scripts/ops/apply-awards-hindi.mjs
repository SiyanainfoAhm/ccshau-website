#!/usr/bin/env node
/**
 * Hindi titles for /pages/awards gallery captions.
 *
 *   node scripts/ops/apply-awards-hindi.mjs
 *   node scripts/ops/apply-awards-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "b5b330ec-2846-4600-a9a3-7fbf03710090";

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
  "Institutional Membership": "संस्थागत सदस्यता",
  "Agritech Outlook Outstanding KVK Award at National Level to KVK, Mahendergarh":
    "एग्रीटेक आउटलुक उत्कृष्ट कृषि विज्ञान केंद्र राष्ट्रीय पुरस्कार — कृषि विज्ञान केंद्र, महेंद्रगढ़",
  "Certificate of 'Annual Zonal Workshop' of KVKs by ICAR-ATARI- II, Jodhpur and MPUA&T":
    "कृषि विज्ञान केंद्रों की वार्षिक क्षेत्रीय कार्यशाला प्रमाण पत्र — आई.सी.ए.आर.-ए.टी.ए.आर.आई.-II, जोधपुर एवं एम.पी.यू.ए. एवं टी.",
  "Certificate of Appreciation KVK Rohtak": "प्रशंसा प्रमाण पत्र — कृषि विज्ञान केंद्र रोहतक",
  "Certificate of Best Performer Main- Center Category": "सर्वश्रेष्ठ प्रदर्शनकर्ता प्रमाण पत्र — मुख्य केंद्र श्रेणी",
  "National Service Scheme Award 2019-20": "राष्ट्रीय सेवा योजना पुरस्कार 2019-20",
  "National Service Scheme Award 2020-21": "राष्ट्रीय सेवा योजना पुरस्कार 2020-21",
  "Best Centre Award 2018": "सर्वश्रेष्ठ केंद्र पुरस्कार 2018",
  "Bes AICRPS Centre Award 2020-21": "सर्वश्रेष्ठ ए.आई.सी.आर.पी.एस. केंद्र पुरस्कार 2020-21",
  "Best Centre Award - 2018-19": "सर्वश्रेष्ठ केंद्र पुरस्कार 2018-19",
  "AICRP Centre on Sorghum 2021-22": "ए.आई.सी.आर.पी. ज्वार केंद्र 2021-22",
  "National Service Scheme Award 2017-18": "राष्ट्रीय सेवा योजना पुरस्कार 2017-18",
  "AICRP Centre on Pearl Millet 2022-23": "ए.आई.सी.आर.पी. बाजरा केंद्र 2022-23",
  "Best performing ICAR-AICRP on Pearl Millet Centre (2021-22)":
    "आई.सी.ए.आर.-ए.आई.सी.आर.पी. बाजरा का सर्वश्रेष्ठ प्रदर्शनकर्ता केंद्र (2021-22)",
  "Third Best Poster Presentation Award at ATARI, Jodhpur -2022":
    "ए.टी.ए.आर.आई., जोधपुर में तृतीय सर्वश्रेष्ठ पोस्टर प्रस्तुति पुरस्कार — 2022",
  "NIRF Indian Rankings 2023": "एन.आई.आर.एफ. भारतीय रैंकिंग 2023",
  "Ranking of Agricultural Universities 2020": "कृषि विश्वविद्यालयों की रैंकिंग 2020",
  "Ranking of Agricultural Universities 2019": "कृषि विश्वविद्यालयों की रैंकिंग 2019",
  "National Institutional Ranking Framework Indian Ranking 2022":
    "राष्ट्रीय संस्थागत रैंकिंग फ्रेमवर्क भारतीय रैंकिंग 2022",
  "Certificate National Institutional Ranking Framework Indian Rankings 2019":
    "राष्ट्रीय संस्थागत रैंकिंग फ्रेमवर्क भारतीय रैंकिंग 2019 प्रमाण पत्र",
  "NIRF India Rankings 2018": "एन.आई.आर.एफ. भारत रैंकिंग 2018",
  "Best NICRA KVK Award -2019": "सर्वश्रेष्ठ एन.आई.सी.आर.ए. कृषि विज्ञान केंद्र पुरस्कार 2019",
  "Certificate of Accreditation": "प्रत्यायन प्रमाण पत्र",
  "CCSHAU Rank 3rd Certificate ARIIA Rank ARI-U-0159":
    "सी.सी.एस. एच.ए.यू. तृतीय रैंक प्रमाण पत्र — ए.आर.आई.आई.ए. रैंक ARI-U-0159",
  "ICAR 4th Ranking of CCSHAU Hisar Amongst Agricultural Universities 2018":
    "आई.सी.ए.आर. कृषि विश्वविद्यालयों में सी.सी.एस. एच.ए.यू. हिसार की चौथी रैंकिंग 2018",
  "Establishment of Institution Innovation Council (IIC)":
    "संस्थान नवाचार परिषद (आई.आई.सी.) की स्थापना",
  "Krishi Shiksha Samman Award-2019": "कृषि शिक्षा सम्मान पुरस्कार 2019",
  "Haryana Kisan Ratna Award 2019": "हरियाणा किसान रत्न पुरस्कार 2019",
  "Award of appreciation AFST-2017": "प्रशंसा पुरस्कार ए.एफ.एस.टी.-2017",
  "Sardar Patel Outstanding ICAR Institute Award 2016":
    "सरदार पटेल उत्कृष्ट आई.सी.ए.आर. संस्थान पुरस्कार 2016",
  "Pt. Deendayal Upadhyay Krishi Vigyan Protshan Purushkar 2017":
    "पंडित दीनदयाल उपाध्याय कृषि विज्ञान प्रोत्साहन पुरस्कार 2017",
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: items, error } = await sb
    .from("ccshau_page_gallery_items")
    .select("id,title_en,title_hi,sort_order")
    .eq("page_id", PAGE_ID)
    .order("sort_order");
  if (error) throw error;

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  let mapped = 0;
  let missing = 0;

  for (const row of items ?? []) {
    const title_hi = TITLE_HI[row.title_en?.trim()];
    if (!title_hi) {
      console.log(`MISSING: ${row.sort_order} ${row.title_en}`);
      missing++;
      continue;
    }
    mapped++;
    console.log(`${row.sort_order}: ${title_hi}`);
    if (!APPLY) continue;
    const { error: upErr } = await sb
      .from("ccshau_page_gallery_items")
      .update({ title_hi, updated_at: now })
      .eq("id", row.id);
    if (upErr) throw upErr;
  }

  if (APPLY) {
    await sb
      .from("ccshau_pages")
      .update({
        title_hi: "पुरस्कार",
        excerpt_hi: "विश्वविद्यालय पुरस्कार, रैंकिंग और संस्थागत सम्मान।",
        updated_at: now,
      })
      .eq("id", PAGE_ID);
  }

  console.log(`\nmapped=${mapped} missing=${missing}`);
  if (!APPLY) console.log("Pass --apply to write.");
  else console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
