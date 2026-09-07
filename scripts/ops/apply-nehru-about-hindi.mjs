#!/usr/bin/env node
/**
 * Curated Hindi for Nehru Library About pages + departments + key sidebars.
 *
 *   node scripts/ops/apply-nehru-about-hindi.mjs
 *   node scripts/ops/apply-nehru-about-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_ID = "eef2c97a-5afa-481c-9658-ce61928f2e69";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

const PHOTO =
  "https://hau.ac.in/storage/app/uploads/DwZ9cKKDRpte8fCQuf2zIzvYGHoseGESAzTEzPKZ.jpeg";

const HOME_CONTENT_HI = [
  `<p class="library-elibrary"><a href="https://ccshau.refread.com/#/home" target="_blank" rel="noopener noreferrer"><strong>सी.सी.एस. एच.ए.यू. ई-लाइब्रेरी</strong></a></p>`,
  `<div class="office-profile office-profile--wide library-officer">`,
  `<img src="${PHOTO}" alt="डॉ. राजीव कुमार पटेरिया, विश्वविद्यालय पुस्तकालयाध्यक्ष" />`,
  `<div>`,
  `<p><strong>डॉ. राजीव कुमार पटेरिया</strong></p>`,
  `<p>विश्वविद्यालय पुस्तकालयाध्यक्ष</p>`,
  `<p>नेहरू पुस्तकालय,<br />चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय<br />हिसार - 125 004, भारत</p>`,
  `<p>दूरभाष : 01662-284328, 255416</p>`,
  `<p>ई-मेल : <a href="mailto:librarianhau@gmail.com">librarianhau@gmail.com</a>; <a href="mailto:library@hau.ac.in">library@hau.ac.in</a></p>`,
  `</div></div>`,
  `<p style="text-align:justify">नेहरू पुस्तकालय कार्यात्मक संरचना, सौंदर्य एवं उत्कृष्टता का अनूठा संगम है। इसमें लगभग 6.36 लाख खंड पुस्तकों, पत्रिकाओं के जिल्दबद्ध खंडों तथा अन्य प्रलेखों का समृद्ध संग्रह है, जो हिसार तथा हरियाणा राज्य के अन्य भागों में स्थित विश्वविद्यालय के छात्रों, शिक्षकों, अनुसंधान विद्वानों, विस्तार विशेषज्ञों एवं अन्य कर्मचारियों की सूचनात्मक तथा बौद्धिक आवश्यकताओं की पूर्ति करता है। इस भव्य पुस्तकालय ने सामुदायिक विज्ञान महाविद्यालय, हिसार; कृषि महाविद्यालय, कौल; <span style="font-family:&quot;Times New Roman&quot;, Times, serif;font-size:18px;color:rgb(0, 0, 0)">कृषि महाविद्यालय, बावल,</span> परिसर विद्यालय, कृषि विज्ञान केंद्रों (के.वी.के.) तथा क्षेत्रीय अनुसंधान केंद्रों पर भी अपने संग्रह बनाए रखे हैं। नेहरू पुस्तकालय सूचना प्रौद्योगिकी की शक्ति का सदुपयोग कर उसे विभिन्न पुस्तकालय गतिविधियों में लागू करते हुए सूचना पुनर्प्राप्ति एवं प्रसार के महत्त्वपूर्ण कार्य को सफलतापूर्वक आगे बढ़ा रहा है।</p>`,
].join("\n");

const CONTACT_CONTENT_HI = `<table style="width:100%"><tbody><tr><td style="width:50%"><div style="text-align:center"><img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/MDIXAOEvjgjzPG93VUAHirK7IK6DUDqG9hXWzYy6.jpeg" style="width:411px;height:231.53px" class="fr-fic fr-dib" /></div><span style="color:rgb(0, 168, 133)"><strong> </strong></span><br /></td><td style="width:50%;vertical-align:top"><h4><strong>डॉ. राजीव कुमार पटेरिया</strong></h4><h4><strong>विश्वविद्यालय पुस्तकालयाध्यक्ष</strong><br /><strong>नेहरू पुस्तकालय,</strong><br /><strong>चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय</strong><strong><br />हिसार - 125 004, भारत<br /></strong><strong>दूरभाष : 01662-284328, 255416</strong><strong><br /></strong><strong>ई-मेल : librarianhau@gmail.com; library@hau.ac.in</strong></h4><div><span style="font-weight:700"><br /></span></div></td></tr></tbody></table><p style="text-align:center"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3484.6088098824293!2d75.70464111506033!3d29.14672666737314!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3913ccd1748d98cb%3A0xe25da5eb293c509c!2sNehru+Library+%5BH.A.U.%5D!5e0!3m2!1sen!2sin!4v1554092172045!5m2!1sen!2sin" width="800" height="400" frameborder="0" style="border:0" allowfullscreen></iframe></p>`;

/** Common phrase replacements (longest first) applied to content_en → content_hi */
const PHRASES = [
  ["Library Advisory Committee – a policy making body - decides the guidelines for smooth functioning of the Library. This Committee has Vice-Chancellor as its Chairman and University Librarian as its Member-Secretary. All the Deans/Directors, Registrar, Principal, College of Agriculture, Kaul and President of HAUTA are its ex-officio members while one HOD, one faculty member and one PG student from each College are nominated by the Vice-Chancellor for two academic years. The Vice-Chancellor prefers to hold the meetings of LAC in the Library Committee Room so that he and other Members may get an overview of  what  library  is/has    been  doing.",
    "पुस्तकालय सलाहकार समिति — एक नीति-निर्धारण निकाय — पुस्तकालय के सुचारु संचालन हेतु दिशानिर्देश तय करती है। इस समिति के अध्यक्ष कुलपति होते हैं तथा विश्वविद्यालय पुस्तकालयाध्यक्ष इसके सदस्य-सचिव होते हैं। सभी डीन/निदेशक, कुलसचिव, प्राचार्य, कृषि महाविद्यालय, कौल तथा हाउटा अध्यक्ष इसके पदेन सदस्य हैं, जबकि प्रत्येक महाविद्यालय से एक विभागाध्यक्ष, एक संकाय सदस्य एवं एक स्नातकोत्तर छात्र को कुलपति द्वारा दो शैक्षणिक वर्षों के लिए नामित किया जाता है। कुलपति पुस्तकालय समिति कक्ष में एल.ए.सी. की बैठकें आयोजित करना पसंद करते हैं, ताकि वे एवं अन्य सदस्य पुस्तकालय के कार्यों का समग्र अवलोकन कर सकें।"],
  ["The Library has a budget of Rs. 2.88 crore for collection development during 2024-25. Though the major share comes from the State Govt, ICAR provides substantial financial assistance for developmental activities such as modernization of library services, strengthening of collection development etc.",
    "संग्रह विकास हेतु वर्ष 2024-25 में पुस्तकालय का बजट 2.88 करोड़ रुपये है। यद्यपि प्रमुख अंश राज्य सरकार से आता है, तथापि आई.सी.ए.आर. पुस्तकालय सेवाओं के आधुनिकीकरण, संग्रह विकास को सुदृढ़ करने आदि विकासात्मक गतिविधियों हेतु पर्याप्त वित्तीय सहायता प्रदान करता है।"],
  ["Membership to this University Library is open to its teachers, scientists, extension specialists, non-teaching staff and student.  The teachers, scientists and extension specialists are entitled to borrow eight books; the students are privileged to borrow eight books - four from non-restricted collection and an equal number form Book Bank; while the non-teaching staff are entitled to borrow four books from non-restricted collection only. Besides, Members of Board of Management  of CCSHAU, scientists and Class I Gazetted Officers of the Govt. of Haryana/Govt. of India, if based at Hisar, Staff Correspondents, retired teachers/scientists and other employees of Class II rank and above of CCSHAU, if residing at Hisar, research scholars of other Universities, if based at Hisar, teachers of the local Colleges, and progressive farmers can also avail of library facilities with the permission of the University Librarian subject to certain conditions.",
    "इस विश्वविद्यालय पुस्तकालय की सदस्यता इसके शिक्षकों, वैज्ञानिकों, विस्तार विशेषज्ञों, गैर-शिक्षण कर्मचारियों एवं छात्रों के लिए खुली है। शिक्षक, वैज्ञानिक एवं विस्तार विशेषज्ञ आठ पुस्तकें उधार ले सकते हैं; छात्रों को आठ पुस्तकें — चार अप्रतिबंधित संग्रह से तथा समान संख्या बुक बैंक से — लेने का अधिकार है; जबकि गैर-शिक्षण कर्मचारी केवल अप्रतिबंधित संग्रह से चार पुस्तकें उधार ले सकते हैं। इसके अतिरिक्त, सी.सी.एस.एच.ए.यू. प्रबंधन बोर्ड के सदस्य, हरियाणा सरकार/भारत सरकार के वैज्ञानिक एवं श्रेणी-एक राजपत्रित अधिकारी (यदि हिसार में स्थित हों), स्टाफ संवाददाता, सेवानिवृत्त शिक्षक/वैज्ञानिक तथा सी.सी.एस.एच.ए.यू. के श्रेणी-दो एवं उससे ऊपर के अन्य कर्मचारी (यदि हिसार में निवास करते हों), अन्य विश्वविद्यालयों के अनुसंधान विद्वान (यदि हिसार में स्थित हों), स्थानीय महाविद्यालयों के शिक्षक तथा प्रगतिशील किसान भी विश्वविद्यालय पुस्तकालयाध्यक्ष की अनुमति से, कुछ शर्तों के अधीन, पुस्तकालय सुविधाओं का लाभ उठा सकते हैं।"],
  ["New technologies, interdisciplinary and multidisciplinary research, and non-print media have changed the very nature of the library's learning resources. Nehru Library possesses a very rich collection of 391626 vol. of books, bound journals and other reading material to cater to the informational and scholarly requirements of its patrons. In addition to its rich collections in its major areas of thrust like Agricultural Sciences, Agricultural Engineering, Animal Sciences, Home Science, Basic Sciences (Botany, Chemistry, Biochemistry, Genetics, Biotechnology, Fisheries, Microbiology, Sociology, and Zoology), Food Science and Technology, and Vety. Sciences, a large number of books of general interest are also available in the library. Presently library subscribes to 160 journals of which 27 are foreign journals and 133 are Indian journals. The Library has exchange relations with several foreign and Indian publishers. HAU Journal of Research, Haryana Veterinarian, Haryana Kheti, and Thesis Abstracts are official publications of this University which form the backbone of the exchange programme.",
    "नई प्रौद्योगिकियाँ, अंतःविषयी एवं बहुविषयी अनुसंधान तथा गैर-मुद्रित माध्यमों ने पुस्तकालय के अधिगम संसाधनों की प्रकृति बदल दी है। नेहरू पुस्तकालय में 3,91,626 खंड पुस्तकों, जिल्दबद्ध पत्रिकाओं एवं अन्य पठन सामग्री का समृद्ध संग्रह है, जो उपयोगकर्ताओं की सूचनात्मक एवं शैक्षणिक आवश्यकताओं की पूर्ति करता है। कृषि विज्ञान, कृषि अभियांत्रिकी, पशु विज्ञान, गृह विज्ञान, मूल विज्ञान (वनस्पति विज्ञान, रसायन विज्ञान, जैव रसायन, आनुवंशिकी, जैव प्रौद्योगिकी, मत्स्य पालन, सूक्ष्मजीव विज्ञान, समाजशास्त्र एवं प्राणि विज्ञान), खाद्य विज्ञान एवं प्रौद्योगिकी तथा पशु चिकित्सा विज्ञान जैसे प्रमुख क्षेत्रों के समृद्ध संग्रह के अतिरिक्त सामान्य रुचि की अनेक पुस्तकें भी उपलब्ध हैं। वर्तमान में पुस्तकालय 160 पत्रिकाओं की सदस्यता लेता है, जिनमें 27 विदेशी एवं 133 भारतीय पत्रिकाएँ हैं। पुस्तकालय के कई विदेशी एवं भारतीय प्रकाशकों से विनिमय संबंध हैं। एच.ए.यू. जर्नल ऑफ रिसर्च, हरियाणा वेटरिनरीयन, हरियाणा खेती तथा थीसिस एब्स्ट्रैक्ट्स इस विश्वविद्यालय के आधिकारिक प्रकाशन हैं, जो विनिमय कार्यक्रम की रीढ़ हैं।"],
  ["About 4,092 e-journals published by Annual Reviews Inc.-13, Bio One-164, CSIRO-5, Elsevier-Science Direct-420, J-Gate Fulltext-407, Nature Publishing Group-02, Oxford University Press-24, Springer-121, Taylor and Francis-177, Wiley- Agriculture and Horticulture- 42, Wiley- Fisheries and Aquaculture- 12, Wiley- Veterinary and Animal Science- 31 were made accessible online to user community through J-Gate Plus Service subscribed by the CeRA.",
    "सीईआरए द्वारा सदस्यता प्राप्त जे-गेट प्लस सेवा के माध्यम से उपयोगकर्ता समुदाय को लगभग 4,092 ई-पत्रिकाएँ ऑनलाइन उपलब्ध कराई गईं — एनुअल रिव्यूज इंक.-13, बायो वन-164, सी.एस.आई.आर.ओ.-5, एल्सवियर-साइंस डायरेक्ट-420, जे-गेट फुलटेक्स्ट-407, नेचर पब्लिशिंग ग्रुप-02, ऑक्सफोर्ड यूनिवर्सिटी प्रेस-24, स्प्रिंगर-121, टेलर एंड फ्रांसिस-177, विली-कृषि एवं उद्यानिकी-42, विली-मत्स्य एवं जलीय कृषि-12, विली-पशु चिकित्सा एवं पशु विज्ञान-31।"],
  ["The Library is headed by University Librarian with the statutory status of a University Officers. He is supported by 8 Asstt. Librarians, 21 Library Assistants, 15 Library Attendants, 1 Superintendent, 3 Office Assistants, 4 Clerks, 1 Personal Assistant, 1 Junior Scale Stenographer, 1 Steno-Typist, 1 Foreman (AC), 1 Mechanic/Operator (AC), 1 Bindery Foreman, 4 Book Binders, 3 Bindery Attendants, 6 Farashes, 5 Security Guards, 3 Messengers and 1 Safai Karamchari. Besides, sweeping of the library is outsourced. The entire library staff, who are expected to have skills in the use of modern technologies, are proficient in handling computer hardware and using library management and other softwares.",
    "पुस्तकालय का नेतृत्व विश्वविद्यालय अधिकारियों की वैधानिक स्थिति वाले विश्वविद्यालय पुस्तकालयाध्यक्ष करते हैं। उनके सहयोग में 8 सहायक पुस्तकालयाध्यक्ष, 21 पुस्तकालय सहायक, 15 पुस्तकालय परिचारक, 1 अधीक्षक, 3 कार्यालय सहायक, 4 लिपिक, 1 निजी सहायक, 1 कनिष्ठ वेतनमान आशुलिपिक, 1 स्टेनो-टाइपिस्ट, 1 फोरमैन (ए.सी.), 1 मैकेनिक/ऑपरेटर (ए.सी.), 1 बाइंडरी फोरमैन, 4 पुस्तक जिल्दसाज, 3 बाइंडरी परिचारक, 6 फराश, 5 सुरक्षा गार्ड, 3 संदेशवाहक एवं 1 सफाई कर्मचारी हैं। इसके अतिरिक्त पुस्तकालय की सफाई आउटसोर्स की गई है। संपूर्ण पुस्तकालय स्टाफ आधुनिक प्रौद्योगिकियों के उपयोग में दक्ष है तथा कंप्यूटर हार्डवेयर एवं पुस्तकालय प्रबंधन सॉफ्टवेयर आदि संभालने में निपुण है।"],
];

const SHORT_REPLACES = [
  ["Organogram", "संगठन संरचना"],
  ["Financial Status", "वित्तीय स्थिति"],
  ["Library Patrons", "पुस्तकालय उपयोगकर्ता"],
  ["Library Services", "पुस्तकालय सेवाएँ"],
  ["LIBRARY MODERNIZATION", "पुस्तकालय आधुनिकीकरण"],
  ["Human Resources", "मानव संसाधन"],
  ["Membership", "सदस्यता"],
  ["Vice-Chancellor", "कुलपति"],
  ["University Librarian", "विश्वविद्यालय पुस्तकालयाध्यक्ष"],
  ["Assistant Librarian", "सहायक पुस्तकालयाध्यक्ष"],
  ["Deputy Librarian", "उप पुस्तकालयाध्यक्ष"],
  ["Professor LIS", "प्रोफेसर (पुस्तकालय एवं सूचना विज्ञान)"],
  ["Incharge , Technical Section & Acquisition Section", "प्रभारी, तकनीकी अनुभाग एवं अधिग्रहण अनुभाग"],
  ["Incharge, Research Planning Development Division & ", "प्रभारी, अनुसंधान योजना विकास प्रभाग एवं "],
  ["Periodical Section", "आवधिक अनुभाग"],
  ["Readers' Services Division", "पाठक सेवा प्रभाग"],
  ["Qualifications:", "योग्यता:"],
  ["Email:", "ई-मेल:"],
  ["Faculty", "संकाय"],
  ["CCS Haryana Agricultural University", "चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय"],
  ["Nehru Library,", "नेहरू पुस्तकालय,"],
  ["Nehru Library", "नेहरू पुस्तकालय"],
  ["Hisar - 125 004, INDIA", "हिसार - 125 004, भारत"],
  ["Telephones :", "दूरभाष :"],
  ["E-mail :", "ई-मेल :"],
  ["Periodicals", "पत्रिकाएँ"],
  ["Theses", "शोध प्रबंध"],
  ["Books", "पुस्तकें"],
  ["CDs (Books)", "सी.डी. (पुस्तकें)"],
  ["CDs (Theses)", "सी.डी. (शोध प्रबंध)"],
  ["e-Books", "ई-पुस्तकें"],
  ["Total", "कुल"],
  ["Library Timings &amp; Holidays", "पुस्तकालय समय एवं अवकाश"],
  ["Library Timings & Holidays", "पुस्तकालय समय एवं अवकाश"],
  ["LIBRARY TIMINGS", "पुस्तकालय समय"],
  ["NIGHT READING FACILITY", "रात्रि पठन सुविधा"],
  ["Winter (August to April)", "शीतकाल (अगस्त से अप्रैल)"],
  ["Summer (May to July)", "ग्रीष्मकाल (मई से जुलाई)"],
  ["Working days &amp; RH", "कार्य दिवस एवं आर.एच."],
  ["Working days & RH", "कार्य दिवस एवं आर.एच."],
  ["Sunday &amp; other Holidays", "रविवार एवं अन्य अवकाश"],
  ["Sunday &amp; other Holidays", "रविवार एवं अन्य अवकाश"],
  ["Sunday & other Holidays", "रविवार एवं अन्य अवकाश"],
  ["LIST OF HOLIDAYS", "अवकाश सूची"],
  ["Republic Day", "गणतंत्र दिवस"],
  ["Independence Day", "स्वतंत्रता दिवस"],
  ["Mahatma Gandhi's Birthday", "महात्मा गांधी जयंती"],
  ["Haryana Day", "हरियाणा दिवस"],
  ["Dussehra", "दशहरा"],
  ["Diwali", "दीपावली"],
  ["Guru Nanak Dev Birthday", "गुरु नानक देव जयंती"],
  ["Christmas Day", "क्रिसमस"],
  ["Holi", "होली"],
  ["*During Examination - upto 02:00 AM", "*परीक्षा अवधि में — रात्रि 02:00 बजे तक"],
  ["Conferencing facility:", "सम्मेलन सुविधा:"],
  ["Reference Service", "संदर्भ सेवा"],
  ["Reading Facilities.", "पठन सुविधाएँ।"],
  ["Reading Facilities.", "पठन सुविधाएँ।"],
  ["Smart Class Room", "स्मार्ट कक्षा कक्ष"],
  ["Internet surfing facility", "इंटरनेट सर्फिंग सुविधा"],
  ["Online Catalogue", "ऑनलाइन कैटलॉग"],
  ["Periodicals’ Holdings", "पत्रिका धारण सूची"],
  ["Periodicals' Holdings", "पत्रिका धारण सूची"],
  ["Circulation functions", "परिसंचरण कार्य"],
  ["HAU Bookshop", "एच.ए.यू. बुकशॉप"],
  ["Self Issue Return", "स्व-निर्गम एवं वापसी"],
  ["Book Bank", "बुक बैंक"],
  ["Fresh arrivals", "नवीन आगमन"],
  ["title=\"Library Rules & Regulations\"", 'title="पुस्तकालय नियम एवं विनियम"'],
  ["Instructions Relating to Backlog Vacancies, Roster", "बकाया रिक्तियों, रोस्टर संबंधी निर्देश"],
  ["Legacy document", "विरासत दस्तावेज"],
  ["pending Phase 4 upload", "चरण-4 अपलोड लंबित"],
  ["About Acquisition Section.", "नेहरू पुस्तकालय का अधिग्रहण अनुभाग पुस्तकों, पत्रिकाओं एवं अन्य साहित्य की खरीद तथा संग्रह प्रबंधन हेतु उत्तरदायी है।"],
  ["About Periodical Section.", "नेहरू पुस्तकालय का आवधिक अनुभाग नियमित रूप से प्रकाशित पत्रिकाओं, जर्नलों एवं संबंधित सामग्री का प्रबंधन करता है।"],
  ["About Technical Section.", "नेहरू पुस्तकालय का तकनीकी अनुभाग पुस्तकालय संचालन, तकनीकी सेवाएँ एवं संबंधित सुविधाओं हेतु उत्तरदायी है।"],
  ["Incharge, Research Planning Development Division", "प्रभारी, अनुसंधान योजना विकास प्रभाग"],
];

const MODERNIZATION_EXTRA = [
  ["Research, Planning and Development Division was set up in September 1991 to grapple with the existing library problems, prepare library modernization plans, and implement the same. This division has successfully actuated the dreams the Library cherished. Eliminating the cumbersome manual library operations, Nehru library has exploited the power of information technologies to its advantage and applied them to various library activities for exhaustive and expeditious retrieval and dissemination of information.",
    "अनुसंधान, योजना एवं विकास प्रभाग की स्थापना सितंबर 1991 में विद्यमान पुस्तकालय समस्याओं से निपटने, आधुनिकीकरण योजनाएँ तैयार करने एवं उन्हें लागू करने हेतु की गई। इस प्रभाग ने पुस्तकालय के स्वप्नों को सफलतापूर्वक साकार किया है। जटिल मैनुअल प्रक्रियाओं को समाप्त कर नेहरू पुस्तकालय ने सूचना प्रौद्योगिकी की शक्ति का सदुपयोग किया तथा सूचना की व्यापक एवं त्वरित पुनर्प्राप्ति एवं प्रसार हेतु विभिन्न गतिविधियों में उसे लागू किया है।"],
  ["Setting afoot to computerization with one PC and one DMP in 1991, the Library, now has 78", "वर्ष 1991 में एक पी.सी. एवं एक डी.एम.पी. से कम्प्यूटरीकरण आरंभ कर आज पुस्तकालय के पास 78"],
  ["PCs/ workstations, 1 Server ,", "पी.सी./वर्कस्टेशन, 1 सर्वर,"],
  ["2 Scanners, 15 Barcode Readers, 24 UPSs, 26 Printers, Library Automation Softwares, Remote Login Softwares, RFID Software, 10 Network Desktop Switches, 2 Network Switch Racks, 5 Head Phones, 06 Web Cameras, ,One handheld readers, 2 Projectors, 1 Info Kiosks, 3 RFID Staff Stations, 1 Book Drop Box, 1 RFID Security Gate, One 75\" Interactive Display Panel, Two 65\" CCTV LED Screen etc. These equipments were used by the library staff for library automation activities and library users to access online database of books &amp; periodicals, Internet Library.",
    "2 स्कैनर, 15 बारकोड रीडर, 24 यू.पी.एस., 26 प्रिंटर, पुस्तकालय स्वचालन सॉफ्टवेयर, रिमोट लॉगिन सॉफ्टवेयर, आर.एफ.आई.डी. सॉफ्टवेयर, 10 नेटवर्क डेस्कटॉप स्विच, 2 नेटवर्क स्विच रैक, 5 हेडफोन, 06 वेब कैमरा, एक हैंडहेल्ड रीडर, 2 प्रोजेक्टर, 1 इन्फो कियोस्क, 3 आर.एफ.आई.डी. स्टाफ स्टेशन, 1 बुक ड्रॉप बॉक्स, 1 आर.एफ.आई.डी. सुरक्षा द्वार, एक 75\" इंटरैक्टिव डिस्प्ले पैनल, दो 65\" सी.सी.टी.वी. एलईडी स्क्रीन आदि हैं। इन उपकरणों का उपयोग स्टाफ स्वचालन गतिविधियों हेतु तथा उपयोगकर्ता पुस्तकों एवं पत्रिकाओं के ऑनलाइन डेटाबेस तथा इंटरनेट पुस्तकालय हेतु करते हैं।"],
  ["Following library activities have been automated:", "निम्नलिखित पुस्तकालय गतिविधियाँ स्वचालित की गई हैं:"],
  ["Internet Surfing Laboratory with 32 PCs has been established.", "32 पी.सी. वाला इंटरनेट सर्फिंग प्रयोगशाला स्थापित की गई है।"],
  ["Laptop Facility for users has been created adjacent to Internet Lab.", "इंटरनेट प्रयोगशाला के निकट उपयोगकर्ताओं हेतु लैपटॉप सुविधा सृजित की गई है।"],
  ["Maintaining Krishikosh Repository providing access to all the libraries under NARS.", "एन.ए.आर.एस. के अंतर्गत सभी पुस्तकालयों को पहुँच प्रदान करने वाला कृषिकोश रिपॉजिटरी अनुरक्षित किया जा रहा है।"],
  ["Library catalogue has been automated and web-enabled.", "पुस्तकालय कैटलॉग स्वचालित एवं वेब-सक्षम किया गया है।"],
  ["New additions of documents can be viewed through PCs linked to Campus Network.", "नए प्रलेखों को परिसर नेटवर्क से जुड़े पी.सी. पर देखा जा सकता है।"],
  ["Periodicals' Holdings has been computerized, and can be viewed through PCs linked to Campus Network.", "पत्रिका धारण सूची कम्प्यूटरीकृत है तथा परिसर नेटवर्क से जुड़े पी.सी. पर देखी जा सकती है।"],
  ["Entire library collection has been bar-coded as well as RFID tagged.", "संपूर्ण पुस्तकालय संग्रह बारकोड एवं आर.एफ.आई.डी. टैग युक्त किया गया है।"],
  ["All circulation functions including Library Membership has been automated.", "पुस्तकालय सदस्यता सहित सभी परिसंचरण कार्य स्वचालित किए गए हैं।"],
  ["Stock Verification of library stock has been computerized.", "पुस्तकालय भंडार का सत्यापन कम्प्यूटरीकृत किया गया है।"],
  ["Majority of the paper correspondence has been replaced with e-correspondence.", "अधिकांश कागजी पत्राचार को ई-पत्राचार से प्रतिस्थापित किया गया है।"],
  ["Digital Library comprising AgriCat, Krishikosh, Open Access Resources, IndiaStat.com etc. has been established", "एग्रीकैट, कृषिकोश, ओपन एक्सेस संसाधन, इंडियास्टैट डॉट कॉम आदि सहित डिजिटल पुस्तकालय स्थापित किया गया है"],
  ["Conferencing Facility for interaction among the scientists at national and international levels has been established in the Library.", "राष्ट्रीय एवं अंतरराष्ट्रीय स्तर पर वैज्ञानिकों के मध्य संवाद हेतु पुस्तकालय में सम्मेलन सुविधा स्थापित की गई है।"],
  ["Library security is strengthened with CCTV Security System.", "पुस्तकालय सुरक्षा को सी.सी.टी.वी. सुरक्षा प्रणाली से सुदृढ़ किया गया है।"],
  ["RFID Technology has been fully implemented.", "आर.एफ.आई.डी. प्रौद्योगिकी पूर्णतः लागू की गई है।"],
  ["Smart ID Cards for Students and Faculty of CCSHAU and LUVAS and Retired persons of CCSHAU are being prepared in library.", "सी.सी.एस.एच.ए.यू. एवं लुवास के छात्रों एवं संकाय तथा सी.सी.एस.एच.ए.यू. के सेवानिवृत्त व्यक्तियों हेतु स्मार्ट पहचान पत्र पुस्तकालय में तैयार किए जा रहे हैं।"],
  ["Remote Login Facility via Refread Platform has been created.", "रेफरीड प्लेटफॉर्म के माध्यम से रिमोट लॉगिन सुविधा सृजित की गई है।"],
  ["Mobile App to access e-library form remote login has been developed for users.", "रिमोट लॉगिन से ई-लाइब्रेरी पहुँच हेतु उपयोगकर्ताओं के लिए मोबाइल ऐप विकसित किया गया है।"],
  ["Realization of these achievements without financial assistance from ICAR would have remained a dream unfulfilled.", "आई.सी.ए.आर. की वित्तीय सहायता के बिना इन उपलब्धियों का साकार होना अधूरा स्वप्न रह जाता।"],
];

const SERVICES_EXTRA = [
  ["Conferencing facility is being provided to the scientists of the university for different academic purposes. It is considered the glittering feather in the cap of the library. The scientists of CCSHAU using this facility and students can have live interactions with their fraternity at remote locations. In fact, this is a multipurpose facility. It can also be used for delivering a Power Point Presentation to a group of the audience. During the period under report this facility was used for many educational purposes.",
    "विश्वविद्यालय के वैज्ञानिकों को विभिन्न शैक्षणिक प्रयोजनों हेतु सम्मेलन सुविधा प्रदान की जाती है। इसे पुस्तकालय की प्रमुख उपलब्धियों में गिना जाता है। इस सुविधा से सी.सी.एस.एच.ए.यू. के वैज्ञानिक एवं छात्र दूरस्थ स्थानों पर अपने साथियों से सीधा संवाद कर सकते हैं। यह बहुउद्देशीय सुविधा है तथा पावरपॉइंट प्रस्तुति हेतु भी उपयोगी है। रिपोर्ट अवधि में इसका अनेक शैक्षणिक प्रयोजनों हेतु उपयोग हुआ।"],
  ["implies the provision of human beings as canvassing agents for the learning resources.  It, truly, reveals the positive outcome of the library ethics, and is a barometer of library’s reputation amongst its patrons. Reference Desk, headed by a senior library professional,  is located on the first floor at the central place. The Reference Librarian, assisted by other staff guides/helps the library users in the location and selection of documents/ information, in the use of OPAC, and to procure information from other libraries, if the need be. It is here that the freshers are offered orientation programmes to apprise them of the library organization and services.",
    "अधिगम संसाधनों हेतु मार्गदर्शक के रूप में मानव सहायता का प्रावधान है। यह पुस्तकालय नैतिकता का सकारात्मक परिणाम दर्शाती है तथा उपयोगकर्ताओं में पुस्तकालय की प्रतिष्ठा का मापदंड है। वरिष्ठ पुस्तकालय पेशेवर के नेतृत्व में संदर्भ डेस्क प्रथम तल पर केंद्रीय स्थान पर स्थित है। संदर्भ पुस्तकालयाध्यक्ष अन्य स्टाफ की सहायता से उपयोगकर्ताओं को प्रलेख/सूचना खोजने-चुनने, ओपैक उपयोग तथा आवश्यकतानुसार अन्य पुस्तकालयों से सूचना प्राप्त करने में सहायता करते हैं। यहीं नव आगंतुकों हेतु अभिविन्यास कार्यक्रम भी आयोजित होते हैं।"],
  ["Nehru Library offers unmatched", "नेहरू पुस्तकालय अद्वितीय"],
  ["There are 6 Reading Halls with seating capacity for 650 readers. Half of the reading area is air-conditioned, while the air-conditioning of the rest  half is under active consideration. In addition, there is a Night Reading Facility with location on Ground Floor and  seating capacity for about 75 readers.",
    "यहाँ 650 पाठकों की क्षमता वाले 6 पठन कक्ष हैं। आधा पठन क्षेत्र वातानुकूलित है तथा शेष के वातानुकूलन पर सक्रिय विचार किया जा रहा है। इसके अतिरिक्त भूतल पर लगभग 75 पाठकों की क्षमता वाली रात्रि पठन सुविधा भी है।"],
  ["Library has a", "पुस्तकालय में"],
  ["for teaching the course PGS-501 to PG students. It is located at 2<sup>nd</sup> floor of the Library. Library course has been taught to PG and PhD students of different colleges of the University, LUVAS, CFST and MHU using the audio visual facilities of this smart class room during the period under report. This smart room is also used for delivering lectures/interaction on some other occasions.",
    "स्नातकोत्तर छात्रों को पी.जी.एस.-501 पाठ्यक्रम पढ़ाने हेतु है। यह पुस्तकालय के द्वितीय तल पर स्थित है। रिपोर्ट अवधि में विश्वविद्यालय के विभिन्न महाविद्यालयों, लुवास, सी.एफ.एस.टी. एवं एम.एच.यू. के स्नातकोत्तर एवं पीएच.डी. छात्रों को इस स्मार्ट कक्ष की दृश्य-श्रव्य सुविधाओं से पुस्तकालय पाठ्यक्रम पढ़ाया गया। अन्य अवसरों पर व्याख्यान/संवाद हेतु भी इसका उपयोग होता है।"],
  ["was set up in 2001. Since then the library provides Internet Surfing facility to the students and faculty of the University for their academic and research use. For this purpose, the Library has a well equipped computer lab consisting of 32 latest PCs with Internet facility whereas provision of 32 internet points have provided for laptop users. This service is offered to the bonafide library patrons free of cost. Printouts of the searched articles are supplied @ Re. 1.00 per page.",
    "वर्ष 2001 में स्थापित की गई। तब से पुस्तकालय छात्रों एवं संकाय को शैक्षणिक एवं अनुसंधान हेतु इंटरनेट सर्फिंग सुविधा देता है। इस हेतु 32 नवीनतम पी.सी. वाली सुसज्जित कंप्यूटर प्रयोगशाला तथा लैपटॉप उपयोगकर्ताओं हेतु 32 इंटरनेट बिंदु उपलब्ध हैं। प्रामाणिक उपयोगकर्ताओं को यह सेवा निःशुल्क है। खोजे गए लेखों के प्रिंटआउट प्रति पृष्ठ 1.00 रुपये पर उपलब्ध हैं।"],
  ["(Online Public Access Catalogue) and database of", "(ऑनलाइन पब्लिक एक्सेस कैटलॉग) तथा"],
  ["are accessible to the scientists/teachers/ extension specialists/ students/others from the PCs with linkage to the Campus Network and locations all over the university campus.",
    "का डेटाबेस परिसर नेटवर्क से जुड़े पी.सी. तथा विश्वविद्यालय परिसर के विभिन्न स्थानों से वैज्ञानिकों/शिक्षकों/विस्तार विशेषज्ञों/छात्रों/अन्य हेतु उपलब्ध है।"],
  ["The entire range of", "समस्त"],
  ["- use of RFID enabled University Smart ID Cards for  Check-out and Check-in of reading material, calculation of overdue charges, printing of gate-passes, reservation of books, printing of reminders for outstanding books, checking of a book whether it is checked-out or is available on shelf, if checked-out to whom it is issued and when it is due, blocking of user account, statistical data, and all other circulation-related functions -  is computerized.",
    "— आर.एफ.आई.डी. युक्त विश्वविद्यालय स्मार्ट पहचान पत्र से पठन सामग्री का निर्गम-वापसी, अतिदेय शुल्क गणना, गेट पास मुद्रण, पुस्तकों का आरक्षण, बकाया पुस्तकों हेतु अनुस्मारक, पुस्तक उपलब्धता/निर्गम स्थिति जाँच, उपयोगकर्ता खाता अवरोधन, सांख्यिकीय डेटा एवं अन्य परिसंचरण कार्य — कम्प्यूटरीकृत हैं।"],
  ["is a unique service which this Library provides to the university community. No other library in the country offers this type of facility. Nehru Library also avails of Bookshop facility for the purchase of its  reading material. The university staff and students are also entitled to purchase personal books through the Bookshop and avail of discount facility. The University community is passed on entire amount discount which the Bookshop gets on cash sales, but retains a part of  discount on credit sales.",
    "विश्वविद्यालय समुदाय को इस पुस्तकालय द्वारा प्रदान की जाने वाली अनूठी सेवा है। देश के किसी अन्य पुस्तकालय में इस प्रकार की सुविधा नहीं है। नेहरू पुस्तकालय अपनी पठन सामग्री खरीद हेतु भी बुकशॉप का उपयोग करता है। विश्वविद्यालय स्टाफ एवं छात्र व्यक्तिगत पुस्तकें खरीदकर छूट का लाभ उठा सकते हैं। नकद बिक्री पर प्राप्त संपूर्ण छूट विश्वविद्यालय समुदाय को दी जाती है, जबकि उधार बिक्री पर आंशिक छूट रखी जाती है।"],
  ["User can himself/herself can get issued the documents using this facility. He must have carrying his Smart ID Card and desired document for this which he has to place on the RFID machine for issuance of document. After he get the document issued, a slip is generated (like on ATM machine) which he has to show on Property counter.",
    "उपयोगकर्ता स्वयं इस सुविधा से प्रलेख निर्गत करवा सकते हैं। स्मार्ट पहचान पत्र एवं वांछित प्रलेख आर.एफ.आई.डी. मशीन पर रखना आवश्यक है। निर्गम के बाद ए.टी.एम. की तरह स्लिप बनती है, जिसे संपत्ति काउंटर पर दिखाना होता है।"],
  ["is a collection of multiple copies of textbooks. These books can be borrowed by the students for a semester (in semester system) or a year (in annual system) against  nominal rental charges (10% of the cost of the book if the cost is upto Rs. 100/- or Rs 10/- + 5% of the cost of the book exceeding Rs. 100/-). There is a Social Welfare Section in the Book Bank. Books placed in this Section are reserved for the students belonging to Scheduled Castes and Scheduled Tribes, and are issued to them free of charge. Each student is entitled to borrow four books from the Bank.",
    "पाठ्यपुस्तकों की बहुप्रतियों का संग्रह है। छात्र इन्हें नाममात्र किराये पर एक सेमेस्टर (सेमेस्टर प्रणाली) या एक वर्ष (वार्षिक प्रणाली) हेतु उधार ले सकते हैं (पुस्तक मूल्य 100 रुपये तक हो तो 10%, अथवा 10 रुपये + 100 रुपये से अधिक मूल्य का 5%)। बुक बैंक में समाज कल्याण अनुभाग भी है, जिसकी पुस्तकें अनुसूचित जाति/जनजाति छात्रों हेतु आरक्षित एवं निःशुल्क हैं। प्रत्येक छात्र बैंक से चार पुस्तकें ले सकता है।"],
  ["of books are displayed on ground floor near circulation counter so that users could get aware about latest collection purchased in library.",
    "पुस्तकों का प्रदर्शन भूतल पर परिसंचरण काउंटर के निकट किया जाता है, जिससे उपयोगकर्ता नवीनतम संग्रह से अवगत हो सकें।"],
];

const RPD_EXTRA = [
  ["Automation of Nehru Library started with the coming into existence of this Division which includes application of computer and other technologies to activities such as &nbsp;Acquisition of books, Subscription of printed and e-journals, Cataloguing of current acquisitions &amp; display of new additions, Retro-conversion of the Library Catalogue, Bar coding of documents, Circulation of books and other reading material, Linkage of Online Catalogue to the university website, Acquisition of CD-ROM databases, etc. Library has its own Portal which is linked to the University&rsquo;s website. Starting with one PC in 1991, the Library, now has 123",
    "नेहरू पुस्तकालय का स्वचालन इसी प्रभाग के अस्तित्व में आने से आरंभ हुआ, जिसमें कंप्यूटर एवं अन्य प्रौद्योगिकियों का उपयोग पुस्तक अधिग्रहण, मुद्रित एवं ई-पत्रिका सदस्यता, वर्तमान अधिग्रहणों का कैटलॉगिंग एवं नए आगमन प्रदर्शन, कैटलॉग का रेट्रो-रूपांतरण, प्रलेख बारकोडिंग, पुस्तक एवं पठन सामग्री परिसंचरण, ऑनलाइन कैटलॉग को विश्वविद्यालय वेबसाइट से जोड़ना, सी.डी.-रॉम डेटाबेस अधिग्रहण आदि में किया जाता है। पुस्तकालय का अपना पोर्टल विश्वविद्यालय वेबसाइट से जुड़ा है। वर्ष 1991 में एक पी.सी. से आरंभ कर आज पुस्तकालय के पास 123"],
  ["PCs/ workstations, 8 Thin clients, 7 Servers including one CD server called NAStorage,", "पी.सी./वर्कस्टेशन, 8 थिन क्लाइंट, एनएस्टोरेज नामक एक सी.डी. सर्वर सहित 7 सर्वर,"],
  ["Scanners, 14 Barcode Readers, 1", "स्कैनर, 14 बारकोड रीडर, 1"],
  ["Modem, 36 UPSs, 36 printers and 9", "मॉडेम, 36 यू.पी.एस., 36 प्रिंटर एवं 9"],
  ["Software (UNIX, LINUX, LibSys, KOHA, MS-Office-2003, MS-Office-2007, Adobe Acrobat-9 and E-quest), 3 Network Switches, 2 Network Switch Racks, 31 Head Phones, Three Desktop Switch (8 Ports), 5 Portable Data Terminals (PDT), etc. These equipments were used by the library staff for library automation activities and library users to access online database of books &amp; periodicals, CD-ROM databases, Internet and Multimedia Library.",
    "सॉफ्टवेयर (यूनिक्स, लिनक्स, लिबसिस, कोहा, एमएस-ऑफिस-2003, एमएस-ऑफिस-2007, एडोब एक्रोबैट-9 एवं ई-क्वेस्ट), 3 नेटवर्क स्विच, 2 नेटवर्क स्विच रैक, 31 हेडफोन, तीन डेस्कटॉप स्विच (8 पोर्ट), 5 पोर्टेबल डेटा टर्मिनल (पी.डी.टी.) आदि हैं। इनका उपयोग स्टाफ स्वचालन हेतु तथा उपयोगकर्ता पुस्तकों एवं पत्रिकाओं के ऑनलाइन डेटाबेस, सी.डी.-रॉम डेटाबेस, इंटरनेट एवं मल्टीमीडिया पुस्तकालय हेतु करते हैं।"],
];

function applyPhrases(html, pairs) {
  let out = html || "";
  const all = [...pairs].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of all) {
    if (!en) continue;
    out = out.split(en).join(hi);
  }
  return out;
}

function translateBody(en) {
  let hi = en || "";
  hi = applyPhrases(hi, PHRASES);
  hi = applyPhrases(hi, MODERNIZATION_EXTRA);
  hi = applyPhrases(hi, SERVICES_EXTRA);
  hi = applyPhrases(hi, RPD_EXTRA);
  hi = applyPhrases(hi, SHORT_REPLACES);
  return hi;
}

const EXCERPT_HI = {
  "about-library": "नेहरू पुस्तकालय का परिचय एवं संबंधित पृष्ठ।",
  "contact-us-9": "नेहरू पुस्तकालय से संपर्क करें।",
  "digital-library": "नेहरू पुस्तकालय की डिजिटल संसाधन सेवाएँ।",
  "e-books": "ई-पुस्तक संसाधन।",
  "financial-status": "नेहरू पुस्तकालय की वित्तीय स्थिति।",
  "home-29": "नेहरू पुस्तकालय होम।",
  "instructions-relating-to-backlog-vacancies-roster": "बकाया रिक्तियों एवं रोस्टर संबंधी निर्देश।",
  "journals-2": "पत्रिकाएँ।",
  "journals-3": "पुस्तकालय द्वारा सदस्यता प्राप्त एफ.ओ.ए.पी. भारतीय पत्रिकाएँ।",
  "library-modernization": "नेहरू पुस्तकालय का आधुनिकीकरण।",
  "library-patrons": "नेहरू पुस्तकालय उपयोगकर्ता एवं सदस्यता।",
  "library-rules-regulations": "नेहरू पुस्तकालय नियम एवं विनियम।",
  "library-services": "नेहरू पुस्तकालय सेवाएँ।",
  "library-timings-holidays": "पुस्तकालय समय एवं अवकाश।",
  "nehru-library-gallery": "नेहरू पुस्तकालय फोटो गैलरी।",
  "nl-acquisition-section": "नेहरू पुस्तकालय अधिग्रहण अनुभाग।",
  "nl-department": "नेहरू पुस्तकालय के विभाग।",
  "nl-human-resources": "नेहरू पुस्तकालय मानव संसाधन।",
  "nl-periodical-section": "नेहरू पुस्तकालय आवधिक अनुभाग।",
  "nl-research-and-planning-division": "नेहरू पुस्तकालय अनुसंधान एवं योजना प्रभाग।",
  "nl-technical-section": "नेहरू पुस्तकालय तकनीकी अनुभाग।",
  organogram: "नेहरू पुस्तकालय की संगठन संरचना।",
  proforma: "पहचान पत्र हेतु प्रोफार्मा।",
  resources: "नेहरू पुस्तकालय संसाधन।",
};

const ORGANOGRAM_HI = `<p style="text-align:justify"><strong><span style="font-size:14px;font-family:&quot;Times New Roman&quot;, Times, serif">संगठन संरचना</span></strong></p><p style="text-align:justify"><span style="font-family:Times New Roman,Times,serif"><span style="font-size:14px">पुस्तकालय सलाहकार समिति — एक नीति-निर्धारण निकाय — पुस्तकालय के सुचारु संचालन हेतु दिशानिर्देश तय करती है। इस समिति के अध्यक्ष कुलपति होते हैं तथा विश्वविद्यालय पुस्तकालयाध्यक्ष इसके सदस्य-सचिव होते हैं। सभी डीन/निदेशक, कुलसचिव, प्राचार्य, कृषि महाविद्यालय, कौल तथा हाउटा अध्यक्ष इसके पदेन सदस्य हैं, जबकि प्रत्येक महाविद्यालय से एक विभागाध्यक्ष, एक संकाय सदस्य एवं एक स्नातकोत्तर छात्र को कुलपति द्वारा दो शैक्षणिक वर्षों के लिए नामित किया जाता है। कुलपति पुस्तकालय समिति कक्ष में एल.ए.सी. की बैठकें आयोजित करना पसंद करते हैं, ताकि वे एवं अन्य सदस्य पुस्तकालय के कार्यों का समग्र अवलोकन कर सकें।</span></span></p><p style="text-align:justify"><img src="https://hau.ac.in/storage/app/uploads/FSor5MJ8NjmHh2FuRkrXohhIabzUsUXn540BuJUk.jpeg" style="width:1200px" class="fr-fic fr-dib fr-bordered" /></p>`;

const PATRONS_HI = `<p style="text-align:justify"><strong><span style="font-size:18px;color:rgb(65, 168, 95)">पुस्तकालय उपयोगकर्ता</span></strong></p><p style="text-align:justify"><strong><span style="font-size:18px">सदस्यता</span></strong><span style="font-size:18px"> इस विश्वविद्यालय पुस्तकालय की सदस्यता इसके शिक्षकों, वैज्ञानिकों, विस्तार विशेषज्ञों, गैर-शिक्षण कर्मचारियों एवं छात्रों के लिए खुली है। शिक्षक, वैज्ञानिक एवं विस्तार विशेषज्ञ आठ पुस्तकें उधार ले सकते हैं; छात्रों को आठ पुस्तकें — चार अप्रतिबंधित संग्रह से तथा समान संख्या बुक बैंक से — लेने का अधिकार है; जबकि गैर-शिक्षण कर्मचारी केवल अप्रतिबंधित संग्रह से चार पुस्तकें उधार ले सकते हैं। इसके अतिरिक्त, सी.सी.एस.एच.ए.यू. प्रबंधन बोर्ड के सदस्य, हरियाणा सरकार/भारत सरकार के वैज्ञानिक एवं श्रेणी-एक राजपत्रित अधिकारी (यदि हिसार में स्थित हों), स्टाफ संवाददाता, सेवानिवृत्त शिक्षक/वैज्ञानिक तथा सी.सी.एस.एच.ए.यू. के श्रेणी-दो एवं उससे ऊपर के अन्य कर्मचारी (यदि हिसार में निवास करते हों), अन्य विश्वविद्यालयों के अनुसंधान विद्वान (यदि हिसार में स्थित हों), स्थानीय महाविद्यालयों के शिक्षक तथा प्रगतिशील किसान भी विश्वविद्यालय पुस्तकालयाध्यक्ष की अनुमति से, कुछ शर्तों के अधीन, पुस्तकालय सुविधाओं का लाभ उठा सकते हैं।</span><span style="font-size:14px"><br /></span></p>`;

const FULL_OVERRIDE = {
  "nehru-library": HOME_CONTENT_HI,
  "contact-us-9": CONTACT_CONTENT_HI,
  organogram: ORGANOGRAM_HI,
  "library-patrons": PATRONS_HI,
  "nl-department": "<p>नेहरू पुस्तकालय के विभाग।</p>",
  proforma:
    "<p><strong>पहचान पत्र हेतु प्रोफार्मा</strong></p>\n<p>विरासत दस्तावेज <code>1550820777.pdf</code> — चरण-4 अपलोड लंबित (<code>legacy-pending/cms/1174/1550820777.pdf</code>)।</p>",
};

/** Only these pages get full body rewrite (About Library + depts + home/contact). */
const BODY_SLUGS = new Set([
  "nehru-library",
  "home-29",
  "contact-us-9",
  "organogram",
  "financial-status",
  "library-modernization",
  "library-patrons",
  "library-services",
  "library-rules-regulations",
  "nl-human-resources",
  "instructions-relating-to-backlog-vacancies-roster",
  "nl-acquisition-section",
  "nl-technical-section",
  "nl-periodical-section",
  "nl-research-and-planning-division",
  "resources",
  "library-timings-holidays",
  "nl-department",
  "about-library",
  "nehru-library-gallery",
  "proforma",
]);

const SIDEBAR_IDS = {
  Home: "0a702e79-4486-422d-83fd-547da398f22a",
  "Contact Us": "303c6994-d982-4511-a642-2b49c4de9c0c",
};

function strip(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: pages, error } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,title_hi,excerpt_hi,content_en,content_hi")
    .or(`id.eq.${COLLEGE_ID},college_root_id.eq.${COLLEGE_ID}`);
  if (error) throw error;

  const plans = [];
  for (const p of pages ?? []) {
    if (!BODY_SLUGS.has(p.slug) && !EXCERPT_HI[p.slug]) continue;
    const patch = {};
    if (EXCERPT_HI[p.slug] && p.excerpt_hi !== EXCERPT_HI[p.slug]) {
      patch.excerpt_hi = EXCERPT_HI[p.slug];
    }

    let nextHi = null;
    if (BODY_SLUGS.has(p.slug)) {
      if (FULL_OVERRIDE[p.slug]) {
        nextHi = FULL_OVERRIDE[p.slug];
      } else if ((p.content_en || "").trim().length > 20) {
        nextHi = translateBody(p.content_en);
        nextHi = nextHi
          .replaceAll("Dr. Rajive Kumar Pateria", "डॉ. राजीव कुमार पटेरिया")
          .replaceAll("Dr. Seema Parmar", "डॉ. सीमा परमार")
          .replaceAll("Prof. Balwan Singh", "प्रो. बलवान सिंह")
          .replaceAll("Dr. Bhanu Partap", "डॉ. भानु प्रताप")
          .replaceAll("CCS HAU eLibrary", "सी.सी.एस. एच.ए.यू. ई-लाइब्रेरी");
      }
    }

    if (nextHi && nextHi !== p.content_hi) {
      patch.content_hi = nextHi;
    }

    if (Object.keys(patch).length) {
      plans.push({ id: p.id, slug: p.slug, patch, preview: strip(patch.content_hi || "").slice(0, 160) });
    }
  }

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log(`page plans: ${plans.length}`);
  for (const pl of plans) {
    console.log(`  ${pl.slug}: keys=${Object.keys(pl.patch).join(",")} preview=${JSON.stringify(pl.preview)}`);
  }

  const sidePlans = [
    { id: SIDEBAR_IDS.Home, label: "Home", content_hi: HOME_CONTENT_HI },
    { id: SIDEBAR_IDS["Contact Us"], label: "Contact Us", content_hi: CONTACT_CONTENT_HI },
  ];
  console.log(`sidebar plans: ${sidePlans.length}`);

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  for (const pl of plans) {
    const { error: upErr } = await sb
      .from("ccshau_pages")
      .update({ ...pl.patch, updated_at: now })
      .eq("id", pl.id);
    if (upErr) throw upErr;
    console.log(`OK page ${pl.slug}`);
  }

  for (const s of sidePlans) {
    const { error: upErr } = await sb
      .from("ccshau_page_sidebar_items")
      .update({ content_hi: s.content_hi, updated_at: now })
      .eq("id", s.id);
    if (upErr) throw upErr;
    console.log(`OK sidebar ${s.label}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
