#!/usr/bin/env node
/**
 * Curated Hindi for Estate Office about body.
 *
 *   node scripts/ops/apply-estate-office-hindi.mjs
 *   node scripts/ops/apply-estate-office-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "37413f46-f5c2-44bf-b4d7-2bdee33976c8";

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

const CONTENT_HI = `<p style="text-align:justify">विश्वविद्यालय में एक अभियांत्रिकी इकाई है, जिसका नेतृत्व एस्टेट अधिकारी-सह-मुख्य अभियंता करते हैं; इसके साथ उप एस्टेट अधिकारी, आर्किटेक्ट, कार्यकारी अभियंता (एक्स.ई.एन.), उप-मंडलीय अभियंता (एस.डी.ई.), कनिष्ठ अभियंता (जे.ई.), डिज़ाइन सेल एवं सहायक स्टाफ सम्मिलित हैं। चार मंडल हैं—दो सिविल मंडल, एक लोक स्वास्थ्य मंडल तथा एक विद्युत मंडल। एक सिविल मंडल अर्थात् एक्स.ई.एन. (सी-1) हिसार परिसर एवं बाहरी केंद्रों—जिंद, रोहतक, सोनीपत, भिवानी, बावल, महेंद्रगढ़, मंदकोला, फरीदाबाद, पलवल आदि—में सड़कों, छात्रावासों, पुराने परिसर आवासीय क्षेत्र तथा कार्यालय भवनों के रखरखाव हेतु उत्तरदायी है। द्वितीय सिविल मंडल—एक्स.ई.एन. (सी.II)—हिसार परिसर के नए परिसर आवासीय क्षेत्र एवं कुछ कार्यालय भवनों तथा सिरसा, फतेहाबाद, कैथल, कौल, करनाल, कुरुक्षेत्र, यमुनानगर, अंबाला एवं पिंजौर आदि बाहरी केंद्रों के रखरखाव हेतु उत्तरदायी है। लोक स्वास्थ्य मंडल सी.सी.एस. एच.ए.यू. के परिसर एवं फार्मों में जल आपूर्ति/मल निकासी का रखरखाव करता है, जिसमें आवासीय क्षेत्र तथा कार्यालय भवनों, महाविद्यालय भवनों, छात्रावासों आदि में दैनिक लोक स्वास्थ्य रखरखाव शामिल है। इसी प्रकार विद्युत मंडल विद्युत आपूर्ति, जेनरेटरों का रखरखाव, एच.ए.यू. में ई.पी.ए.बी.एक्स. प्रणाली तथा इंदिरा गांधी सभागार के संचालन एवं रखरखाव हेतु उत्तरदायी है। उप एस्टेट अधिकारी परिसर में स्वच्छता बनाए रखने हेतु उत्तरदायी हैं। एच.ए.यू. के भूमि अभिलेख/संपत्ति की देखरेख भी डी.ई.ओ. द्वारा की जाती है। इसी प्रकार वास्तुकला संबंधी कार्य आर्किटेक्ट शाखा द्वारा किया जाता है। अभियांत्रिकी इकाई ने हिसार परिसर एवं सभी जिला मुख्यालयों/अनुसंधान केंद्रों पर शिक्षण, अनुसंधान एवं विस्तार हेतु उत्कृष्ट भौतिक सुविधाएँ प्रदान की हैं। वर्तमान में अभियांत्रिकी इकाई आई.सी.ए.आर. द्वारा प्रदानित एकमुश्त कैच-अप अनुदान के माध्यम से भवनों, सड़कों एवं छात्रावासों आदि सुविधाओं के व्यापक नवीकरण एवं उन्नयन में संलग्न है, जिससे न केवल भवनों का जीवन बढ़ेगा अपितु कार्य एवं आवास वातावरण में भी सुधार होगा। यह इकाई निर्धारित विभागीय शुल्कों सहित वास्तुकला एवं संरचनात्मक डिज़ाइन के साथ केंद्र सरकार, राज्य सरकार, बोर्डों एवं अन्य बाहरी एजेंसियों के जमा कार्य करती है तथा राज्य सरकार, बोर्डों एवं अन्य बाहरी एजेंसियों हेतु निर्धारित विभागीय शुल्कों सहित वास्तुकला/संरचनात्मक डिज़ाइन के साथ अत्यंत प्रतिष्ठित भवनों का निर्माण कर चुकी है। निर्माण कार्यों के अतिरिक्त अभियांत्रिकी इकाई दुकान आवंटन एवं आवास आवंटन से लाइसेंस शुल्क के माध्यम से आय भी अर्जित करती है। तथापि आवास आवंटन का कार्य अध्यक्ष, एच.ए.सी. द्वारा देखा जाता है।</p>`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("content_hi len", CONTENT_HI.length);
  console.log("preview:", CONTENT_HI.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 240));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi: CONTENT_HI,
      title_hi: "एस्टेट कार्यालय",
      excerpt_hi: "एस्टेट अधिकारी-सह-मुख्य अभियंता, सी.सी.एस. एच.ए.यू.।",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("OK estate-office content_hi");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
