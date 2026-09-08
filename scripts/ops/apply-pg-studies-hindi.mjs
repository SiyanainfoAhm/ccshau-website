#!/usr/bin/env node
/**
 * Curated Hindi for:
 *   - post-graduate-studies
 *   - pg-proforma
 *
 *   node scripts/ops/apply-pg-studies-hindi.mjs
 *   node scripts/ops/apply-pg-studies-hindi.mjs --apply
 */
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
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

const POST_GRADUATE_STUDIES_HI = `<p style="text-align:justify"><strong>डॉ. अतुल ढिंगरा,</strong><strong>&nbsp;डीन, स्नातकोत्तर अध्ययन</strong></p><p style="text-align:justify"><strong>डीन,</strong><strong>&nbsp;स्नातकोत्तर अध्ययन</strong> कार्यालय मुख्य रूप से निम्नलिखित जिम्मेदारियाँ निभाता है :</p><p style="text-align:justify">1.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; आई.सी.ए.आर. की सिफारिशों तथा राज्य के हितधारकों को ध्यान में रखते हुए पाठ्यक्रम कार्यों को उन्नत करना और उनका अक्षरशः क्रियान्वयन सुनिश्चित करना।</p><p style="text-align:justify">2.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; विश्वविद्यालय में स्नातकोत्तर शोध की निगरानी करना।</p><p style="text-align:justify">3.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, अंकपत्र तैयार करना, दीक्षांत समारोह आयोजित करना एवं उपाधियाँ प्रदान करना, स्वर्ण पदक तथा श्रेष्ठ शिक्षक पुरस्कारों के चयन आदि गतिविधियाँ संपन्न करना।</p><p style="text-align:justify">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; डीन, स्नातकोत्तर अध्ययन को संघटक महाविद्यालयों के डीनों, निदेशक अनुसंधान तथा निदेशक विस्तार शिक्षा के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण का उत्तरदायित्व सौंपा गया है। इसके अतिरिक्त, डीन स्नातकोत्तर छात्रों के शोध के समन्वय तथा उसे अनुसंधान के प्रमुख क्षेत्रों के साथ एकीकृत करने के लिए उत्तरदायी हैं। पाठ्यक्रम को समय-समय पर आई.सी.ए.आर. दिशानिर्देशों के अनुसार तथा हरियाणा राज्य की विशिष्ट आवश्यकताओं को ध्यान में रखते हुए अद्यतन किया गया है।</p><p style="text-align:justify"><strong>स्नातकोत्तर कार्यक्रम</strong></p><p style="text-align:justify">वर्तमान में विश्वविद्यालय 43 विषयों (एम.बी.ए. सहित) में मास्टर तथा 40 विषयों में डॉक्टर ऑफ फिलॉसफी के स्नातकोत्तर कार्यक्रम संचालित करता है। दोनों कार्यक्रमों में 25% छात्रों का प्रवेश आई.सी.ए.आर. के माध्यम से भारत के विभिन्न राज्यों का प्रतिनिधित्व करते हुए होता है। द्वितीय सेमेस्टर 2023-24 के प्रारंभ में कुल 1349 छात्र नामांकित थे, जिनमें एम.एससी. में 649 तथा पीएच.डी. में 700 छात्र शामिल हैं।</p><p style="text-align:justify"><strong>संघटक महाविद्यालयों में नामांकित छात्र</strong></p><table><tbody><tr><td><div style="text-align:justify"><strong>महाविद्यालय</strong></div></td><td colspan="3"><div style="text-align:justify"><strong>एम.एससी. छात्र</strong></div></td><td colspan="3"><div style="text-align:justify"><strong>पीएच.डी.</strong></div></td></tr><tr><td><div style="text-align:justify"><br /></div></td><td><div style="text-align:justify"><strong>पुरुष</strong></div></td><td><div style="text-align:justify"><strong>महिला</strong></div></td><td><div style="text-align:justify"><strong>कुल</strong></div></td><td><div style="text-align:justify"><strong>पुरुष</strong></div></td><td><div style="text-align:justify"><strong>महिला</strong></div></td><td><div style="text-align:justify"><strong>कुल</strong></div></td></tr><tr><td><div style="text-align:justify">कृषि</div></td><td><div style="text-align:justify">176+92*=268</div></td><td><div style="text-align:justify">137+23*=160</div></td><td><div style="text-align:justify">268+137*=428</div></td><td><div style="text-align:justify">193</div></td><td><div style="text-align:justify">133</div></td><td><div style="text-align:justify">326</div></td></tr><tr><td><div style="text-align:justify">मूलभूत विज्ञान एवं मानविकी</div></td><td><div style="text-align:justify">28</div></td><td><div style="text-align:justify">73</div></td><td><div style="text-align:justify">97</div></td><td><div style="text-align:justify">57</div></td><td><div style="text-align:justify">192</div></td><td><div style="text-align:justify">249</div></td></tr><tr><td><div style="text-align:justify">कृषि अभियंत्रण एवं प्रौद्योगिकी</div></td><td><div style="text-align:justify">14</div></td><td><div style="text-align:justify">5</div></td><td><div style="text-align:justify">19</div></td><td><div style="text-align:justify">11</div></td><td><div style="text-align:justify">1</div></td><td><div style="text-align:justify">12</div></td></tr><tr><td><div style="text-align:justify">समुदाय विज्ञान</div></td><td><div style="text-align:justify">-</div></td><td><div style="text-align:justify">74</div></td><td><div style="text-align:justify">74</div></td><td><div style="text-align:justify">-</div></td><td><div style="text-align:justify">84</div></td><td><div style="text-align:justify">84</div></td></tr><tr><td><div style="text-align:justify">मत्स्य विज्ञान</div></td><td><div style="text-align:justify">12</div></td><td><div style="text-align:justify">1</div></td><td><div style="text-align:justify">13</div></td><td><div style="text-align:justify">9</div></td><td><div style="text-align:justify">6</div></td><td><div style="text-align:justify">15</div></td></tr><tr><td><div style="text-align:justify">बायोटेक.</div></td><td><div style="text-align:justify">6</div></td><td><div style="text-align:justify">12</div></td><td><div style="text-align:justify">18</div></td><td><div style="text-align:justify">5</div></td><td><div style="text-align:justify">9</div></td><td><div style="text-align:justify">14</div></td></tr><tr><td><div style="text-align:justify"><strong>कुल</strong></div></td><td><strong>328</strong></td><td><strong>325</strong></td><td><strong>649</strong></td><td><strong>275</strong></td><td><strong>425</strong></td><td><strong>700</strong></td></tr></tbody></table><p style="text-align:justify"><br /></p><p style="text-align:justify"><strong>पीजी डिप्लोमा</strong></p><p style="text-align:justify">रोजगारोन्मुख एवं/अथवा स्व-रोजगार के अवसर प्रदान करने तथा नए स्नातकों एवं विभिन्न संगठनों में कार्यरत ऐसे व्यक्तियों को प्रशिक्षण देने हेतु, जिन्हें तकनीकी ज्ञान की आवश्यकता है और जो नई सहस्राब्दी की चुनौतियों का सामना करना चाहते हैं, मूलभूत विज्ञान एवं मानविकी महाविद्यालय में अंग्रेजी में संचार कौशल तथा अंग्रेजी-हिंदी अनुवाद, एवं कृषि महाविद्यालय में कृषि एवं पर्यावरण में सुदूर संवेदन तथा जी.आई.एस. अनुप्रयोगों में स्नातकोत्तर डिप्लोमा पाठ्यक्रम प्रतिवर्ष संचालित किए जाते हैं।<strong><br /><br />विश्वविद्यालय वृत्ति / मेरिट वृत्ति</strong></p><p style="text-align:justify"><strong>मास्टर कार्यक्रम के लिए:</strong>&nbsp;</p><p style="text-align:justify">(a)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; मास्टर कार्यक्रम में नामांकित छात्र (एम.बी.ए., एम.एससी.-एफ.एस.टी., एम.बी.बी. एवं बायो-इंफॉर्मेटिक्स को छोड़कर) जो प्रवेश के समय प्रथम सेमेस्टर के लिए 7.0/10.00 ओ.जी.पी.ए. रखता हो तथा तत्पश्चात् 7.5/10.00 ओ.जी.पी.ए. बनाए रखे / प्राप्त करे, उसे रु. 6000 प्रति माह की मेरिट वृत्ति दी जाएगी, बशर्ते कि वह खेल पुरस्कारों के अतिरिक्त किसी अन्य स्रोत से ड्यूटी वेतन / मौद्रिक सहायता प्राप्त न कर रहा हो।</p><p style="text-align:justify">(b)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; गैर-सेवारत छात्रों (एम.बी.ए., एम.एससी.-एफ.एस.टी., एम.बी.बी. एवं बायो-इंफॉर्मेटिक्स को छोड़कर) के लिए रु. 3000 प्रति छात्र प्रति माह की वृत्ति, जो मेरिट वृत्ति अथवा विश्वविद्यालय / अन्य सरकारी या गैर-सरकारी एजेंसी से कोई अन्य मौद्रिक सहायता / ड्यूटी वेतन प्राप्त नहीं कर रहे हों।</p><p style="text-align:justify">(c)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; एम.बी.ए., एम.एससी.-एफ.एस.टी., एम.बी.बी. एवं बायो-इंफॉर्मेटिक्स में नामांकित 10% छात्रों को ओ.जी.पी.ए. संबंधी शर्तों की पूर्ति पर रु. 6000 प्रति माह की मेरिट वृत्ति तथा रु. 3000 प्रति माह की वृत्ति।</p><p style="text-align:justify"><strong>पीएच.डी. कार्यक्रम के लिए :</strong>&nbsp;</p><p style="text-align:justify">(a)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ऐसे गैर-सेवारत छात्रों के लिए रु. 10000/- प्रति माह की मेरिट वृत्ति, जो प्रवेश के समय 10-पॉइंट स्केल पर न्यूनतम ओ.जी.पी.ए. 7.5 रखते हों, अथवा तत्पश्चात् प्राप्त करें और बनाए रखें।</p><p style="text-align:justify">(b)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; गैर-सेवारत छात्र (एम.बी.बी. को छोड़कर) के लिए रु. 5000/- प्रति छात्र प्रति माह की वृत्ति, जो इस विश्वविद्यालय अथवा अन्य सरकारी या गैर-सरकारी एजेंसियों से कोई फेलोशिप, मेरिट वृत्ति अथवा मौद्रिक सहायता / ड्यूटी वेतन प्राप्त न कर रहे हों।</p><p style="text-align:justify">मेरिट वृत्ति / वृत्ति क्रमशः मास्टर एवं पीएच.डी. कार्यक्रम में प्रवेश की तिथि से दो एवं तीन शैक्षणिक वर्षों के लिए दी जाती है, बशर्ते निर्धारित शर्तों की पूर्ति हो।</p><p style="text-align:justify"><strong>अनुसूचित जाति श्रेणी के स्नातकोत्तर छात्रों के लिए विशेष प्रावधान किया गया है, जिसमें भविष्य के प्रमुख क्षेत्रों तथा विभिन्न क्षेत्रों में नए शोध उपलब्धियों हेतु उन्हें उन्नत करने के लिए सेमिनार / सम्मेलनों में भाग लेने हेतु वित्तीय सहायता प्रदान की जाती है।</strong></p><p style="text-align:justify"><strong>अन्य फेलोशिप</strong></p><p style="text-align:justify">छात्र आई.सी.ए.आर., सी.एस.आई.आर. एवं यू.जी.सी. द्वारा प्रस्तावित जे.आर.एफ. / एस.आर.एफ. के लिए भी प्रतिस्पर्धा करते हैं। इन फेलोशिप की राशि आई.सी.ए.आर. से एम.एससी. के लिए रु. 12640/- प्रति माह (पीजी छात्रवृत्ति) से पीएच.डी. छात्रों के लिए रु. 37000/- प्रति माह (जे.आर.एफ./एस.आर.एफ.) तक; रु. 31,000/- प्रति माह (2 वर्ष के लिए) से रु. 35000/- प्रति माह (तृतीय वर्ष के लिए) तक है। आई.सी.ए.आर.-एन.टी.एस. भी एम.एससी. आई.सी.ए.आर. छात्रों को रु. 5000/- की दर से प्रदान की जाती है। यू.जी.सी. से राष्ट्रीय फेलोशिप (केवल अनुसूचित जाति एवं ओ.बी.सी. छात्रों के लिए) भी प्रदान की जाती है। हरियाणा राज्य विज्ञान एवं प्रौद्योगिकी परिषद, हरियाणा सरकार, भी पीएच.डी. छात्रों के लिए जे.आर.एफ. (प्रथम दो वर्ष रु. 18,000/- प्रति माह तथा तृतीय वर्ष से रु. 21,000/- प्रति माह) प्रदान करती है। भारत सरकार के स्वास्थ्य एवं अनुसंधान विभाग द्वारा प्रस्तावित आई.सी.एम.आर. फेलोशिप रु. 31000/- प्रति माह है।</p><p style="text-align:justify"><strong>स्वर्ण पदक / पुरस्कार</strong></p><p style="text-align:justify">स्वर्ण पदक एवं अन्य पुरस्कार विश्वविद्यालय के दीक्षांत समारोह के समय वार्षिक रूप से उन छात्रों को प्रदान किए जाते हैं जो चयन मानदंडों के अनुसार उच्चतम अंक प्राप्त करते हैं तथा स्वर्ण पदक / पुरस्कारों के सामान्य नियमों की पूर्ति करते हैं।</p><p style="text-align:justify"><strong>एम.एससी. छात्रों के लिए पदक / पुरस्कार</strong></p><ul><li style="text-align:justify">&nbsp;<strong>डॉ. (श्रीमती) सरोज कश्यप स्वर्ण पदक:-&nbsp;</strong>गृह विज्ञान के किसी भी विषय में श्रेष्ठ शोध प्रबंध कार्य के लिए।</li><li style="text-align:justify">&nbsp;<strong>डॉ. एस.आर. व्यास स्वर्ण पदक:-</strong> सूक्ष्मजीव विज्ञान में उच्चतम ओ.जी.पी.ए. प्राप्त करने पर।</li><li style="text-align:justify"><strong>डॉ. राम धन सिंह स्वर्ण पदक:</strong>- पादप प्रजनन में उच्चतम ओ.जी.पी.ए. प्राप्त करने पर।</li><li style="text-align:justify"><strong>डॉ. एस.डी. निझावन स्वर्ण पदक&nbsp;</strong>:- मृदा विज्ञान में उच्चतम ओ.जी.पी.ए. प्राप्त करने पर।</li><li style="text-align:justify"><strong>डॉ. एस.बी. फोगाट स्मृति स्वर्ण पदक :</strong> सस्य विज्ञान में उच्चतम ओ.जी.पी.ए. प्राप्त करने पर।</li><li style="text-align:justify"><strong>विश्वविद्यालय स्तरीय स्वर्ण पदक :</strong> एम.एससी. छात्रों के लिए</li></ul><p style="text-align:justify"><strong>पीएच.डी. छात्रों के लिए पदक / पुरस्कार</strong></p><ul><li style="text-align:justify">&nbsp;<strong>डॉ. वी.डी. कश्यप स्वर्ण पदक:&nbsp;</strong>पीएच.डी. छात्रों में से श्रेष्ठ शोधकर्ता को प्रदान</li><li style="text-align:justify"><strong>रजत जयंती महिला स्वर्ण पदक:-&nbsp;</strong>श्रेष्ठ शोध प्रबंध के लिए, जो विश्वविद्यालय की राय में ग्रामीण हरियाणा के उत्थान में योगदान दे। <strong>&nbsp;</strong></li><li style="text-align:justify"><strong>डॉ. आर.एन. पाल स्मृति स्वर्ण पदक:-&nbsp;</strong>श्रेष्ठ पीएच.डी. शोध प्रबंध के लिए।</li><li style="text-align:justify"><strong>डॉ. सविता सिंगल स्वर्ण पदक :</strong> हरियाणा में ग्रामीण विकास पर श्रेष्ठ पीएच.डी. (गृह विज्ञान) शोध प्रबंध के लिए।</li><li style="text-align:justify"><strong>प्रो. रतन लाल स्वर्ण पदक :</strong> मृदा विज्ञान विभाग के पीएच.डी. छात्रों में से श्रेष्ठ शोधकर्ता के लिए।</li><li style="text-align:justify"><strong>सरदार पटेल पुरस्कार (पीएच.डी. छात्र) :&nbsp;</strong>शैक्षणिक प्रदर्शन, प्रकाशन, पेटेंट, सह-पाठ्यक्रम गतिविधियाँ एवं व्यवहार आदि में श्रेष्ठ प्रदर्शन वाले पीएच.डी. छात्र के लिए।</li><li style="text-align:justify"><strong>विश्वविद्यालय स्तरीय स्वर्ण पदक :</strong> पीएच.डी. छात्रों के लिए</li></ul><p style="text-align:justify"><span style="font-size:24px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>विदेशी छात्र</strong></span></p><p style="text-align:justify"><strong>अंतरराष्ट्रीय मामले प्रकोष्ठ</strong></p><p style="text-align:justify"><span>देश के अग्रणी कृषि विश्वविद्यालयों में से एक होने के नाते, वियतनाम, नाइजीरिया, अफगानिस्तान, म्यांमार, तंजानिया, नेपाल, मलावी, लाइबेरिया, बोत्सवाना, केन्या, सूडान, श्रीलंका आदि देशों के विदेशी छात्र विभिन्न विषयों में एम.एससी. / पीएच.डी. कार्यक्रमों के लिए आते रहते हैं। विदेशी छात्रों की जानकारी हेतु विभिन्न दूतावासों को नियमित रूप से विवरणिका भेजी जाती है ताकि वे सी.सी.एस.एच.ए.यू., हिसार के विभिन्न कार्यक्रमों में प्रवेश ले सकें।</span></p><p style="text-align:justify"><span>सी.सी.एस. एच.ए.यू., हिसार का वेस्टर्न सिडनी विश्वविद्यालय (डब्ल्यू.एस.यू., ऑस्ट्रेलिया) के साथ संयुक्त मास्टर ऑफ रिसर्च + पीएच.डी. गारंटीड एवं नॉन-गारंटीड छात्रवृत्ति कार्यक्रम हेतु समझौता ज्ञापन है। वर्ष 2021 में तीन पीएच.डी. छात्र कीट विज्ञान, मृदा विज्ञान तथा खाद्य एवं पोषण विषयों में वेस्टर्न सिडनी विश्वविद्यालय, ऑस्ट्रेलिया में द्वितीयक डिग्री कार्यक्रम कर रहे थे। वर्ष 2019 से प्रतिवर्ष सी.सी.एस.एच.ए.यू. के दो स्नातक छात्र टोक्यो कृषि विश्वविद्यालय, टोक्यो, जापान में अंतरराष्ट्रीय छात्र सम्मेलन में भाग लेते हैं।</span></p><p><span>मिशिगन स्टेट विश्वविद्यालय, यू.एस.ए. की यू.एस.ए.आई.डी. प्रायोजित जी.आर.ए.आई.एन. परियोजना के अंतर्गत ग्यारह एम.एससी. छात्रों ने सस्य विज्ञान, उद्यान विज्ञान-फल विज्ञान, आनुवंशिकी एवं पादप प्रजनन, कृषि अर्थशास्त्र, विस्तार शिक्षा, मृदा विज्ञान आदि विषयों में उपाधि पूर्ण की तथा तीन छात्र सस्य विज्ञान, आनुवंशिकी एवं पादप प्रजनन तथा पादप रोग विज्ञान विषयों में पीएच.डी. कर रहे हैं।</span></p><p style="text-align:justify"><strong>संपर्क व्यक्ति</strong></p><p style="text-align:justify"><span>डॉ. (श्रीमती) आशा कवात्रा</span><br />प्रभारी, अंतरराष्ट्रीय मामले प्रकोष्ठ<br />दूरभाष:<br />कार्यालय : +91-1662-255323<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9416544261(M)<br />ई-मेल : International_Cell@hau.ac.in</p><p style="text-align:justify">डॉ. अनुज राणा<br />समन्वयक, अंतरराष्ट्रीय मामले प्रकोष्ठ<br />दूरभाष :<br />कार्यालय : +91-1662-255323<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9971576603(M)<br />ई-मेल : International_cell@hau.ac.in</p><p style="text-align:justify"><br /></p><p style="text-align:justify"><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/XsjUP3AiuYQ8ol5wpgSfawpGceAB825JFCCWvXcp.pdf"><strong>पीजी उपाधि प्रदान करने हेतु न्यूनतम मानक एवं प्रक्रिया</strong></a></p><p style="text-align:justify"><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/JBFJcp5fYAoXQtYAzIATBGfaxlIUYb2e1SpWZZCQ.pdf"><strong>उत्तीर्ण एम.एससी. एवं पीएच.डी. छात्र (2011-12 से 2022-23)</strong></a></p><p style="text-align:justify"><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/Fyt0mQyEcsoO8VLH6mjgksjyXPJ12ts43oNnXeyl.pdf"><strong>विदेशी छात्रों की सूची (2022-2023)</strong></a></p><p style="text-align:justify"><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/FZW7ci8AmFxky9reikkh10lczvBYHbypW4myqXnM.pdf">विदेशी छात्रों हेतु निर्देश</a></strong></p><p style="text-align:justify"><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/SYgF4zlWTFFbRldsQJJRmB9JGuhrpRlqnXveHPYu.pdf"><strong>गत पाँच वर्षों में फेलोशिप प्राप्त छात्रों की संख्या</strong></a></p><p style="text-align:justify"><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/wddgxY0xdQsHATkTFMr3e66RpqOjsiZsbDb11098.pdf">बी.एस.एम.ए. क्रियान्वयन 2023-24</a></strong></p>`;

const PG_PROFORMA_HI = `<p><strong>पीजी प्रपत्र</strong></p>
<table class="w-full border-collapse text-sm">
<tbody>
<tr>
<td class="align-top pr-3 font-semibold">1.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/Hg1ChoXQUdWyXmQ1WKkw9WxF1cJc3AxcKkHJbP2N.doc" target="_blank" rel="noopener noreferrer">PG-1.doc</a></strong> (सलाहकार समिति की सिफारिशें)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">2.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/Ip1UZK1i7jyQrCpKCnn6CCXe2aKyEtULFB68ugPZ.doc" target="_blank" rel="noopener noreferrer">PG-2.doc</a></strong> (कार्य कार्यक्रम)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">3.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/HndmRlymGd3sUYWRNmyKnJ3nMsyfEb0yx0WKFikp.doc" target="_blank" rel="noopener noreferrer">PG-3.doc</a></strong> (सारांश प्रस्तुति)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">4.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/SbGAg3ZbthZfOsYu95DJHREdwBXWZY9PtYla7KvG.pdf" target="_blank" rel="noopener noreferrer">PG-4.pdf</a></strong> (प्रारंभिक लिखित परीक्षा)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">5.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/Uk66lgl9WhCvFOZ8hrLbU4lofXxEEQbF0jSEuITE.doc" target="_blank" rel="noopener noreferrer">PG-5A.doc</a></strong> (प्रारंभिक मौखिक परीक्षा पैनल)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">6.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/71ComFzqH6s3lzTCA8ZW5LltBl5H5x9ttQRYvHMK.pdf" target="_blank" rel="noopener noreferrer">PG-5B</a></strong> (बाह्य परीक्षक पैनल)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">7.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/J9u8UW7F2O2WhsXSlLXRy2iCT7Ah080Rqu1UhKZx.doc" target="_blank" rel="noopener noreferrer">PG-6.doc</a></strong> (प्रारंभिक परीक्षा प्रमाणपत्र — पीएच.डी.)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">8.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/5yzk1fW9xjbsNDGrTEA0rQS66u3Szd9yCyc7xp7J.doc" target="_blank" rel="noopener noreferrer">PG-7.doc</a></strong> (अंतिम परीक्षा हेतु प्रारंभिक परीक्षा रिपोर्ट)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">9.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/nOYVcp1FLMaM2beECscPQLFbIETAYZl27kVPVlS8.doc" target="_blank" rel="noopener noreferrer">PG-8.doc</a></strong> (शोध प्रबंध सेमिनार प्रमाणपत्र)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">10.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/BcFjtKLSZotTneVBA7hQQ2jYQCnLGRdIUXJ3R5wi.doc" target="_blank" rel="noopener noreferrer">PG-9.doc</a></strong> (शोध प्रबंध प्रस्तुति प्रपत्र)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">11.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/octfteOHScfTCbwDJzpWd1z77GWub3rPxsW2JRqB.doc" target="_blank" rel="noopener noreferrer">PG-10.doc</a></strong> (मौखिक परीक्षा प्रमाणपत्र)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">12.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/Px0T4LWWZ48utLeafl5yWH7RtT6iCAFe8oSdCQ5n.doc" target="_blank" rel="noopener noreferrer">I-Grade.doc</a></strong> (आई-ग्रेड)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">13.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/UdUrfIol8arMZunMCdPA6ynKBOAYFHiD7qtfWy6v.doc" target="_blank" rel="noopener noreferrer">Instructor Report.doc</a></strong> (अनुदेशक रिपोर्ट)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">14.</td>
<td><strong><a class="fr-file" href="https://hau.ac.in/storage/app/uploads/cwxdS3FmMXbBWNxxOlsCJ8fBWUEByBNQqvO0bBs2.rtf" target="_blank" rel="noopener noreferrer">REMUNERATION TO EXAMINERS.doc</a></strong> (परीक्षकों का पारिश्रमिक)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">15.</td>
<td><strong><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages/pg-studies/proforma/skr5HYvBgCxMzxtg5pDwkrBOz7c6Bj5GhyUjoOnX.pdf" target="_blank" rel="noopener noreferrer">Plagiarism Verification Certificate.pdf</a></strong> (साहित्यिक चोरी सत्यापन प्रमाणपत्र)</td>
</tr>
<tr>
<td class="align-top pr-3 font-semibold">16.</td>
<td><strong><a href="/pages/pg-studies/seminar-registration">आर.ए. / एस.आर.एफ. / जे.आर.एफ. / एम.टेक. / पीएच.डी. छात्रों हेतु सेमिनार / कार्यशाला आदि में भाग लेने के लिए ऑनलाइन आवेदन करें</a></strong></td>
</tr>
</tbody>
</table>`;

const PAGES = [
  {
    slug: "post-graduate-studies",
    title_hi: "स्नातकोत्तर अध्ययन",
    content_hi: POST_GRADUATE_STUDIES_HI,
  },
  {
    slug: "pg-proforma",
    title_hi: "पीजी प्रपत्र",
    content_hi: PG_PROFORMA_HI,
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  for (const page of PAGES) {
    const { data, error } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_hi")
      .eq("slug", page.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      console.log(`MISSING ${page.slug}`);
      continue;
    }
    console.log(`  ${page.slug} → hi len ${page.content_hi.length}`);
    if (!APPLY) continue;
    const { error: upErr } = await supabase
      .from("ccshau_pages")
      .update({
        content_hi: page.content_hi,
        title_hi: page.title_hi,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (upErr) throw new Error(`${page.slug}: ${upErr.message}`);
    console.log(`  OK ${page.slug}`);
  }
  if (!APPLY) console.log("Pass --apply to update content_hi.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
