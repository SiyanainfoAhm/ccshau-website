#!/usr/bin/env node
/**
 * Apply Hindi content_hi for department "About the Department" page bodies.
 *
 * Usage:
 *   node scripts/ops/apply-department-about-hindi.mjs --department=hisar-business-management
 *   node scripts/ops/apply-department-about-hindi.mjs --department=hisar-business-management --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const deptSlug = process.argv.find((a) => a.startsWith("--department="))?.split("=")[1];

if (!deptSlug) {
  console.error("Usage: node apply-department-about-hindi.mjs --department=<slug> [--apply]");
  process.exit(1);
}

/** slug → content_hi HTML */
const DEPARTMENT_CONTENT_HI = {
  "hisar-business-management": `<p><strong><span style='font-size: 18px; font-family: "Times New Roman", Times, serif; color: rgb(192, 0, 0);'>विभाग के बारे में:&nbsp;</span></strong></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">व्यवसाय प्रबंधन विभाग की स्थापना 1996-97 में विश्वस्तरीय प्रबंधन स्नातकों को तैयार करने के उद्देश्य से की गई, जो कॉर्पोरेट जगत की चुनौतियों का सामना कर सकें। वर्तमान में विभाग दो प्रबंधन कार्यक्रम — एम.बी.ए. (कृषि-व्यवसाय) और एम.बी.ए. (सामान्य) — संचालित कर रहा है। विभाग कृषि-व्यवसाय प्रबंधन, विपणन, वित्त और मानव संसाधन प्रबंधन में विशेषज्ञता प्रदान करता है। प्रबंधकों के अतिरिक्त योग्य शिक्षकों और शोधकर्ताओं को तैयार करने के लिए विभाग ने सत्र 2017-18 से पी.एच.डी. (कृषि-व्यवसाय) और सत्र 2020-21 से पी.एच.डी. (सामान्य) भी प्रारंभ किया है। विभाग में सुशिक्षित, अनुभवी और समर्पित संकाय है जो छात्रों की सहायता के लिए सदैव तत्पर रहता है। कक्षा शिक्षण के अतिरिक्त छात्रों को केस स्टडी, समूह चर्चा, बिजनेस गेम, औद्योगिक भ्रमण, असाइनमेंट, प्रस्तुतियाँ और भूमिका निभाने जैसी गतिविधियों से अवगत कराया जाता है। विभाग कंप्यूटर, टीवी, एल.सी.डी., ओ.एच.पी. आदि सभी आधुनिक श्रव्य-दृश्य सुविधाओं से सुसज्जित है। लगभग सभी छात्र प्रतिष्ठित भारतीय और बहुराष्ट्रीय कंपनियों तथा सार्वजनिक क्षेत्र के बैंकों में अच्छे पदों पर स्थित हैं।</span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">विभाग में योग्य और अनुभवी संकाय है, जिनके पास व्यापक अनुभव और अंतर्राष्ट्रीय अनुभव है। विभाग के एक संकाय सदस्य को जर्मनी की प्रतिष्ठित अलेक्ज़ेंडर von हम्बोल्ट शोध फैलोशिप प्राप्त हुई है।</span></span></p><h4 style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><span style="color: rgb(192, 0, 0); background: white;">विभाग के उद्देश्य &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp;</span></span></span></h4><h4 style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><span style="color: rgb(192, 0, 0);">एम.बी.ए. (कृषि-व्यवसाय) और एम.बी.ए. (सामान्य)</span></span></span></h4><ul><li><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">छात्रों में व्यावसायिक दृष्टिकोण और अभिवृत्ति विकसित करना।</span></span></li><li><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">भविष्य के विचारशील, विद्वान और ज्ञानी कृषि-प्रबंधकों को उपलब्ध कराकर व्यावसायिक जगत की सहायता करना।</span></span></li><li><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">केस स्टडी और प्रस्तुतियों के माध्यम से छात्रों में जटिल कृषि-व्यवसाय परिस्थितियों का विश्लेषण करने का कौशल विकसित करना।</span></span></li></ul><p><span style='font-size: 18px; font-family: "Times New Roman", Times, serif;'>सेमिनार, ग्रीष्मकालीन प्रशिक्षण, शोध परियोजनाएँ, औद्योगिक भ्रमण, प्रस्तुतियाँ, कार्यक्रम प्रबंधन के अवसर आदि के माध्यम से छात्रों को कॉर्पोरेट जगत के बारे में व्यावहारिक ज्ञान प्रदान करना।</span></p><table style="" width="100%"><tbody><tr><td><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/9jgJaZViT2bUISV1RckxsTkST11NtDentM7MPZKg.pdf">1. प्रशिक्षण-सह-प्लेसमेंट ब्रोशर</a>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/kgf2XDr8sdNbMfWancg0bTEWr6n3szpeI7LJPr7U.pdf">2. प्रशिक्षण-सह-प्लेसमेंट ब्रोशर</a><br></td><td><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/XLh3BVkKVvcfEcEdm8zLFvRnjToxZeRR2OgQHuhy.pdf">ए.आई.सी.टी.ई.</a><br></td></tr><tr><td><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/CtyhQrkxlOKaCOfnsxCsW0YI4pebN82IdSXXXqml.pdf">विभाग के पूर्व विभागाध्यक्ष</a><br></td><td><br></td></tr><tr><td><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/U2w1pHzprkJLnhMYwLEckD5pYBUthD7eBCwI7PnP.pdf">स्नातकोत्तर संकाय</a><br></td><td><br></td></tr><tr><td style=""><br></td><td><br></td></tr><tr><td style=""><br></td><td><br></td></tr></tbody></table>`,
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const contentHi = DEPARTMENT_CONTENT_HI[deptSlug];
  if (!contentHi) {
    console.error(`No curated Hindi content for department: ${deptSlug}`);
    process.exit(1);
  }

  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en, content_hi")
    .eq("slug", deptSlug)
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error(`Department page not found: ${deptSlug}`);

  console.log(`Department: ${page.title_en} (${page.slug})`);
  console.log(`content_en: ${page.content_en?.length ?? 0} chars`);
  console.log(`content_hi: ${page.content_hi?.length ?? 0} chars → ${contentHi.length} chars`);
  console.log(`Has Devanagari: ${/[\u0900-\u097F]/.test(contentHi)}`);

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  const { error: updErr } = await supabase
    .from("ccshau_pages")
    .update({ content_hi: contentHi })
    .eq("id", page.id);
  if (updErr) throw updErr;

  console.log("\n✓ Updated content_hi");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
