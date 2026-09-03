#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ABOUT_HI = {
  "nl-technical-section":
    "<p>नेहरू पुस्तकालय का तकनीकी अनुभाग पुस्तकालय संचालन, तकनीकी सेवाएँ और संबंधित सुविधाओं के लिए उत्तरदायी है।</p>",
  "nl-acquisition-section":
    "<p>नेहरू पुस्तकालय का अधिग्रहण अनुभाग पुस्तकों, पत्रिकाओं और अन्य साहित्य की खरीद तथा संग्रह प्रबंधन संभालता है।</p>",
  "nl-periodical-section":
    "<p>नेहरू पुस्तकालय का पत्रिका अनुभाग नियमित रूप से प्रकाशित पत्रिकाओं, जournals और संबंधित सामग्री का प्रबंधन करता है।</p>",
  "dsw-national-service-scheme-bawal":
    "<p>राष्ट्रीय सेवा योजना (एन.एस.एस.), बावल — छात्रों में सामाजिक सेवा, राष्ट्र निर्माण और सामुदायिक विकास की भावना विकसित करने हेतु कार्यरत है।</p>",
  "dsw-national-cadet-corps-kaul":
    "<p>राष्ट्रीय कैडेट कोर (एन.सी.सी.), कौल — अनुशासन, नेतृत्व और देशभक्ति के मूल्यों के साथ छात्रों को प्रशिक्षित करता है।</p>",
  "dsw-national-service-scheme-kaul":
    "<p>राष्ट्रीय सेवा योजना (एन.एस.एस.), कौल — सामुदायिक सेवा और सामाजिक जागरूकता कार्यक्रमों के माध्यम से छात्रों का सर्वांगीण विकास करता है।</p>",
  "dsw-young-journalism-cell":
    "<p>युवा पत्रकारिता प्रकोष्ठ — छात्रों में पत्रकारिता, संचार कौशल और मीडिया साक्षरता को बढ़ावा देने हेतु गतिविधियाँ संचालित करता है।</p>",
  "dsw-youth-red-cross":
    "<p>युवा रेड क्रॉस — मानवता की सेवा, प्राथमिक चिकित्सा, रक्तदान और आपदा राहत के क्षेत्र में छात्रों की सक्रिय भागीदारी को प्रोत्साहित करता है।</p>",
  "ram-dhan-singh-seed-farm":
    "<p>डॉ. राम धन सिंह बीज खेत — अनुसंधान, बीज उत्पादन और कृषि प्रदर्शन हेतु समर्पित अनुसंधान खेत।</p>",
  "science-resource-management-and-consumer-science":
    "<p>संसाधन प्रबंधन और उपभोक्ता विज्ञान — परिवार संसाधनों, उपभोक्ता अधिकारों और गृह प्रबंधन के क्षेत्र में शिक्षण, अनुसंधान और विस्तार।</p>",
  "farms-director-farm":
    "<p>निदेशक खेत — विश्वविद्यालय के अनुसंधान और प्रदर्शन खेतों के समन्वय और प्रबंधन हेतु उत्तरदायी इकाई।</p>",
};

let updated = 0;
for (const [slug, contentHi] of Object.entries(ABOUT_HI)) {
  const { data: page } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_hi")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) {
    console.log(`Skip missing: ${slug}`);
    continue;
  }
  console.log(`Set about: ${slug} (${page.title_en})`);
  if (APPLY) {
    await supabase.from("ccshau_pages").update({ content_hi: contentHi }).eq("id", page.id);
    updated++;
  }
}
console.log(`${APPLY ? "Updated" : "Planned"}: ${updated}`);
