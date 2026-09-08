#!/usr/bin/env node
/**
 * Curated Hindi for IPR Cell sidebar labels + HTML bodies.
 *
 *   node scripts/ops/apply-ipr-sidebars-hindi.mjs
 *   node scripts/ops/apply-ipr-sidebars-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "6d775969-a631-41fb-a78f-3c2618327bd0";

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

const LABEL_HI = {
  "Head of Department": "विभागाध्यक्ष",
  Faculty: "संकाय",
  Objectives: "उद्देश्य",
  "University Trademark": "विश्वविद्यालय ट्रेडमार्क",
  "Patent Filing Form": "पेटेंट दाखिल करने का प्रपत्र",
  Responsibilities: "उत्तरदायित्व",
  "Intellectual Property": "बौद्धिक संपदा",
  "IPR Advisory Board": "आई.पी.आर. सलाहकार बोर्ड",
  "e-Course PGS 503": "ई-पाठ्यक्रम पी.जी.एस. 503",
  "List of Patent/IPRs Filed": "दाखिल पेटेंट/आई.पी.आर. की सूची",
  "List of Patent/IPRs Granted": "प्रदत्त पेटेंट/आई.पी.आर. की सूची",
  "Procedure for Filing Patent/Copy right/Design":
    "पेटेंट/कॉपीराइट/डिज़ाइन दाखिल करने की प्रक्रिया",
  "Success Stories": "सफलता की कहानियाँ",
  Links: "लिंक",
};

const OBJECTIVES_HI = `<ul><li style="text-align: justify;">विश्वविद्यालय तथा उसके संकाय एवं तकनीकी कर्मचारियों को ऐसे अनुप्रयुक्त नवीन अनुसंधान तथा उत्पादों/प्रक्रियाओं के विकास हेतु प्रोत्साहित करना, जिन्हें किसानों एवं जनता के अन्य सदस्यों, राज्य तथा राष्ट्र के लाभ हेतु स्थानांतरित किया जा सके;</li><li style="text-align: justify;">भारत के &ldquo;सूचना का अधिकार अधिनियम, 2005&rdquo; के अनुरूप विश्वविद्यालय के नवाचारों के संरक्षण हेतु खुले दिशानिर्देश प्रदान करना;</li><li style="text-align: justify;">भारत के &ldquo;सूचना का अधिकार अधिनियम, 2005&rdquo; के अनुरूप पारदर्शी संचालन के माध्यम से इन नवाचारों को सार्वजनिक हित एवं वाणिज्यिक उपयोग हेतु अनुप्रयोग में स्थानांतरित करना संभव बनाना;</li><li style="text-align: justify;">आविष्कारों के सृजन, आई.पी.आर. संरक्षण तथा वाणिज्यिक लाइसेंसिंग गतिविधियों में भाग लेने हेतु संकाय एवं तकनीकी कर्मचारियों को प्रोत्साहन प्रदान करना।</li></ul>`;

const RESPONSIBILITIES_HI = `<p style="text-align: justify;"><strong>संकाय, छात्र एवं सहायक कर्मचारियों के उत्तरदायित्व</strong></p><p style="text-align: justify;">आई.पी.आर. नीति के आविष्कारक आई.पी.आर. संरक्षण एवं व्यावसायीकरण प्रक्रियाओं में पूर्ण भागीदार हैं, जिनमें निम्नलिखित उत्तरदायित्व शामिल हैं, परंतु इन्हीं तक सीमित नहीं हैं:</p><ul><li style="text-align: justify;">विभागाध्यक्ष द्वारा विभागीय स्तर पर शोध आँकड़ों के उचित प्रलेखन एवं अभिलेख रखरखाव को लागू किया जाएगा तथा उन अनुप्रयुक्त शोध विकासों की पहचान आई.पी.आर. प्रकोष्ठ को की जाएगी, जिनसे किसानों एवं अन्य नागरिकों को व्यावहारिक लाभ हो सकता है।</li><li style="text-align: justify;">गुणवत्तापूर्ण शोध उत्पादों के सृजन हेतु परियोजनाओं/सारांश की तैयारी के दौरान संकाय सदस्यों/छात्रों के लिए आई.पी.आर. खोज करना पूर्वापेक्षा होगी। परिणाम जमा/प्रकट करने अथवा प्रकाशन हेतु भेजने से पूर्व वे अपने कार्य के पेटेंट योग्यता पहलुओं को भी देखेंगे। पेटेंट/संरक्षण तब प्रदान किया जाता है जब सूचना सार्वजनिक डोमेन में न हो।</li><li style="text-align: justify;">वित्तपोषण एजेंसियों द्वारा निर्धारित तथा आई.पी.आर. प्रकोष्ठ द्वारा उपलब्ध कराए गए प्रपत्रों पर आविष्कारों के प्रलेखन में आई.पी.आर. प्रकोष्ठ से सहयोग करना।</li><li style="text-align: justify;">सक्षम सरकारी एजेंसियों के समक्ष दाखिल की जाने वाली पेटेंट आवेदनों के प्रारूपण में आई.पी.आर. प्रकोष्ठ से सहयोग करना।</li><li style="text-align: justify;">प्रकट आविष्कारों के लाइसेंसिंग हेतु निजी क्षेत्र में व्यक्तिगत एवं कॉर्पोरेट संपर्कों की पहचान में आई.पी.आर. प्रकोष्ठ से सहयोग करना।</li><li style="text-align: justify;">वित्तपोषण एजेंसियों को बौद्धिक संपदा रिपोर्ट पूर्ण करने में आई.पी.आर. प्रकोष्ठ से सहयोग करना।</li><li style="text-align: justify;">संबंधित आविष्कार हेतु लाइसेंस समझौते की वार्ता प्रक्रिया में आई.पी.आर. प्रकोष्ठ के लिए तकनीकी संसाधन के रूप में कार्य करना।</li></ul>`;

const INTELLECTUAL_PROPERTY_HI = `<p style="text-align: justify;"><strong>बौद्धिक संपदा का स्वामित्व:</strong></p><ul><li style="text-align: justify;">विश्वविद्यालय के छात्रों अथवा तकनीकी कर्मचारियों द्वारा उनकी तकनीकी विशेषज्ञता एवं/अथवा सौंपे गए कर्तव्यों के दायरे में किए गए सभी आविष्कारों का स्वामित्व विश्वविद्यालय का होगा, तथा वैधानिक संरक्षण हेतु दाखिल करने पर औपचारिक रूप से विश्वविद्यालय को समनुदेशित किया जाएगा।</li><li style="text-align: justify;">&ldquo;आविष्कार&rdquo; शब्द में बौद्धिक संपदा के निम्नलिखित रूप शामिल हैं: पेटेंट (तथा साथ में तकनीकी ज्ञान), औद्योगिक डिज़ाइन, ट्रेडमार्क, कॉपीराइट, पादप किस्में तथा इसी प्रकार की अन्य संरक्षित रचनाएँ।</li><li style="text-align: justify;">विश्वविद्यालय संकाय सदस्यों, छात्रों एवं सहायक कर्मचारियों द्वारा विकसित कॉपीराइट योग्य कृतियों पर स्वामित्व का दावा नहीं करता, जब तक कि कोई कॉपीराइट योग्य कृति विश्वविद्यालय द्वारा &ldquo;कार्य-आधारित कृति (Work for Hire)&rdquo; के रूप में कमीशन न की गई हो। विश्वविद्यालय आई.सी.ए.आर. दिशानिर्देशों के अनुसार स्नातकोत्तर शोध प्रबंधों के संरक्षण हेतु भी आवश्यक कदम उठाएगा।</li><li style="text-align: justify;">विश्वविद्यालय में निजी क्षेत्र द्वारा प्रायोजित शोध परियोजना से उत्पन्न आविष्कार का स्वामित्व ऐसे प्रायोजित कार्य को नियंत्रित करने वाले समझौता ज्ञापन (एम.ओ.यू.) में परिभाषित होगा।</li><li style="text-align: justify;">हरियाणा कृषि विश्वविद्यालय एवं किसी अन्य विश्वविद्यालय अथवा अन्य सार्वजनिक संगठन के बीच शोध सहयोग के दौरान विकसित बौद्धिक संपदा का स्वामित्व सहयोगियों के बीच वार्ता किए गए समझौता ज्ञापन में परिभाषित होगा।</li><li style="text-align: justify;">विश्वविद्यालय किसी भी रूप अथवा अनुप्रयोग में विश्वविद्यालय के &ldquo;ब्रांड&rdquo; का प्रतिनिधित्व करने वाले सभी ट्रेडमार्कों का स्वामित्व एवं नियंत्रण रखेगा।</li><li style="text-align: justify;">यदि आविष्कार सौंपे गए आधिकारिक कर्तव्यों के दायरे से बाहर तथा विश्वविद्यालय के समय एवं निधियों का उपयोग किए बिना किया गया हो, तो विश्वविद्यालय संकाय, छात्रों एवं सहायक कर्मचारियों द्वारा किए गए ऐसे आविष्कार पर स्वामित्व का दावा नहीं करेगा।</li></ul>`;

const LINKS_HI = `<p><a href="http://www.ipindia.gov.in/journal.htm" target="_blank">&bull; &ldquo;भारत सरकार का पेटेंट कार्यालय का आधिकारिक जर्नल&rdquo;</a></p><p><a href="http://www.wipo.int/portal/en/" target="_blank">&bull; विश्व बौद्धिक संपदा संगठन (WIPO)</a></p><p><a href="http://ipindia.nic.in/" target="_blank">&bull; बौद्धिक संपदा, भारत</a></p>`;

/** PDF-link tabs: keep same href, translate anchor label only. */
const PDF_ANCHOR_HI = {
  "University Trademark": "विश्वविद्यालय ट्रेडमार्क",
  "Patent Filing Form": "पेटेंट दाखिल करने का प्रपत्र",
  "IPR Advisory Board": "आई.पी.आर. सलाहकार बोर्ड",
  "e-Course PGS 503": "ई-पाठ्यक्रम पी.जी.एस. 503",
  "List of Patent/IPRs Filed": "दाखिल पेटेंट/आई.पी.आर. की सूची",
  "List of Patent/IPRs Granted": "प्रदत्त पेटेंट/आई.पी.आर. की सूची",
  "Procedure for Filing Patent/Copy right/Design":
    "पेटेंट/कॉपीराइट/डिज़ाइन दाखिल करने की प्रक्रिया",
  "Success Stories": "सफलता की कहानियाँ",
};

const BODY_HI = {
  Objectives: OBJECTIVES_HI,
  Responsibilities: RESPONSIBILITIES_HI,
  "Intellectual Property": INTELLECTUAL_PROPERTY_HI,
  Links: LINKS_HI,
};

function pdfContentHi(contentEn, labelHi) {
  if (!contentEn) return null;
  // Replace visible English label inside <strong>...</strong> (or whole text) with Hindi
  let out = contentEn;
  const m = out.match(/<strong>([^<]*)<\/strong>/i);
  if (m) {
    out = out.replace(m[0], `<strong>${labelHi}</strong>`);
  }
  if (!out.trim().startsWith("<p")) {
    out = `<p>${out}</p>`;
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  const { data: rows, error } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en,content_hi,is_active")
    .eq("page_id", PAGE_ID)
    .order("sort_order");
  if (error) throw error;

  for (const row of rows ?? []) {
    const label_hi = LABEL_HI[row.label_en] ?? row.label_hi;
    let content_hi = row.content_hi;
    if (BODY_HI[row.label_en]) {
      content_hi = BODY_HI[row.label_en];
    } else if (PDF_ANCHOR_HI[row.label_en] && row.content_en) {
      content_hi = pdfContentHi(row.content_en, PDF_ANCHOR_HI[row.label_en]);
    }

    const labelChanged = label_hi && label_hi !== row.label_hi;
    const bodyChanged = content_hi && content_hi !== row.content_hi;
    if (!labelChanged && !bodyChanged) {
      console.log(`  skip ${row.label_en}`);
      continue;
    }
    console.log(
      `  ${row.label_en}: label ${labelChanged ? "FIX" : "ok"} | body ${bodyChanged ? `HI ${content_hi.length}` : "ok"}`,
    );
    if (!APPLY) continue;

    const patch = { updated_at: now };
    if (label_hi) patch.label_hi = label_hi;
    if (content_hi) patch.content_hi = content_hi;
    const { error: upErr } = await sb
      .from("ccshau_page_sidebar_items")
      .update(patch)
      .eq("id", row.id);
    if (upErr) throw upErr;
  }

  // Hero excerpt was Hinglish — set curated Hindi
  const EXCERPT_HI = "मानव संसाधन प्रबंधन निदेशालय के अंतर्गत आई.पी.आर. प्रकोष्ठ एवं बी.पी.डी. इकाई।";
  const { data: page } = await sb
    .from("ccshau_pages")
    .select("id,title_en,title_hi,excerpt_en,excerpt_hi")
    .eq("id", PAGE_ID)
    .single();
  console.log("\npage title_hi:", page?.title_hi);
  console.log("excerpt_hi was:", page?.excerpt_hi);
  if (APPLY && page?.excerpt_hi !== EXCERPT_HI) {
    const { error: exErr } = await sb
      .from("ccshau_pages")
      .update({ excerpt_hi: EXCERPT_HI, updated_at: now })
      .eq("id", PAGE_ID);
    if (exErr) throw exErr;
    console.log("excerpt_hi now:", EXCERPT_HI);
  }

  if (APPLY) console.log("\nDone.");
  else console.log("\nPass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
