#!/usr/bin/env node
/**
 * Curated Hindi for Planning & Evaluation Section page body + excerpt.
 *
 *   node scripts/ops/apply-planning-hindi.mjs
 *   node scripts/ops/apply-planning-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "dc855075-59a8-4db2-97e7-a379d6b0cef4";

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

const EXCERPT_HI = "मानव संसाधन प्रबंधन निदेशालय के अंतर्गत योजना और मूल्यांकन अनुभाग।";

const CONTENT_HI = `<p style="text-align: justify;"><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, Times, serif;">निदेशालय का योजना और मूल्यांकन अनुभाग योजना एवं मूल्यांकन संबंधी कार्य का उत्तरदायित्व वहन करता है। विश्वविद्यालय को वित्तीय सहायता मुख्यतः राज्य सरकार से प्राप्त होती है तथा निदेशालय, इस अनुभाग के माध्यम से, विश्वविद्यालय की शिक्षण, अनुसंधान एवं विस्तार गतिविधियों हेतु वित्तीय संसाधनों के सर्वाधिक विवेकपूर्ण वितरण एवं निगरानी का दायित्व निभाता है। यह अनुभाग समग्र परिप्रेक्ष्य विकास योजनाएँ तैयार करता है; विश्वविद्यालय की व्यापक गतिविधियों का मूल्यांकन करता है तथा सुधार सुझाता है। इस अनुभाग के माध्यम से डी.एच.आर.एम. राज्य सरकार के विभागों, भारतीय कृषि अनुसंधान परिषद, राज्य कृषि विश्वविद्यालयों, भारत सरकार के विभिन्न विभागों एवं अन्य संगठनों से विश्वविद्यालय के सर्वोत्तम हित में संपर्क भी बनाए रखता है। इस प्रकार यह अनुभाग आवश्यक संसाधनों की उपलब्धता एवं उनके विवेकपूर्ण उपयोग को सुनिश्चित कर विश्वविद्यालय में कृषि शिक्षा को सुगम बनाता है।</span></p><p style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;"><strong>उद्देश्य :</strong></span></p><ul><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">विश्वविद्यालय के डीन/निदेशकों, नियंत्रक, मुख्य अभियंता एवं अन्य संबंधित अधिकारियों के परामर्श से संसाधनों के प्रभावी एवं संतुलित उपयोग हेतु दीर्घकालिक एवं अल्पकालिक समग्र परिप्रेक्ष्य विकास योजनाएँ, पंचवर्षीय योजना, वार्षिक योजनाएँ, विशेष परियोजनाएँ आदि—जिनमें शिक्षण, अनुसंधान एवं विस्तार, परिसर विकास तथा वित्तीय प्रबंधन शामिल हैं—तैयार करना।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">विश्वविद्यालय की व्यापक गतिविधियों अर्थात् शिक्षण, अनुसंधान, विस्तार एवं प्रशासन का मूल्यांकन करना तथा सुधार सुझाना।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">विश्वविद्यालय के सर्वोत्तम हित में राज्य सरकार के विभागों, भारतीय कृषि अनुसंधान परिषद, राज्य कृषि विश्वविद्यालयों, भारत सरकार एवं अन्य संगठनों से संपर्क बनाए रखना।</span></li><li style="text-align: justify;"><span style="font-size: 18px; font-family: Times New Roman, Times, serif;">राष्ट्रीय एवं अंतरराष्ट्रीय सम्मेलनों/प्रशिक्षणों में भाग लेने वाले वैज्ञानिकों को यात्रा सहायता।</span></li></ul>`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("excerpt_hi →", EXCERPT_HI);
  console.log("content_hi len →", CONTENT_HI.length);
  console.log("preview:", CONTENT_HI.replace(/\s+/g, " ").slice(0, 220));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      excerpt_hi: EXCERPT_HI,
      title_hi: "योजना और मूल्यांकन अनुभाग",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;

  // Ensure HOD Hindi name stays clean
  await sb
    .from("ccshau_faculty_people")
    .update({
      name_en: "OSD (Finance)",
      name_hi: "ओ.एस.डी. (वित्त)",
      updated_at: now,
    })
    .eq("id", "c88342a3-4309-4907-a6be-0d398a60a90b");

  console.log("OK planning content_hi + excerpt_hi + HOD name_hi");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
