#!/usr/bin/env node
/**
 * Fix scholarships-fellowships content_hi — replace broken Hinglish with curated Hindi.
 *
 *   node scripts/ops/apply-scholarships-fellowships-hindi.mjs
 *   node scripts/ops/apply-scholarships-fellowships-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SLUG = "scholarships-fellowships";
const PAGE_ID = "eabc20b4-649b-458e-b559-5a208410326d";

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

const SPAN =
  'style="font-size:13px;vertical-align: baseline;background: transparent;font-family: Arial;"';
const P = 'style="text-align: justify;"';
const STRONG = 'style="font-size: 14px;vertical-align: baseline;background: transparent;"';
const SPAN14 =
  'style="font-size: 14px;vertical-align: baseline;background: transparent;"';

const content_hi = `<div>
                                                    <p ${P}><strong style="font-size: 14px;vertical-align: baseline;"><span ${SPAN}>विश्वविद्यालय वृत्ति / मेरिट वृत्ति</span></strong></p><p ${P}><strong ${STRONG}><span ${SPAN}>स्नातकोत्तर कार्यक्रम के लिए:</span></strong><span ${SPAN}> मास्टर डिग्री कार्यक्रमों के लिए वृत्ति की निम्नलिखित श्रेणियाँ हैं :-</span></p><p ${P}><span ${SPAN}>(a)<span style="vertical-align: baseline;background: transparent;">&nbsp; &nbsp;</span>मास्टर कार्यक्रम में नामांकित छात्र (MBA, M.Sc.-FST, MBB एवं बायो-इंफॉर्मेटिक्स को छोड़कर) जो प्रवेश के समय प्रथम सेमेस्टर के लिए 7.0/10.00 OGPA रखता हो तथा तत्पश्चात् 7.5/10.00 OGPA बनाए रखे / प्राप्त करे, उसे रु. 6000 प्रति माह की मेरिट वृत्ति दी जाएगी, बशर्ते कि वह खेल पुरस्कारों के अतिरिक्त किसी अन्य स्रोत से ड्यूटी वेतन / मौद्रिक सहायता प्राप्त न कर रहा हो।</span></p><p ${P}><span ${SPAN}>(b)<span style="vertical-align: baseline;background: transparent;">&nbsp; &nbsp;</span>गैर-सेवारत छात्रों (MBA, M.Sc.-FST, MBB एवं बायो-इंफॉर्मेटिक्स को छोड़कर) के लिए रु. 3000 प्रति छात्र प्रति माह की वृत्ति, जो मेरिट वृत्ति अथवा विश्वविद्यालय / अन्य सरकारी या गैर-सरकारी एजेंसी से कोई अन्य मौद्रिक सहायता / ड्यूटी वेतन प्राप्त नहीं कर रहे हों।</span></p><p ${P}><span ${SPAN}>(c)<span style="vertical-align: baseline;background: transparent;">&nbsp; &nbsp;</span>M.Sc.-FST, MBB एवं बायो-इंफॉर्मेटिक्स में नामांकित 10% छात्रों को OGPA संबंधी शर्तों की पूर्ति पर रु. 6000 प्रति माह की मेरिट वृत्ति तथा रु. 3000 प्रति माह की वृत्ति।</span></p><p ${P}><span ${SPAN}>(d)<span style="vertical-align: baseline;background: transparent;">&nbsp;&nbsp;</span>MBA में नामांकित 10% छात्रों को OGPA संबंधी शर्तों की पूर्ति पर रु. 1000 प्रति माह की मेरिट वृत्ति।</span></p><p ${P}><span style="font-size: 14px;vertical-align: baseline;background: rgb(255, 255, 255);color: rgb(61, 61, 61);font-family: Verdana, Arial, Helvetica, sans-serif;"><span ${SPAN14}>पीएच.डी. कार्यक्रम के लिए: डॉक्टोरल डिग्री कार्यक्रमों के लिए वृत्ति की निम्नलिखित श्रेणियाँ हैं</span><span ${SPAN}>&nbsp;: -</span></span></p><p ${P}><span ${SPAN}>(a)<span style="vertical-align: baseline;background: transparent;">&nbsp;&nbsp;</span>ऐसे गैर-सेवारत छात्रों के लिए रु. 10000 प्रति माह की मेरिट वृत्ति, जो प्रवेश के समय न्यूनतम OGPA 3.5/4.00 अथवा 10-पॉइंट स्केल पर 7.5 रखते हों, अथवा तत्पश्चात् प्राप्त करें और बनाए रखें।</span></p><p ${P}><span ${SPAN}>(b)<span style="vertical-align: baseline;background: transparent;">&nbsp; &nbsp;</span>गैर-सेवारत छात्र (MBB को छोड़कर) के लिए रु. 5000 प्रति छात्र प्रति माह की वृत्ति, जो इस विश्वविद्यालय अथवा अन्य सरकारी या गैर-सरकारी एजेंसियों से कोई फेलोशिप, मेरिट वृत्ति अथवा मौद्रिक सहायता / ड्यूटी वेतन प्राप्त न कर रहे हों।</span></p><p ${P}><span ${SPAN}>मेरिट वृत्ति / वृत्ति क्रमशः मास्टर एवं पीएच.डी. कार्यक्रम में प्रवेश की तिथि से दो एवं तीन शैक्षणिक वर्षों के लिए दी जाती है, बशर्ते निर्धारित शर्तों की पूर्ति हो।</span></p><p style="text-align: -webkit-left;"><span style="font-size: 14px;vertical-align: baseline;background: rgb(255, 255, 255);color: rgb(61, 61, 61);font-family: Verdana, Arial, Helvetica, sans-serif;"><span ${SPAN14}>अनुसूचित जाति श्रेणी के स्नातकोत्तर छात्रों के लिए विशेष प्रावधान किया गया है, जिसमें भविष्य के प्रमुख क्षेत्रों तथा विभिन्न क्षेत्रों में नए शोध उपलब्धियों हेतु उन्हें उन्नत करने के लिए सेमिनार / सम्मेलनों में भाग लेने हेतु वित्तीय सहायता प्रदान की जाती है।</span><span ${SPAN}>&nbsp;</span></span></p><p ${P}><strong ${STRONG}><span ${SPAN}>अन्य फेलोशिप</span></strong></p><p ${P}><span ${SPAN}>छात्र आई.सी.ए.आर., सी.एस.आई.आर. एवं यू.जी.सी. द्वारा प्रस्तावित जे.आर.एफ. / एस.आर.एफ. के लिए भी प्रतिस्पर्धा करते हैं। इन फेलोशिप की राशि आई.सी.ए.आर. से एम.एससी. के लिए रु. 8640 प्रति माह (जे.आर.एफ.) से पीएच.डी. छात्रों के लिए रु. 15,000 प्रति माह (एस.आर.एफ.) तक; यू.जी.सी. से राजीव गांधी राष्ट्रीय फेलोशिप (केवल अनुसूचित जाति के छात्रों के लिए) के अंतर्गत रु. 15,000 प्रति माह (2 वर्ष के लिए जे.आर.एफ.) से रु. 17,500 प्रति माह (3 वर्ष के लिए एस.आर.एफ.) तक है। हरियाणा राज्य विज्ञान एवं प्रौद्योगिकी परिषद, हरियाणा सरकार, भी पीएच.डी. छात्रों के लिए जे.आर.एफ. (रु. 25,000 प्रति माह) प्रदान करती है।</span></p><p ${P}><strong ${STRONG}><span ${SPAN}>स्वर्ण पदक / पुरस्कार</span></strong></p><p ${P}><span ${SPAN}>स्वर्ण पदक एवं अन्य पुरस्कार विश्वविद्यालय के दीक्षांत समारोह के समय वार्षिक रूप से उन छात्रों को प्रदान किए जाते हैं जो उच्चतम समग्र ग्रेड पॉइंट औसत / अंक प्राप्त करते हैं तथा स्वर्ण पदक / पुरस्कारों के सामान्य नियमों की पूर्ति करते हैं।</span></p><p ${P}><br></p><p ${P}><a target="_blank" href="https://scholarships.gov.in"><span style="font-size: 18px;">राष्ट्रीय छात्रवृत्ति वेबसाइट देखने के लिए यहाँ क्लिक करें</span></a></p>                                            </div>

<span><strong>अद्यतन तिथि
                            :</strong>&nbsp;&nbsp;&nbsp;19-12-2018</span>`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, title_hi, content_hi")
    .eq("slug", SLUG)
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error(`Page not found: ${SLUG}`);
  if (page.id !== PAGE_ID) console.log("Note: id differs from expected", page.id);

  console.log({
    mode: APPLY ? "APPLY" : "dry-run",
    slug: page.slug,
    title_hi: page.title_hi,
    oldHiPreview: page.content_hi?.slice(0, 180),
    newHiPreview: content_hi.slice(0, 180),
    newLen: content_hi.length,
  });

  if (!APPLY) {
    console.log("Pass --apply to update content_hi.");
    return;
  }

  const { error: upErr } = await supabase
    .from("ccshau_pages")
    .update({
      content_hi,
      title_hi: page.title_hi?.trim() || "छात्रवृत्ति और फेलोशिप",
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (upErr) throw upErr;
  console.log("Updated content_hi for scholarships-fellowships.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
