#!/usr/bin/env node
/**
 * Translate Research Funding Agencies sidebar body to curated Hindi
 * (org names, roles, place labels — keep emails/URLs/phones intact).
 *
 *   node scripts/ops/apply-mpac-funding-hindi.mjs
 *   node scripts/ops/apply-mpac-funding-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SIDEBAR_ID = "c90c9d71-60f9-41cf-9ecc-48c853f88054";

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

/** Longest-first phrase map (English → Hindi). */
const PHRASES = [
  ["List of Research Funding Agencies", "अनुसंधान वित्त पोषण एजेंसियों की सूची"],
  ["International Federation for Women in Agriculture", "कृषि में महिलाओं हेतु अंतरराष्ट्रीय संघ"],
  ["United Nations Educational, Scientific and Cultural Organisation", "संयुक्त राष्ट्र शैक्षिक, वैज्ञानिक एवं सांस्कृतिक संगठन (यूनेस्को)"],
  ["Council for Advancement of People's Action and Rural Technology", "जन कार्रवाई एवं ग्रामीण प्रौद्योगिकी संवर्धन परिषद"],
  ["Council for Advancement of People&rsquo;s Action and Rural Technology", "जन कार्रवाई एवं ग्रामीण प्रौद्योगिकी संवर्धन परिषद"],
  ["National Oilseeds and Vegetable Oils Development Board", "राष्ट्रीय तिलहन एवं वनस्पति तेल विकास बोर्ड"],
  ["All India Rice Exporters' Association ( Regd)", "अखिल भारतीय चावल निर्यातक संघ (पंजीकृत)"],
  ["All India Rice Exporters&rsquo; Association ( Regd)", "अखिल भारतीय चावल निर्यातक संघ (पंजीकृत)"],
  ["Agricultural and Processed Food Products", "कृषि एवं प्रसंस्कृत खाद्य उत्पाद"],
  ["Export Development Authority ( Ministry of Commerce, Govt. of India)", "निर्यात विकास प्राधिकरण (वाणिज्य मंत्रालय, भारत सरकार)"],
  ["Export Dev. Authority of India", "भारत निर्यात विकास प्राधिकरण"],
  ["National Information System for Sci. & Technology  ( NISSAT)", "विज्ञान एवं प्रौद्योगिकी राष्ट्रीय सूचना प्रणाली (एन.आई.एस.एस.ए.टी.)"],
  ["National Information System for Sci.& Technology", "विज्ञान एवं प्रौद्योगिकी राष्ट्रीय सूचना प्रणाली"],
  ["National Sci. & Technology Management Information System", "राष्ट्रीय विज्ञान एवं प्रौद्योगिकी प्रबंधन सूचना प्रणाली"],
  ["Science and Technology Application for Rural Development (STARD)", "ग्रामीण विकास हेतु विज्ञान एवं प्रौद्योगिकी अनुप्रयोग (एस.टी.ए.आर.डी.)"],
  ["Science & Technology for Weaker Sections (STAWS)", "कमजोर वर्गों हेतु विज्ञान एवं प्रौद्योगिकी (एस.टी.ए.डब्ल्यू.एस.)"],
  ["Science & Technology Communication & Popularisation Programme", "विज्ञान एवं प्रौद्योगिकी संचार एवं लोकप्रियकरण कार्यक्रम"],
  ["Science & Technology indicator and Manpower Studies", "विज्ञान एवं प्रौद्योगिकी संकेतक तथा जनशक्ति अध्ययन"],
  ["Consumer Protection through Science & Technology", "विज्ञान एवं प्रौद्योगिकी के माध्यम से उपभोक्ता संरक्षण"],
  ["Scheme for modernization and renewal of obsolescence  in technical education", "तकनीकी शिक्षा में आधुनिकीकरण एवं अप्रचलन नवीकरण योजना"],
  ["Scheme of  thrust area programme in technical education(TAPTEC)", "तकनीकी शिक्षा में प्रमुख क्षेत्र कार्यक्रम योजना (टी.ए.पी.टी.ई.सी.)"],
  ["Intensification  of Research in High Priority Areas", "उच्च प्राथमिकता क्षेत्रों में अनुसंधान का सघनिकरण"],
  ["Utilisation of Scientific Expertise of Retired Scientists", "सेवानिवृत्त वैज्ञानिकों की वैज्ञानिक विशेषज्ञता का उपयोग"],
  ["Natural Resources Data Management System ( NRDMS)", "प्राकृतिक संसाधन डेटा प्रबंधन प्रणाली (एन.आर.डी.एम.एस.)"],
  ["Instrument Development Programme ( IDP)", "उपकरण विकास कार्यक्रम (आई.डी.पी.)"],
  ["R&D Medium Range Weather Forecasting", "मध्यम दूरी मौसम पूर्वानुमान अनुसंधान एवं विकास"],
  ["and Crop Weather Relationships", "तथा फसल-मौसम संबंध"],
  ["Opportunities for Young Scientists", "युवा वैज्ञानिकों हेतु अवसर"],
  ["Scheme for Young Scientific professionals", "युवा वैज्ञानिक पेशेवरों हेतु योजना"],
  ["Science and Society Related Programmes", "विज्ञान एवं समाज संबंधित कार्यक्रम"],
  ["Science and Engineering Research Council   ( SERC)", "विज्ञान एवं अभियांत्रिकी अनुसंधान परिषद (एस.ई.आर.सी.)"],
  ["Science and Engineering Research Council  ( SERC)", "विज्ञान एवं अभियांत्रिकी अनुसंधान परिषद (एस.ई.आर.सी.)"],
  ["Technology Absorption and Adaptation Scheme", "प्रौद्योगिकी अवशोषण एवं अनुकूलन योजना"],
  ["Special Component Plan", "विशेष घटक योजना"],
  ["Women Component Plan", "महिला घटक योजना"],
  ["Research Scheme Applied to River Valley Projects", "नदी घाटी परियोजनाओं पर अनुप्रयुक्त अनुसंधान योजना"],
  ["Research Scheme on Flood Control (RSFC)", "बाढ़ नियंत्रण अनुसंधान योजना (आर.एस.एफ.सी.)"],
  ["Research Scheme on Power ( RSOP)", "विद्युत अनुसंधान योजना (आर.एस.ओ.पी.)"],
  ["Indian Council of Agricultural Research ( ICAR)", "भारतीय कृषि अनुसंधान परिषद (आई.सी.ए.आर.)"],
  ["Indian Counicl of Agricultural Research", "भारतीय कृषि अनुसंधान परिषद"],
  ["Indian Council of Medical Research", "भारतीय आयुर्विज्ञान अनुसंधान परिषद"],
  ["Indian Council of Social Science Research( ICSSR)", "भारतीय सामाजिक विज्ञान अनुसंधान परिषद (आई.सी.एस.एस.आर.)"],
  ["Indian Council of Social Science Research( ICSSR", "भारतीय सामाजिक विज्ञान अनुसंधान परिषद (आई.सी.एस.एस.आर."],
  ["Indian National Science Academy ( INSA)", "भारतीय राष्ट्रीय विज्ञान अकादमी (आई.एन.एस.ए.)"],
  ["Indian National Science Academy", "भारतीय राष्ट्रीय विज्ञान अकादमी"],
  ["National Academy of Agricultural Sciences", "राष्ट्रीय कृषि विज्ञान अकादमी"],
  ["Council of Scientific and Industrial Research (CSIR)", "वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद (सी.एस.आई.आर.)"],
  ["Council of Scientific and Industrial Research(CSIR)", "वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद (सी.एस.आई.आर.)"],
  ["Council of Scientific Industrial Research", "वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद"],
  ["Council of Scientific and Industrial Research", "वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद"],
  ["Defence  Research and Development Organisation( DRDO)", "रक्षा अनुसंधान एवं विकास संगठन (डी.आर.डी.ओ.)"],
  ["Defence R&D Organisation", "रक्षा अनुसंधान एवं विकास संगठन"],
  ["University Grants Commission( UGC)", "विश्वविद्यालय अनुदान आयोग (यू.जी.सी.)"],
  ["University Grants Commission", "विश्वविद्यालय अनुदान आयोग"],
  ["All Indian Council for Technical Education", "अखिल भारतीय तकनीकी शिक्षा परिषद"],
  ["Central Board of Irrgation and Power", "केंद्रीय सिंचाई एवं विद्युत बोर्ड"],
  ["Ministry of Statistics and Programme Implementation", "सांख्यिकी एवं कार्यक्रम कार्यान्वयन मंत्रालय"],
  ["Ministry of Statistics and Prorgrammes Implementation", "सांख्यिकी एवं कार्यक्रम कार्यान्वयन मंत्रालय"],
  ["Haryana State Council for Science & Technology", "हरियाणा राज्य विज्ञान एवं प्रौद्योगिकी परिषद"],
  ["Rajiv Gandhi Foundation", "राजीव गांधी फाउंडेशन"],
  ["Indian Council for Child Welfare", "भारतीय बाल कल्याण परिषद"],
  ["National Council for Economic Research and Training", "राष्ट्रीय आर्थिक अनुसंधान एवं प्रशिक्षण परिषद"],
  ["Agricultural  Produce Cess Fund", "कृषि उत्पाद उपकर निधि"],
  ["Agricultural  Produce Cess Fund", "कृषि उत्पाद उपकर निधि"],
  ["Ministry of Food & Civil Supplies", "खाद्य एवं नागरिक आपूर्ति मंत्रालय"],
  ["Consumer Affairs & Public Distribution", "उपभोक्ता मामले एवं सार्वजनिक वितरण"],
  ["Women and Child Walfare,Haryana", "महिला एवं बाल कल्याण, हरियाणा"],
  ["Directorate of Women and Child Welfare", "महिला एवं बाल कल्याण निदेशालय"],
  ["Haryana Commission for Women", "हरियाणा महिला आयोग"],
  ["Directorate of  Extension (Training )", "विस्तार निदेशालय (प्रशिक्षण)"],
  ["Directorate of Extension", "विस्तार निदेशालय"],
  ["Directorate of Rice Research", "चावल अनुसंधान निदेशालय"],
  ["Directorate of Maize Research", "मक्का अनुसंधान निदेशालय"],
  ["National Horticulture Board", "राष्ट्रीय बागवानी बोर्ड"],
  ["National Dairy Development Board", "राष्ट्रीय डेयरी विकास बोर्ड"],
  ["Commission for   Scientific and Technical Terminology", "वैज्ञानिक एवं तकनीकी शब्दावली आयोग"],
  ["Commission for  Scientific and Technical Terminology", "वैज्ञानिक एवं तकनीकी शब्दावली आयोग"],
  ["Indian National Committee on Irrigation & Drainage (INCID)", "भारतीय राष्ट्रीय सिंचाई एवं जल निकासी समिति (आई.एन.सी.आई.डी.)"],
  ["Indian National Committee on Irrigation & Drainage", "भारतीय राष्ट्रीय सिंचाई एवं जल निकासी समिति"],
  ["Ministry of Environment & Forests", "पर्यावरण एवं वन मंत्रालय"],
  ["Ministry of Environment and Forests", "पर्यावरण एवं वन मंत्रालय"],
  ["Ministry of Health & Family Welfare", "स्वास्थ्य एवं परिवार कल्याण मंत्रालय"],
  ["Ministry of Human Resource Development", "मानव संसाधन विकास मंत्रालय"],
  ["Ministry of Civil Supplies", "नागरिक आपूर्ति मंत्रालय"],
  ["Ministry of Agriculture", "कृषि मंत्रालय"],
  ["Ministry of Welfare", "कल्याण मंत्रालय"],
  ["Ministry of Defence", "रक्षा मंत्रालय"],
  ["Ministry of Commerce", "वाणिज्य मंत्रालय"],
  ["Department of Science and Technology (DST)", "विज्ञान और प्रौद्योगिकी विभाग (डी.एस.टी.)"],
  ["Department of Science and Technology", "विज्ञान और प्रौद्योगिकी विभाग"],
  ["Department of Science & Technology", "विज्ञान और प्रौद्योगिकी विभाग"],
  ["Dept. of Sci. & Technology", "विज्ञान और प्रौद्योगिकी विभाग"],
  ["Depat. Of Sci. & Technology", "विज्ञान और प्रौद्योगिकी विभाग"],
  ["Department of Sci. & Technology", "विज्ञान और प्रौद्योगिकी विभाग"],
  ["Department of Atomic Energy (DAE)", "परमाणु ऊर्जा विभाग (डी.ए.ई.)"],
  ["Department of Atomic Energy", "परमाणु ऊर्जा विभाग"],
  ["Department of Biotechnology ( DBT)", "जैव प्रौद्योगिकी विभाग (डी.बी.टी.)"],
  ["Department  Biotechnology", "जैव प्रौद्योगिकी विभाग"],
  ["Department of Education ( DOEd)", "शिक्षा विभाग (डी.ओ.ई.डी.)"],
  ["Department of Education", "शिक्षा विभाग"],
  ["Department of Electronics (DOE)", "इलेक्ट्रॉनिक्स विभाग (डी.ओ.ई.)"],
  ["Dept. of Electronics", "इलेक्ट्रॉनिक्स विभाग"],
  ["Department of Food Processing  Industries", "खाद्य प्रसंस्करण उद्योग विभाग"],
  ["Department of Food Processing Industries", "खाद्य प्रसंस्करण उद्योग विभाग"],
  ["Department of Non Conventional Energy Sources ( DNES)", "गैर-पारंपरिक ऊर्जा स्रोत विभाग (डी.एन.ई.एस.)"],
  ["Department of Non Conventional Energy Sources", "गैर-पारंपरिक ऊर्जा स्रोत विभाग"],
  ["Department of Scientific & Industrial Research", "वैज्ञानिक एवं औद्योगिक अनुसंधान विभाग"],
  ["Department of Scientific & Inds. Research", "वैज्ञानिक एवं औद्योगिक अनुसंधान विभाग"],
  ["Department of Space (DOS)", "अंतरिक्ष विभाग (डी.ओ.एस.)"],
  ["Deptt. of Animal Husbandry", "पशुपालन विभाग"],
  ["Dept. of Animal Husbandry & Dairy", "पशुपालन एवं डेयरी विभाग"],
  ["Deptt. of Agril. & Cooperation", "कृषि एवं सहयोग विभाग"],
  ["Agriculture Department", "कृषि विभाग"],
  ["Voluntary Organisation for Health and Family Welfare", "स्वास्थ्य एवं परिवार कल्याण हेतु स्वैच्छिक संगठन"],
  ["Forests Research Institute", "वन अनुसंधान संस्थान"],
  ["Forest Research Institute", "वन अनुसंधान संस्थान"],
  ["Technology Development Council", "प्रौद्योगिकी विकास परिषद"],
  ["SERC Secretariat", "एस.ई.आर.सी. सचिवालय"],
  ["ISRO Headquarters", "इसरो मुख्यालय"],
  ["Punjab Wakaf Board", "पंजाब वक्फ बोर्ड"],
  ["Mewat Development Agency", "मेवात विकास एजेंसी"],
  ["Consumer Welfare Fund", "उपभोक्ता कल्याण निधि"],
  ["Committee Consumer Welfare Fund", "उपभोक्ता कल्याण निधि समिति"],
  ["Business Development", "व्यवसाय विकास"],
  ["Indian Organic Food", "भारतीय जैविक खाद्य"],
  ["Housing Board Colony", "आवास बोर्ड कॉलोनी"],
  ["Industrial Area", "औद्योगिक क्षेत्र"],
  ["Institutional Area", "संस्थागत क्षेत्र"],
  ["Community Centre", "सामुदायिक केंद्र"],
  ["Sports Complex", "खेल परिसर"],
  ["Third World Network of Scientific Organizations", "वैज्ञानिक संगठनों का तीसरा विश्व नेटवर्क"],
  ["Third World Network of Scientific organizations", "वैज्ञानिक संगठनों का तीसरा विश्व नेटवर्क"],
  ["Third World Academy of Sciences ( TWAS)", "तीसरा विश्व विज्ञान अकादमी (टी.डब्ल्यू.ए.एस.)"],
  ["Third World Academy of Sciences", "तीसरा विश्व विज्ञान अकादमी"],
  ["International Foundation for Sciences", "अंतरराष्ट्रीय विज्ञान फाउंडेशन"],
  ["International Foundation for Science", "अंतरराष्ट्रीय विज्ञान फाउंडेशन"],
  ["International Atomic Energy Agency", "अंतरराष्ट्रीय परमाणु ऊर्जा एजेंसी"],
  ["Animal Production & Health Division", "पशु उत्पादन एवं स्वास्थ्य प्रभाग"],
  ["International Rice Research Institute", "अंतरराष्ट्रीय चावल अनुसंधान संस्थान"],
  ["IRRI Office for India", "भारत हेतु आई.आर.आर.आई. कार्यालय"],
  ["CIMMYT Facilitator, Rice Wheat Consortium", "सिमिट सुविधाकर्ता, चावल-गेहूँ संघ"],
  ["CIMMYT  Office for India", "भारत हेतु सिमिट कार्यालय"],
  ["British Council The Facilitator, British Council", "ब्रिटिश काउंसिल सुविधाकर्ता, ब्रिटिश काउंसिल"],
  ["USDA Programme Officer", "यू.एस.डी.ए. कार्यक्रम अधिकारी"],
  ["US Embassy", "अमेरिकी दूतावास"],
  ["Head, Division of Agricultural Extension", "प्रमुख, कृषि विस्तार प्रभाग"],
  ["The Abdus Salam International  Centre for Theoretical Physics", "अब्दुस सलाम अंतरराष्ट्रीय सैद्धांतिक भौतिकी केंद्र"],
  ["TheAbdus Salam International  Centre for  Theoretical Physics", "अब्दुस सलाम अंतरराष्ट्रीय सैद्धांतिक भौतिकी केंद्र"],
  ["Abdus Salam International Centre for Theoretical Physics", "अब्दुस सलाम अंतरराष्ट्रीय सैद्धांतिक भौतिकी केंद्र"],
  ["Group Coordinator ( Research)", "समूह समन्वयक (अनुसंधान)"],
  ["Officer on Special Duty ( PI&M)", "विशेष कर्तव्य अधिकारी (पी.आई. एवं एम.)"],
  ["The Scientific Secretary ( BRNS)", "वैज्ञानिक सचिव (बी.आर.एन.एस.)"],
  ["The Scientific Secretary", "वैज्ञानिक सचिव"],
  ["The Deputy Education Adviser  (T)", "उप शिक्षा सलाहकार (टी)"],
  ["The Under-Secretary(VOP)", "अवर सचिव (वी.ओ.पी.)"],
  ["The Member Secretary", "सदस्य सचिव"],
  ["Member Secretary", "सदस्य सचिव"],
  ["The Managing Director", "प्रबंध निदेशक"],
  ["Managing Director", "प्रबंध निदेशक"],
  ["The Director General", "महानिदेशक"],
  ["Director General/Secretary", "महानिदेशक/सचिव"],
  ["Chief General Manager", "मुख्य महाप्रबंधक"],
  ["General Manager", "महाप्रबंधक"],
  ["The Manager", "प्रबंधक"],
  ["The Administrator", "प्रशासक"],
  ["The Chairman", "अध्यक्ष"],
  ["The Commissioner of Agriculture", "कृषि आयुक्त"],
  ["The Commisioner & Secretary Agriculture,Govt. of Haryana", "आयुक्त एवं सचिव कृषि, हरियाणा सरकार"],
  ["The Director of Agriculture, Haryana", "कृषि निदेशक, हरियाणा"],
  ["The Director", "निदेशक"],
  ["The Joint Adviser", "संयुक्त सलाहकार"],
  ["The Joint adviser", "संयुक्त सलाहकार"],
  ["Joint Director", "संयुक्त निदेशक"],
  ["Joint Commissioner", "संयुक्त आयुक्त"],
  ["Deputy Director Projects", "उप निदेशक परियोजनाएँ"],
  ["The Adviser & Member - Secretary", "सलाहकार एवं सदस्य-सचिव"],
  ["The Adviser", "सलाहकार"],
  ["The Head", "प्रमुख"],
  ["The Secretary", "सचिव"],
  ["Principal Scientist", "प्रधान वैज्ञानिक"],
  ["Project Coordinator", "परियोजना समन्वयक"],
  ["Scientist-in-Charge", "प्रभारी वैज्ञानिक"],
  ["Liaison Officer", "संपर्क अधिकारी"],
  ["Programme Officer", "कार्यक्रम अधिकारी"],
  ["Executive Director", "कार्यकारी निदेशक"],
  ["Chief Technical Advisor", "मुख्य तकनीकी सलाहकार"],
  ["Extramural Research Division", "बाह्य अनुसंधान प्रभाग"],
  ["Tech. Systems Division", "तकनीकी प्रणाली प्रभाग"],
  ["Instrument Dev. Division", "उपकरण विकास प्रभाग"],
  ["Sci.& Society Division", "विज्ञान एवं समाज प्रभाग"],
  ["Sci. & Society Division", "विज्ञान एवं समाज प्रभाग"],
  ["Govt. of India", "भारत सरकार"],
  ["Govt of India", "भारत सरकार"],
  ["Government of India", "भारत सरकार"],
  ["Govt. of Haryana", "हरियाणा सरकार"],
  ["GOI", "भारत सरकार"],
  ["New Delhi", "नई दिल्ली"],
  ["Paryavaran Bhawan", "पर्यावरण भवन"],
  ["Technology Bhawan", "प्रौद्योगिकी भवन"],
  ["Technology Bhavan", "प्रौद्योगिकी भवन"],
  ["Shastri Bhawan", "शास्त्री भवन"],
  ["Shastri Bhavan", "शास्त्री भवन"],
  ["Nirmal Bhawan", "निर्मल भवन"],
  ["Krishi Bhavan", "कृषि भवन"],
  ["Krishi Bhawan", "कृषि भवन"],
  ["Sena Bhavan", "सेना भवन"],
  ["Anusandhan Bhawan", "अनुसंधान भवन"],
  ["Jawahar Bhawan", "जवाहर भवन"],
  ["Sardar Patel Bhawan", "सरदार पटेल भवन"],
  ["Antariksh  Bhavan", "अंतरिक्ष भवन"],
  ["Krishi Vistar Bhavan", "कृषि विस्तार भवन"],
  ["Kandi Vikas Bhawan", "कांदी विकास भवन"],
  ["Panchsheel Bhawan", "पंचशील भवन"],
  ["August Karanti Bhawan", "अगस्त क्रांति भवन"],
  ["August Kranti Marg", "अगस्त क्रांति मार्ग"],
  ["Bahadur Shah Zafar Marg", "बहादुर शाह जफर मार्ग"],
  ["Bahadur Shah Zafar marg", "बहादुर शाह जफर मार्ग"],
  ["Dr.Rajender Prasad Road", "डॉ. राजेंद्र प्रसाद मार्ग"],
  ["Dr. Rajendra Prasad Road", "डॉ. राजेंद्र प्रसाद मार्ग"],
  ["Lodhi Road", "लोधी रोड"],
  ["Parliament Street", "संसद मार्ग"],
  ["Chanakyapuri", "चाणक्यपुरी"],
  ["Chankyapuri", "चाणक्यपुरी"],
  ["Ansari Nagar", "अंसारी नगर"],
  ["Hauz Khas", "हौज खास"],
  ["Dehradun", "देहरादून"],
  ["Chandigarh", "चंडीगढ़"],
  ["Panchkula", "पंचकूला"],
  ["Puanchkula", "पंचकूला"],
  ["Gurgaon", "गुरुग्राम"],
  ["Hyderabad", "हैदराबाद"],
  ["Mumbai", "मुंबई"],
  ["Bangalore", "बेंगलुरु"],
  ["Vadodara", "वडोदरा"],
  ["Stockholm", "स्टॉकहोम"],
  ["SWEDEN", "स्वीडन"],
  ["Sweden", "स्वीडन"],
  ["Vienna (Austria )", "वियना (ऑस्ट्रिया)"],
  ["Italy", "इटली"],
  ["Post Office New Forest", "डाकघर न्यू फॉरेस्ट"],
  ["CGO Complex", "सी.जी.ओ. कॉम्प्लेक्स"],
  ["Regional Office", "क्षेत्रीय कार्यालय"],
  ["Research and Development", "अनुसंधान एवं विकास"],
  ["International", "अंतरराष्ट्रीय"],
  ["Chairman", "अध्यक्ष"],
  ["( Retd.)", "(सेवानिवृत्त)"],
  ["Floor", "तल"],
  ["Sector", "सेक्टर"],
  ["District", "जिला"],
  ["Opposite", "के सामने"],
  ["Phone :", "दूरभाष :"],
  ["Phone:", "दूरभाष:"],
  ["E.mail :", "ई-मेल :"],
  ["E.mail.", "ई-मेल:"],
  ["e-mail:", "ई-मेल:"],
  ["-mail:", "ई-मेल:"],
  ["Web.", "वेब:"],
  ["Web:", "वेब:"],
  ["WEB:", "वेब:"],
  ["web:", "वेब:"],
  ["Fax :", "फैक्स :"],
  ["Fax:", "फैक्स:"],
  ["Tel:", "दूरभाष:"],
  ["Tel :", "दूरभाष :"],
  ["Extn.", "विस्तार"],
  ["extn.", "विस्तार"],
  ["EBPAX  No.", "ई.बी.पी.ए.एक्स. संख्या"],
  ["EPBAX No.", "ई.पी.बी.ए.एक्स. संख्या"],
  ["PBX :", "पी.बी.एक्स. :"],
  ["Telex.", "टेलेक्स:"],
  ["Telex:", "टेलेक्स:"],
  ["P.O. Box.", "डाक पेटी"],
  ["P.O. Box", "डाक पेटी"],
];

function translateFundingHtml(html) {
  // Protect mailto/http links and emails
  const saved = [];
  let out = html.replace(
    /(?:href|mailto)=["'][^"']+["']|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:https?:\/\/|www\.)[^\s<"']+/gi,
    (m) => {
      const i = saved.length;
      saved.push(m);
      return `@@KEEP${i}@@`;
    },
  );

  for (const [en, hi] of PHRASES) {
    if (!en) continue;
    out = out.split(en).join(hi);
  }

  // Restore protected tokens
  out = out.replace(/@@KEEP(\d+)@@/g, (_, n) => saved[Number(n)] ?? "");
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,content_en,content_hi")
    .eq("id", SIDEBAR_ID)
    .single();
  if (error) throw error;

  const content_hi = translateFundingHtml(data.content_en || "");
  const sample = content_hi.replace(/\s+/g, " ").slice(0, 350);
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log(`en ${data.content_en.length} → hi ${content_hi.length}`);
  console.log("preview:", sample);

  const stillEnglish = /Ministry of |Department of |The Secretary|New Delhi|Govt of India|Forest Research/.test(
    content_hi.replace(/@@KEEP/g, ""),
  );
  console.log("still has common EN phrases?", stillEnglish);

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error: upErr } = await sb
    .from("ccshau_page_sidebar_items")
    .update({
      content_hi,
      label_hi: "अनुसंधान वित्त पोषण एजेंसियों की सूची",
      updated_at: new Date().toISOString(),
    })
    .eq("id", SIDEBAR_ID);
  if (upErr) throw upErr;
  console.log("OK updated funding agencies content_hi");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
