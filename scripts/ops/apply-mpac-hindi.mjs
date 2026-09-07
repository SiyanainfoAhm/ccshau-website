#!/usr/bin/env node
/**
 * Curated Hindi for Manpower Assessment Cell:
 *   - page content_hi (ACTIVITIES)
 *   - excerpt_hi
 *   - sidebar label_hi + PDF anchor text
 *
 * Funding agencies list keeps official English org names/addresses;
 * field labels (ई-मेल/फैक्स/दूरभाष) already Hindi.
 *
 *   node scripts/ops/apply-mpac-hindi.mjs
 *   node scripts/ops/apply-mpac-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "44a44b1e-dadc-4cf7-ad28-0d82069b1b0a";

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

const EXCERPT_HI = "मानव संसाधन प्रबंधन निदेशालय के अंतर्गत जनशक्ति आकलन प्रकोष्ठ।";

const ACTIVITIES_HI = `<p style="text-align: justify;"><strong><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, Times, serif;">गतिविधियाँ :</span></strong></p><ul><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">जनशक्ति आवश्यकताएँ, प्रवेश नीति, परीक्षा सुधार, संसाधन उपयोग आदि क्षेत्रों पर आकलन अध्ययन करना। किसी महाविद्यालय के विशिष्ट विभागों का आकलन निदेशालय द्वारा तथा आवश्यकता पड़ने पर परामर्श एजेंसी, विशिष्ट दल अथवा टास्क फोर्स नियुक्त कर भी किया जा सकता है। यह सरकारी अथवा अन्य निजी संगठनों के मूल्यांकन अध्ययन हेतु परामर्श सेवा भी प्रदान कर सकता है।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">विश्वविद्यालय की विभिन्न गतिविधियों पर डेटा बैंक का निर्माण करना, जिससे उचित अनुमान/पूर्वानुमान लगाने में सहायता मिले।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">वित्त पोषण एजेंसियों की जानकारी रखना तथा शिक्षकों/वैज्ञानिकों को परियोजनाएँ तैयार करने हेतु मार्गदर्शन देना; साथ ही निधि प्राप्त करने हेतु अन्य एजेंसियों से पत्राचार करना तथा विश्वविद्यालय परियोजनाओं को बाहरी वित्त पोषण एजेंसियों से समन्वित करना।</span></li></ul>`;

const LABEL_HI = {
  "Head of Department": "विभागाध्यक्ष",
  Faculty: "संकाय",
  "Faculty Profile 2024": "संकाय प्रोफ़ाइल 2024",
  "Procedure of the post clearance in the University":
    "विश्वविद्यालय में पद निकासी की प्रक्रिया",
  "Proforma for Post Clearance of Non-Teaching Employees":
    "गैर-शैक्षणिक कर्मचारियों की पद निकासी हेतु प्रपत्र",
  "Proforma for Seeking Clearance for Filling Up of Vacant Posts of Teachers":
    "शिक्षकों के रिक्त पद भरने हेतु निकासी माँगने का प्रपत्र",
  "List of Research Funding Agencies": "अनुसंधान वित्त पोषण एजेंसियों की सूची",
};

const PDF_ANCHOR_HI = { ...LABEL_HI };

function pdfContentHi(contentEn, labelHi) {
  if (!contentEn) return null;
  let out = contentEn;
  const m = out.match(/<strong>([^<]*)<\/strong>/i) || out.match(/>([^<]{8,120})</);
  if (out.includes("<strong>")) {
    out = out.replace(/<strong>([^<]*)<\/strong>/i, `<strong>${labelHi}</strong>`);
  } else if (/<span[^>]*>[^<]+<\/span>/i.test(out)) {
    out = out.replace(/(<span[^>]*>)([^<]+)(<\/span>)/i, `$1${labelHi}$3`);
  }
  if (!out.trim().startsWith("<p")) out = `<p>${out}</p>`;
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  console.log("page content_hi → curated ACTIVITIES");
  console.log("excerpt_hi →", EXCERPT_HI);

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en,content_hi,is_active")
    .eq("page_id", PAGE_ID)
    .order("sort_order");

  for (const row of sides ?? []) {
    if (!LABEL_HI[row.label_en]) continue;
    const label_hi = LABEL_HI[row.label_en];
    let content_hi = row.content_hi;
    if (PDF_ANCHOR_HI[row.label_en] && row.content_en && (row.content_en || "").length < 500) {
      content_hi = pdfContentHi(row.content_en, PDF_ANCHOR_HI[row.label_en]);
    }
    console.log(
      `  ${row.label_en}\n    label: ${row.label_hi} → ${label_hi}${content_hi && content_hi !== row.content_hi ? " | PDF caption HI" : ""}`,
    );
  }

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  {
    const { error } = await sb
      .from("ccshau_pages")
      .update({
        content_hi: ACTIVITIES_HI,
        excerpt_hi: EXCERPT_HI,
        title_hi: "जनशक्ति आकलन प्रकोष्ठ",
        updated_at: now,
      })
      .eq("id", PAGE_ID);
    if (error) throw error;
    console.log("OK page content_hi + excerpt_hi");
  }

  for (const row of sides ?? []) {
    const label_hi = LABEL_HI[row.label_en];
    if (!label_hi) continue;
    const patch = { label_hi, updated_at: now };
    if (row.content_en && (row.content_en || "").length < 500 && PDF_ANCHOR_HI[row.label_en]) {
      patch.content_hi = pdfContentHi(row.content_en, PDF_ANCHOR_HI[row.label_en]);
    }
    // funding list: ensure heading line is Hindi (already) — lightly normalize EBPAX label if present
    if (row.label_en === "List of Research Funding Agencies" && row.content_en) {
      let hi = row.content_hi || row.content_en;
      hi = hi
        .replace(/List of Research Funding Agencies/gi, "अनुसंधान वित्त पोषण एजेंसियों की सूची")
        .replace(/\be-mail:/gi, "ई-मेल:")
        .replace(/\bweb:/gi, "वेब:")
        .replace(/\bFax:/gi, "फैक्स:")
        .replace(/\bTel:/gi, "दूरभाष:")
        .replace(/EBPAX\s*No\./gi, "ई.बी.पी.ए.एक्स. संख्या");
      patch.content_hi = hi;
    }
    const { error } = await sb.from("ccshau_page_sidebar_items").update(patch).eq("id", row.id);
    if (error) throw error;
    console.log(`OK ${row.label_en}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
