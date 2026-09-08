#!/usr/bin/env node
/**
 * Curated Hindi for DSW Counseling & Placement page body + sidebar labels.
 *
 *   node scripts/ops/apply-dsw-counseling-placement-hindi.mjs
 *   node scripts/ops/apply-dsw-counseling-placement-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "f3d78041-424f-4dd9-8d84-308db0299d1b";

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

const S = 'font-size: 14px; font-family: "Times New Roman", "serif"; color: rgb(34, 34, 34);';

/** Longest-first phrase map applied to normalized EN HTML. */
const PHRASES = [
  [
    "The Counselling & Placement Cell functions as an integral part of the Directorate of Students' Welfare with a commitment towards the holistic development of university students. The Cell continuously strives to create an environment that nurtures academic excellence, professional competence, leadership qualities, ethical values, and overall personality development among students. Its primary objective is to prepare students to confidently face the challenges of an increasingly competitive global environment and emerge as skilled, responsible, and employable professionals. In view of the rapidly changing socio-economic and technological landscape, the Directorate has undertaken several initiatives to strengthen students' managerial, administrative, communicative, technical, entrepreneurial, and self-employment-oriented skills. Through a series of training programmes, workshops, seminars, expert lectures, group discussions, mock interviews, and career guidance activities, students are provided opportunities to enhance their professional competencies and interpersonal abilities. Special emphasis is laid on improving soft skills, leadership qualities, decision-making abilities, teamwork, and problem-solving aptitude so that students can successfully meet industry expectations and career demands. The Counselling & Placement Cell also plays a vital role in bridging the gap between academia and industry by establishing strong linkages with reputed organizations, industries, institutions, and corporate sectors. Regular interaction with industry experts and employers helps students gain exposure to current market trends, technological advancements, and employment opportunities. The Cell actively coordinates campus placement drives and recruitment activities to facilitate suitable career opportunities for graduating students in government, private, corporate, and development sectors. In addition to placement activities, the Cell provides professional counselling and career guidance services to students for their academic, personal, and career-related concerns. Students are guided in identifying their strengths, career interests, and future goals through systematic counselling support. The Cell also encourages entrepreneurial development and self-employment by motivating students to explore innovative ideas, startup opportunities, and skill-based enterprises. The Centre under the Directorate of Students' Welfare has broadly been entrusted with the following four major mandates:",
    "परामर्श एवं प्लेसमेंट सेल छात्र कल्याण निदेशालय का अभिन्न अंग है तथा विश्वविद्यालय के छात्रों के समग्र विकास के प्रति प्रतिबद्ध है। सेल निरंतर ऐसा वातावरण बनाने का प्रयास करता है जो छात्रों में शैक्षणिक उत्कृष्टता, व्यावसायिक दक्षता, नेतृत्व गुण, नैतिक मूल्य एवं समग्र व्यक्तित्व विकास को पोषित करे। इसका प्रमुख उद्देश्य छात्रों को बढ़ते प्रतिस्पर्धी वैश्विक परिवेश की चुनौतियों का आत्मविश्वास से सामना करने हेतु तैयार करना तथा उन्हें कुशल, उत्तरदायी एवं रोजगारपरक पेशेवर के रूप में विकसित करना है। तेजी से बदलते सामाजिक-आर्थिक एवं तकनीकी परिदृश्य को देखते हुए, निदेशालय ने छात्रों के प्रबंधकीय, प्रशासनिक, संचार, तकनीकी, उद्यमशीलता एवं स्वरोजगार उन्मुख कौशलों को सुदृढ़ करने हेतु कई पहल की हैं। प्रशिक्षण कार्यक्रमों, कार्यशालाओं, सेमिनारों, विशेषज्ञ व्याख्यानों, समूह चर्चाओं, मॉक इंटरव्यू एवं कैरियर मार्गदर्शन गतिविधियों की श्रृंखला के माध्यम से छात्रों को उनकी व्यावसायिक दक्षताओं एवं पारस्परिक क्षमताओं को बढ़ाने के अवसर प्रदान किए जाते हैं। सॉफ्ट स्किल्स, नेतृत्व गुण, निर्णय लेने की क्षमता, टीमवर्क एवं समस्या-समाधान योग्यता पर विशेष बल दिया जाता है ताकि छात्र उद्योग की अपेक्षाओं एवं कैरियर की माँगों को सफलतापूर्वक पूरा कर सकें। परामर्श एवं प्लेसमेंट सेल प्रतिष्ठित संगठनों, उद्योगों, संस्थानों एवं कॉर्पोरेट क्षेत्र से मजबूत संबंध स्थापित कर शिक्षा और उद्योग के बीच की दूरी को पाटने में महत्वपूर्ण भूमिका निभाता है। उद्योग विशेषज्ञों एवं नियोक्ताओं से नियमित संवाद छात्रों को वर्तमान बाज़ार प्रवृत्तियों, तकनीकी प्रगति एवं रोजगार अवसरों से परिचित कराता है। सेल सक्रिय रूप से कैंपस प्लेसमेंट ड्राइव एवं भर्ती गतिविधियों का समन्वय कर स्नातक छात्रों को सरकारी, निजी, कॉर्पोरेट एवं विकास क्षेत्रों में उपयुक्त कैरियर अवसर उपलब्ध कराने में सहायता करता है। प्लेसमेंट के अतिरिक्त, सेल छात्रों को उनकी शैक्षणिक, व्यक्तिगत एवं कैरियर संबंधी चिंताओं हेतु व्यावसायिक परामर्श एवं कैरियर मार्गदर्शन सेवाएँ प्रदान करता है। व्यवस्थित परामर्श सहायता के माध्यम से छात्रों को अपनी शक्तियों, कैरियर रुचियों एवं भविष्य के लक्ष्यों की पहचान करने में मार्गदर्शन दिया जाता है। सेल नवाचार विचारों, स्टार्टअप अवसरों एवं कौशल आधारित उद्यमों के अन्वेषण हेतु प्रेरित कर उद्यमशीलता विकास एवं स्वरोजगार को भी प्रोत्साहित करता है। छात्र कल्याण निदेशालय के अंतर्गत केंद्र को मुख्यतः निम्नलिखित चार प्रमुख दायित्व सौंपे गए हैं:",
  ],
  [
    "In the present era of hi-tech competition for job opportunities, students of the university need a greater degree of exposure to the current national and international situation in order to land into a career befitting their qualifications. In order to accomplish it, the centre is engaged in multi-farious activities to make available to our students the opportunities to develop their personality and prepare them to face, challenges of future with greater confidence. To achieve this various types of trainings are being organized by this centre. The trainings are as follows:(i) Skill Improvement Trainings:",
    "आज के उच्च तकनीक प्रतिस्पर्धी युग में रोजगार के अवसरों हेतु विश्वविद्यालय के छात्रों को अपनी योग्यता के अनुरूप कैरियर पाने के लिए वर्तमान राष्ट्रीय एवं अंतरराष्ट्रीय परिदृश्य का अधिक अनुभव आवश्यक है। इसे प्राप्त करने हेतु केंद्र बहुआयामी गतिविधियों में संलग्न है ताकि छात्रों को व्यक्तित्व विकास एवं भविष्य की चुनौतियों का अधिक आत्मविश्वास से सामना करने के अवसर मिल सकें। इस उद्देश्य से केंद्र द्वारा विभिन्न प्रकार के प्रशिक्षण आयोजित किए जाते हैं। प्रशिक्षण निम्नानुसार हैं: (i) कौशल सुधार प्रशिक्षण:",
  ],
  [
    "The students are being guided and provided relevant information on admissions, fellowships, competitive exams, financial assistance available for higher studies in India and abroad and for opening of their own agribusiness clinic, agri-business centres/units etc. The Career Bulletin is also regularly being circulated fortnightly. The Counselling & Placement Centre Library has been updated and shifted to new hall. A New Computer Lab equipped with 25 computers has been set up for training the university students in various computer education programs. A committee room has been set up in the Directorate for organizing Campus Interview. There is always scope for surging forward. Certainly the task ahead is arduous but with the intensity of purpose, it is achievable .",
    "छात्रों को भारत एवं विदेश में उच्च शिक्षा हेतु प्रवेश, फेलोशिप, प्रतियोगी परीक्षाओं, वित्तीय सहायता तथा अपने कृषि-व्यवसाय क्लिनिक, कृषि-व्यवसाय केंद्र/इकाइयाँ आरंभ करने संबंधी प्रासंगिक जानकारी एवं मार्गदर्शन प्रदान किया जाता है। कैरियर बुलेटिन भी नियमित रूप से पाक्षिक रूप से परिचालित की जाती है। परामर्श एवं प्लेसमेंट केंद्र पुस्तकालय को अद्यतन कर नए हॉल में स्थानांतरित किया गया है। विश्वविद्यालय छात्रों को विभिन्न कंप्यूटर शिक्षा कार्यक्रमों में प्रशिक्षण देने हेतु 25 कंप्यूटरों से सुसज्जित नया कंप्यूटर लैब स्थापित किया गया है। कैंपस साक्षात्कार आयोजित करने हेतु निदेशालय में एक समिति कक्ष भी स्थापित किया गया है। आगे बढ़ने की सदैव गुंजाइश रहती है। निस्संदेह आगे का कार्य कठिन है, किंतु उद्देश्य की तीव्रता के साथ यह प्राप्त करने योग्य है।",
  ],
  [
    "Organizing programmes for personality development, communication skills, leadership, entrepreneurship, technical competency, and employability enhancement.",
    "व्यक्तित्व विकास, संचार कौशल, नेतृत्व, उद्यमशीलता, तकनीकी दक्षता एवं रोजगार क्षमता बढ़ाने हेतु कार्यक्रमों का आयोजन।",
  ],
  [
    "Facilitating campus placements, internship opportunities, career interactions, and recruitment drives with reputed organizations and industries.",
    "प्रतिष्ठित संगठनों एवं उद्योगों के साथ कैंपस प्लेसमेंट, इंटर्नशिप अवसरों, कैरियर संवाद एवं भर्ती ड्राइव को सुगम बनाना।",
  ],
  [
    "Developing and maintaining strong collaboration with industries, corporate sectors, financial institutions, and other professional organizations for student development and placement opportunities.",
    "छात्र विकास एवं प्लेसमेंट अवसरों हेतु उद्योगों, कॉर्पोरेट क्षेत्र, वित्तीय संस्थानों एवं अन्य व्यावसायिक संगठनों के साथ मजबूत सहयोग विकसित एवं बनाए रखना।",
  ],
  [
    "Providing academic, career, and personal counselling services to help students make informed decisions and achieve their professional aspirations.",
    "छात्रों को सूचित निर्णय लेने एवं व्यावसायिक आकांक्षाएँ प्राप्त करने में सहायता हेतु शैक्षणिक, कैरियर एवं व्यक्तिगत परामर्श सेवाएँ प्रदान करना।",
  ],
  [
    "Through these initiatives, the Counselling & Placement Cell continues to contribute significantly towards empowering students with knowledge, confidence, employability skills, and professional values necessary for achieving success in their careers and life",
    "इन पहलों के माध्यम से परामर्श एवं प्लेसमेंट सेल छात्रों को ज्ञान, आत्मविश्वास, रोजगार कौशल एवं व्यावसायिक मूल्यों से सशक्त बनाने में निरंतर महत्वपूर्ण योगदान देता है जो उनके कैरियर एवं जीवन में सफलता हेतु आवश्यक हैं",
  ],
  // Headings / labels
  ["Training and Skill Development:", "प्रशिक्षण एवं कौशल विकास:"],
  ["Placement Assistance:", "प्लेसमेंट सहायता:"],
  ["Industry Liaison:", "उद्योग संपर्क:"],
  ["Guidance and Counselling:", "मार्गदर्शन एवं परामर्श:"],
  ["Career Counseling Activities", "कैरियर परामर्श गतिविधियाँ"],
  ["Counseling and placement September 2023", "परामर्श एवं प्लेसमेंट सितंबर 2023"],
  ["Education and Job Portal", "शिक्षा एवं रोजगार पोर्टल"],
  ["Placement Brochure (s)", "प्लेसमेंट ब्रोशर"],
  ["Skills Development Resources", "कौशल विकास संसाधन"],
  ["Resume Making", "रिज्यूमे बनाना"],
  ["Email Writing", "ईमेल लेखन"],
  ["Language Fluency", "भाषा प्रवाह"],
  ["Vocabulary Skills", "शब्दावली कौशल"],
  ["Public Speaking", "सार्वजनिक भाषण"],
  ["Group Discussion ( Hindi English)", "समूह चर्चा (हिंदी अंग्रेजी)"],
  ["Leadership Skills", "नेतृत्व कौशल"],
  ["Communication Skills", "संचार कौशल"],
  ["Personality Development ( Hindi English )", "व्यक्तित्व विकास (हिंदी अंग्रेजी)"],
  ["Dress for Interview", "साक्षात्कार हेतु पोशाक"],
  ["Interview and its types", "साक्षात्कार एवं उसके प्रकार"],
  ["Mock Interview", "मॉक साक्षात्कार"],
  ["SSB Interview", "एस.एस.बी. साक्षात्कार"],
  ["Check your Trainability", "अपनी प्रशिक्षण योग्यता जाँचें"],
  ["Check Your Employability", "अपनी रोजगार योग्यता जाँचें"],
  ["Evaluate Your Personality", "अपने व्यक्तित्व का मूल्यांकन करें"],
  ["Interview Behaviour and Body language ( Hindi English )", "साक्षात्कार व्यवहार एवं शारीरिक भाषा (हिंदी अंग्रेजी)"],
  ["Phone Etiquettes", "फोन शिष्टाचार"],
  ["Self Confidence", "आत्मविश्वास"],
  ["Indian Agriculture Interview's Questions and Answers ( Hindi English )", "भारतीय कृषि साक्षात्कार प्रश्न एवं उत्तर (हिंदी अंग्रेजी)"],
  ["Download YouTube Video", "यूट्यूब वीडियो डाउनलोड"],
  ["Internship-A Pathway for Job Offer", "इंटर्नशिप — नौकरी प्रस्ताव का मार्ग"],
  ["Career Opportunities for CCS HAU Graduates", "सी.सी.एस. एच.ए.यू. स्नातकों हेतु कैरियर अवसर"],
  ["Banking Sector", "बैंकिंग क्षेत्र"],
  ["Defence and Paramilitary Forces", "रक्षा एवं अर्धसैनिक बल"],
  ["Indian Forest Services", "भारतीय वन सेवा"],
  ["Civil Services: UPSC & State Public Commission", "सिविल सेवाएँ: यूपीएससी एवं राज्य लोक सेवा आयोग"],
  [
    "Regional Staff Selection Commissions : Northern, Southern, Eastern and Western Region",
    "क्षेत्रीय कर्मचारी चयन आयोग: उत्तरी, दक्षिणी, पूर्वी एवं पश्चिमी क्षेत्र",
  ],
  [
    "Govt Jobs in: Agriculture, Agril Engineering, Home Science , Biotech & Basic Sciences",
    "सरकारी नौकरियाँ: कृषि, कृषि अभियंत्रण, गृह विज्ञान, बायोटेक एवं मूल विज्ञान",
  ],
  ["Central Scholarship Scheme", "केंद्रीय छात्रवृत्ति योजना"],
  ["PFMS Portal", "पी.एफ.एम.एस. पोर्टल"],
  ["MHRD Portal", "एम.एच.आर.डी. पोर्टल"],
  ["Dept of Employment,Haryana", "रोजगार विभाग, हरियाणा"],
  ["Study Abroad", "विदेश में अध्ययन"],
  ["Education Loan", "शिक्षा ऋण"],
  ["Get Your Passport", "अपना पासपोर्ट प्राप्त करें"],
  ["International Scholarships in Agriculture & Allied Sciences", "कृषि एवं संबद्ध विज्ञानों में अंतरराष्ट्रीय छात्रवृत्तियाँ"],
  ["Format for student's Information", "छात्र सूचना हेतु प्रारूप"],
  ["Format for student&#39;s Information", "छात्र सूचना हेतु प्रारूप"],
  ["Under Graduate", "स्नातक"],
  ["Post Graduate", "स्नातकोत्तर"],
  ["Conduct Report", "आचरण रिपोर्ट"],
  ["Study/Research Program (s)", "अध्ययन/अनुसंधान कार्यक्रम"],
  ["Under Graduate Programs", "स्नातक कार्यक्रम"],
  ["Post Graduate (Master & Doctorate) Programs", "स्नातकोत्तर (मास्टर एवं डॉक्टरेट) कार्यक्रम"],
  ["NET Examinations", "नेट परीक्षाएँ"],
  ["ICAR Entrance Exam : MSc/PhD", "आई.सी.ए.आर. प्रवेश परीक्षा : एम.एससी./पीएच.डी."],
  ["ASRB-NET", "ए.एस.आर.बी.-नेट"],
  ["CSIR-NET", "सी.एस.आई.आर.-नेट"],
  ["UGC-NET", "यू.जी.सी.-नेट"],
  ["A-Training:", "क-प्रशिक्षण:"],
  ["(i) Skill Improvement Trainings:", "(i) कौशल सुधार प्रशिक्षण:"],
  ["(ii) Job-Oriented/Technical Trainings :", "(ii) रोजगारोन्मुख/तकनीकी प्रशिक्षण:"],
  ["(iii) Competitive Exams Trainings:", "(iii) प्रतियोगी परीक्षा प्रशिक्षण:"],
  ["(C) Guidance to Students:", "(ग) छात्रों को मार्गदर्शन:"],
  ["Basic Computer Training", "बेसिक कंप्यूटर प्रशिक्षण"],
  ["Advanced Computer Skills", "उन्नत कंप्यूटर कौशल"],
  ["Auto CAD Training for Ag. Engg.", "कृषि अभियंत्रण हेतु ऑटो कैड प्रशिक्षण"],
  ["Communication Skills in English", "अंग्रेजी में संचार कौशल"],
  ["Personality Development", "व्यक्तित्व विकास"],
  ["SSB Training", "एस.एस.बी. प्रशिक्षण"],
  ["Group Discussions", "समूह चर्चाएँ"],
  ["Interview Preparatory Training", "साक्षात्कार तैयारी प्रशिक्षण"],
  ["Interview Specific Trainings", "साक्षात्कार विशिष्ट प्रशिक्षण"],
  ["Career Opportunities in Agriculture", "कृषि में कैरियर अवसर"],
  ["Software Component in Home Science", "गृह विज्ञान में सॉफ्टवेयर घटक"],
  ["Mushroom Production Technology", "मशरूम उत्पादन प्रौद्योगिकी"],
  ["Bio-fertilizer Production Technology", "जैव-उर्वरक उत्पादन प्रौद्योगिकी"],
  ["Quality Seeds Production and Marketing Management", "गुणवत्तापूर्ण बीज उत्पादन एवं विपणन प्रबंधन"],
  ["Food Processing Technology", "खाद्य प्रसंस्करण प्रौद्योगिकी"],
  ["Computer Aided Apparel Designing", "कंप्यूटर सहायित परिधान डिज़ाइन"],
  ["Value Addition & Quality Evaluation of Food products", "खाद्य उत्पादों का मूल्य संवर्धन एवं गुणवत्ता मूल्यांकन"],
  ["Floriculture and Landscaping", "फूलों की खेती एवं लैंडस्केपिंग"],
  ["Scientific Beekeeping", "वैज्ञानिक मधुमक्खी पालन"],
  ["Post Harvest Technology", "कटाई उपरांत प्रौद्योगिकी"],
  ["Integrated Pest Management", "एकीकृत कीट प्रबंधन"],
  ["ICAR-JRF for Agriculture & Allied Sciences", "कृषि एवं संबद्ध विज्ञानों हेतु आई.सी.ए.आर.-जे.आर.एफ."],
  ["Other Competitive Examinations", "अन्य प्रतियोगी परीक्षाएँ"],
  ["Placement", "प्लेसमेंट"],
  ["Trainings", "प्रशिक्षण"],
  ["Resume", "रिज्यूमे"],
  ["Outreach", "आउटरीच"],
];

const LABEL_HI = {
  "Head of Section": "अनुभाग प्रमुख",
  Faculty: "संकाय",
  "India & Global Agri. Jobs": "भारत एवं वैश्विक कृषि रोजगार",
  "Agro-Chemicals Industry": "कृषि-रासायनिक उद्योग",
  "Seed Industry": "बीज उद्योग",
  "Agril Machinery Industry": "कृषि मशीनरी उद्योग",
  "Tea & Plantation Industry": "चाय एवं बागान उद्योग",
  "Food & Health Care Industry": "खाद्य एवं स्वास्थ्य देखभाल उद्योग",
  "Agri-Rural Finance Industry": "कृषि-ग्रामीण वित्त उद्योग",
  "Agricultural Industry": "कृषि उद्योग",
};

const INDIA_JOBS_HI = `<p><a href="http://www.indiaagronet.com/Agriculture-Jobs" target="_blank">भारत में कृषि रोजगार देखने हेतु यहाँ क्लिक करें</a></p><p><a href="https://www.agcareers.com" target="_blank">वैश्विक कृषि रोजगार देखने हेतु यहाँ क्लिक करें</a></p>`;

function normalizeForMatch(html) {
  return html
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&rsquo;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&amp;/gi, "&");
}

function translateHtml(enHtml) {
  let out = normalizeForMatch(enHtml);
  const sorted = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of sorted) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  // Re-escape bare & that are not already entities (attributes/URLs)
  out = out.replace(/&(?![a-zA-Z#0-9]+;)/g, "&amp;");
  return out;
}

function leftoverEnglishRatio(html) {
  const plain = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
  const letters = plain.replace(/[^A-Za-z]/g, "");
  const total = plain.replace(/\s+/g, "").length || 1;
  return letters.length / total;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: page, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id,content_en,title_hi,excerpt_hi")
    .eq("id", PAGE_ID)
    .single();
  if (pageErr) throw pageErr;

  const content_hi = translateHtml(page.content_en || "");
  const ratio = leftoverEnglishRatio(content_hi);

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("content_hi len", content_hi.length, "leftover EN letter ratio", ratio.toFixed(3));
  console.log("preview:", content_hi.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 280));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_hi,
      title_hi: "परामर्श एवं प्लेसमेंट",
      excerpt_hi: "छात्र कल्याण निदेशालय के अंतर्गत परामर्श एवं प्लेसमेंट।",
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  if (error) throw error;
  console.log("OK page content_hi");

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,label_hi,content_en,content_hi")
    .eq("page_id", PAGE_ID);

  for (const row of sides ?? []) {
    const label_hi = LABEL_HI[row.label_en];
    if (!label_hi) continue;
    const patch = { label_hi, updated_at: now };
    if (row.label_en === "India & Global Agri. Jobs") {
      patch.content_hi = INDIA_JOBS_HI;
    }
    const { error: upErr } = await sb.from("ccshau_page_sidebar_items").update(patch).eq("id", row.id);
    if (upErr) throw upErr;
    console.log(`OK sidebar ${row.label_en} → ${label_hi}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
