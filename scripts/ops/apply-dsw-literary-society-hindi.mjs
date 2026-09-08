#!/usr/bin/env node
/**
 * Curated Hindi for DSW Literary Society about body + sidebar labels.
 *
 *   node scripts/ops/apply-dsw-literary-society-hindi.mjs
 *   node scripts/ops/apply-dsw-literary-society-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "f43e7ed8-370c-4bc9-a6ae-9edaa6b7e2a2";

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

const S1 = 'font-size: 18px; font-family: "Times New Roman", Times, serif;';
const S2 =
  'font-size: 18px; font-family: "Times New Roman", Times, serif; color: rgb(34, 34, 34); background: white;';

const CONTENT_HI = `<p style="text-align: justify;"><span style='${S1}'>विश्वविद्यालय की साहित्यिक एवं वाद-विवाद समिति ने प्रतियोगिताएँ एवं कार्यक्रम आयोजित किए ताकि छात्रों को सर्वांगीण विकास एवं अच्छे संचार कौशल वाले सुविज्ञ व्यक्तित्व के रूप में ढाला जा सके। समिति नियमित रूप से अंतर-महाविद्यालय वाद-विवाद, वक्तृत्व एवं निबंध लेखन प्रतियोगिताएँ आयोजित करती रही है ताकि छात्रों के कौशलों को निखारा जा सके तथा उन्हें राज्य एवं राष्ट्रीय स्तर की प्रतियोगिताओं हेतु प्रशिक्षित किया जा सके।</span></p><p style="text-align: justify;"><span style='${S2}'>विश्वविद्यालय की साहित्यिक एवं वाद-विवाद समिति छात्रों को विभिन्न संचार कौशलों—<em>यथा</em> बोलना एवं लिखना—के माध्यम से स्वयं को अभिव्यक्त करने हेतु एक मंच प्रदान करती है। समिति का उद्देश्य छात्रों को सुविज्ञ व्यक्तित्व के रूप में विकसित करना है। यह विश्वविद्यालय के विभिन्न घटक महाविद्यालयों के छात्रों हेतु नियमित रूप से वाद-विवाद एवं वक्तृत्व प्रतियोगिताएँ आयोजित करती है ताकि छात्र सार्वजनिक मंचों पर आत्मविश्वास एवं प्रवाहपूर्ण अभिव्यक्ति विकसित कर सकें। समिति छात्रों के लेखन कौशल में सुधार हेतु भी प्रयास करती है तथा इस उद्देश्य से निबंध लेखन प्रतियोगिताएँ आयोजित करती है। समिति प्रश्नोत्तरी गतिविधियाँ भी संचालित करती है। नियमित रूप से अंतर-महाविद्यालय वाद-विवाद, वक्तृत्व, निबंध लेखन प्रतियोगिताएँ एवं विचार-मंथन सत्र आयोजित किए जाते हैं ताकि छात्रों के कौशलों को निखारा जा सके तथा उन्हें राज्य एवं राष्ट्रीय स्तर की प्रतियोगिताओं हेतु प्रशिक्षित किया जा सके।</span></p>`;

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  "About Literary Society and Achievements": "साहित्यिक समिति एवं उपलब्धियाँ",
  "Advisory Literary Society": "सलाहकार साहित्यिक समिति",
  "Glimpses of Literary Activities": "साहित्यिक गतिविधियों की झलकियाँ",
  "Latest report LDS (April, 2025)": "नवीनतम रिपोर्ट एल.डी.एस. (अप्रैल, 2025)",
  "LDS constitution": "एल.डी.एस. संविधान",
  "Report of activities carried out by the Literary and Debating Society":
    "साहित्यिक एवं वाद-विवाद समिति द्वारा संचालित गतिविधियों की रिपोर्ट",
};

function captionHi(contentEn, labelHi) {
  if (!contentEn || contentEn.length > 500) return null;
  let hi = contentEn;
  if (/<strong>/i.test(hi)) {
    hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
  } else if (/<span[^>]*>/i.test(hi) && !/<a/i.test(hi.slice(0, 20))) {
    hi = hi.replace(/(<span[^>]*>)([^<]+)(<\/span>)/i, `$1${labelHi}$3`);
  } else if (/<a[^>]*>[\s\S]*?<\/a>/i.test(hi)) {
    // Replace innermost visible text in strong/span, else anchor text
    if (/<strong>/i.test(hi)) {
      hi = hi.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
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
      title_hi: "साहित्यिक समिति",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत साहित्यिक समिति।",
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
