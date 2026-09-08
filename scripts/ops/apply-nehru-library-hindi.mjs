#!/usr/bin/env node
/**
 * Curated Hindi for Nehru Library college home + child page titles.
 *
 *   node scripts/ops/apply-nehru-library-hindi.mjs
 *   node scripts/ops/apply-nehru-library-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "eef2c97a-5afa-481c-9658-ce61928f2e69";

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

const TITLE_HI = "नेहरू पुस्तकालय";
const EXCERPT_HI = "नेहरू पुस्तकालय, सी.सी.एस. एच.ए.यू., हिसार।";

const PHOTO =
  "https://hau.ac.in/storage/app/uploads/DwZ9cKKDRpte8fCQuf2zIzvYGHoseGESAzTEzPKZ.jpeg";

const CONTENT_HI = [
  `<p class="library-elibrary"><a href="https://ccshau.refread.com/#/home" target="_blank" rel="noopener noreferrer"><strong>सी.सी.एस. एच.ए.यू. ई-लाइब्रेरी</strong></a></p>`,
  `<div class="office-profile office-profile--wide library-officer">`,
  `<img src="${PHOTO}" alt="डॉ. राजीव कुमार पटेरिया, विश्वविद्यालय पुस्तकालयाध्यक्ष" />`,
  `<div>`,
  `<p><strong>डॉ. राजीव कुमार पटेरिया</strong></p>`,
  `<p>विश्वविद्यालय पुस्तकालयाध्यक्ष</p>`,
  `<p>नेहरू पुस्तकालय,<br />चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय<br />हिसार - 125 004, भारत</p>`,
  `<p>दूरभाष : 01662-284328, 255416</p>`,
  `<p>ई-मेल : <a href="mailto:librarianhau@gmail.com">librarianhau@gmail.com</a>; <a href="mailto:library@hau.ac.in">library@hau.ac.in</a></p>`,
  `</div></div>`,
  `<p style="text-align:justify">नेहरू पुस्तकालय कार्यात्मक संरचना, सौंदर्य एवं उत्कृष्टता का अनूठा संगम है। इसमें लगभग 6.36 लाख खंड पुस्तकों, पत्रिकाओं के जिल्दबद्ध खंडों तथा अन्य प्रलेखों का समृद्ध संग्रह है, जो हिसार तथा हरियाणा राज्य के अन्य भागों में स्थित विश्वविद्यालय के छात्रों, शिक्षकों, अनुसंधान विद्वानों, विस्तार विशेषज्ञों एवं अन्य कर्मचारियों की सूचनात्मक तथा बौद्धिक आवश्यकताओं की पूर्ति करता है। इस भव्य पुस्तकालय ने सामुदायिक विज्ञान महाविद्यालय, हिसार; कृषि महाविद्यालय, कौल; <span style="font-family:&quot;Times New Roman&quot;, Times, serif;font-size:18px;color:rgb(0, 0, 0)">कृषि महाविद्यालय, बावल,</span> परिसर विद्यालय, कृषि विज्ञान केंद्रों (के.वी.के.) तथा क्षेत्रीय अनुसंधान केंद्रों पर भी अपने संग्रह बनाए रखे हैं। नेहरू पुस्तकालय सूचना प्रौद्योगिकी की शक्ति का सदुपयोग कर उसे विभिन्न पुस्तकालय गतिविधियों में लागू करते हुए सूचना पुनर्प्राप्ति एवं प्रसार के महत्त्वपूर्ण कार्य को सफलतापूर्वक आगे बढ़ा रहा है।</p>`,
].join("\n");

/** slug → curated title_hi (dropdown / college nav) */
const CHILD_TITLE_HI = {
  "about-library": "पुस्तकालय परिचय",
  "contact-us-9": "संपर्क करें",
  "digital-library": "डिजिटल पुस्तकालय",
  "e-books": "ई-पुस्तकें",
  "financial-status": "वित्तीय स्थिति",
  "home-29": "होम",
  "instructions-relating-to-backlog-vacancies-roster": "बकाया रिक्तियों, रोस्टर संबंधी निर्देश",
  "journals-2": "पत्रिकाएँ",
  "journals-3": "पुस्तकालय द्वारा सदस्यता प्राप्त एफ.ओ.ए.पी. भारतीय पत्रिकाएँ",
  "library-modernization": "पुस्तकालय आधुनिकीकरण",
  "library-patrons": "पुस्तकालय उपयोगकर्ता",
  "library-rules-regulations": "पुस्तकालय नियम एवं विनियम",
  "library-services": "पुस्तकालय सेवाएँ",
  "library-timings-holidays": "पुस्तकालय समय एवं अवकाश",
  "nehru-library": TITLE_HI,
  "nehru-library-gallery": "गैलरी",
  "nl-acquisition-section": "अधिग्रहण अनुभाग",
  "nl-department": "विभाग",
  "nl-human-resources": "मानव संसाधन",
  "nl-periodical-section": "आवधिक अनुभाग",
  "nl-research-and-planning-division": "अनुसंधान एवं योजना प्रभाग",
  "nl-technical-section": "तकनीकी अनुभाग",
  organogram: "संगठन संरचना",
  proforma: "पहचान पत्र हेतु प्रोफार्मा",
  resources: "संसाधन",
};

const SIDEBAR_LABEL_HI = {
  Faculty: "संकाय",
  Home: "होम",
  "Digital Library": "डिजिटल पुस्तकालय",
  "Library Rules & Regulations": "पुस्तकालय नियम एवं विनियम",
  "Contact Us": "संपर्क करें",
};

function strip(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("root title_hi:", TITLE_HI);
  console.log("root excerpt_hi:", EXCERPT_HI);
  console.log("content_hi preview:", strip(CONTENT_HI).slice(0, 280));

  const { data: children, error: chErr } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,title_hi")
    .or(`id.eq.${PAGE_ID},college_root_id.eq.${PAGE_ID},parent_id.eq.${PAGE_ID}`);
  if (chErr) throw chErr;

  const titlePlans = [];
  for (const row of children ?? []) {
    const want = CHILD_TITLE_HI[row.slug];
    if (!want) continue;
    if (row.title_hi === want) continue;
    titlePlans.push({ id: row.id, slug: row.slug, from: row.title_hi, to: want });
  }
  console.log(`\ntitle_hi updates: ${titlePlans.length}`);
  for (const p of titlePlans) console.log(`  ${p.slug}: ${JSON.stringify(p.from)} → ${p.to}`);

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi")
    .eq("page_id", PAGE_ID);

  const sidePlans = [];
  for (const row of sides ?? []) {
    const want = SIDEBAR_LABEL_HI[row.label_en];
    if (!want || row.label_hi === want) continue;
    sidePlans.push({ id: row.id, en: row.label_en, from: row.label_hi, to: want });
  }
  console.log(`\nsidebar updates: ${sidePlans.length}`);
  for (const p of sidePlans) console.log(`  ${p.en}: ${JSON.stringify(p.from)} → ${p.to}`);

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      title_hi: TITLE_HI,
      excerpt_hi: EXCERPT_HI,
      content_hi: CONTENT_HI,
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("\nOK root page content_hi / title_hi / excerpt_hi");

  for (const p of titlePlans) {
    const { error: upErr } = await sb
      .from("ccshau_pages")
      .update({ title_hi: p.to, updated_at: now })
      .eq("id", p.id);
    if (upErr) throw upErr;
    console.log(`OK title ${p.slug}`);
  }

  for (const p of sidePlans) {
    const { error: upErr } = await sb
      .from("ccshau_page_sidebar_items")
      .update({ label_hi: p.to, updated_at: now })
      .eq("id", p.id);
    if (upErr) throw upErr;
    console.log(`OK sidebar ${p.en}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
