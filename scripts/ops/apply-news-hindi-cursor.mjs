#!/usr/bin/env node
/**
 * Apply Hindi news titles (title_hi) using Cursor-curated translations — no external APIs.
 *
 * Usage:
 *   node scripts/ops/apply-news-hindi-cursor.mjs          # dry-run
 *   node scripts/ops/apply-news-hindi-cursor.mjs --apply   # write to DB
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

/** Exact title_en → title_hi (curated for all published gaps) */
const EXACT_TITLE_MAP = {
  "'Jan Bhagidari' events during India's G20 Presidency":
    "भारत की जी-20 अध्यक्षता के दौरान 'जन भागीदारी' कार्यक्रम",
  "16th IFSDAA International Conference on Role of Digital Technologies and Sustainable Approaches towards Agriculture, Environment and Health March 19-21, 2026":
    "16वां आईएफएसडीएए अंतर्राष्ट्रीय सम्मेलन: कृषि, पर्यावरण और स्वास्थ्य के लिए डिजिटल प्रौद्योगिकियों और सतत दृष्टिकोण की भूमिका, 19-21 मार्च 2026",
  "25th International Students  Summit on Food, Agriculture & Environment to be organized by Tokyo University of Agriculture, Japan":
    "टोक्यो विश्वविद्यालय ऑफ एग्रीकल्चर, जापान द्वारा आयोजित 25वां अंतर्राष्ट्रीय छात्र शिखर सम्मेलन: खाद्य, कृषि एवं पर्यावरण",
  "49th Vice-Chancellors' Convention": "49वां कुलपति सम्मेलन",
  "A.L. Fletcher Gold Medal Award": "ए.एल. फ्लेचर स्वर्ण पदक पुरस्कार",
  "ADVERTISEMENT FOR ENGAGEMENT OF PROFESSOR OF PRACTICE":
    "प्रैक्टिस प्रोफेसर की नियुक्ति हेतु विज्ञापन",
  "AICTE Approval 2023-24": "एआईसीटीई अनुमोदन 2023-24",
  "AICTE Approval Status 2023-24": "एआईसीटीई अनुमोदन स्थिति 2023-24",
  "Abstract Book of National Symposium on March 10, 2022":
    "10 मार्च 2022 को राष्ट्रीय संगोष्ठी की सारांश पुस्तिका",
  "Academic Calender 2023-24": "शैक्षणिक कैलेंडर 2023-24",
  "Academic Calender 2024-25": "शैक्षणिक कैलेंडर 2024-25",
  "Academic Calender 2026-27": "शैक्षणिक कैलेंडर 2026-27",
  "Academic Programme": "शैक्षणिक कार्यक्रम",
  "Academic Session Committee": "शैक्षणिक सत्र समिति",
  "Admission Bulletin for International/NRI Students":
    "अंतर्राष्ट्रीय/एनआरआई छात्रों के लिए प्रवेश बुलेटिन",
  "Admission notice 2027 COBSH": "प्रवेश सूचना 2027 सीओबीएसएच",
  "Admission notice for bakery & confectionary course":
    "बेकरी एवं कन्फेक्शनरी पाठ्यक्रम के लिए प्रवेश सूचना",
  "Admission notice for one year certificate course in Home Industry : Garment Construction and Hosiery for the year 2025-26":
    "गृह उद्योग: वस्त्र निर्माण एवं होज़री में एक वर्षीय प्रमाणपत्र पाठ्यक्रम हेतु प्रवेश सूचना 2025-26",
  "Advanced Training Course on Advances in Biology, Domestication and Management of Honey Bees and Native Pollinators":
    "मधुमक्खियों और देशी परागणकों के जीव विज्ञान, पालन और प्रबंधन में प्रगति पर उन्नत प्रशिक्षण पाठ्यक्रम",
  "Advertisement No. 1/2026": "विज्ञापन संख्या 1/2026",
  "Advertisement No. 2/2026": "विज्ञापन संख्या 2/2026",
  "Advisory on Heat Wave - Safety Measures": "लू की चेतावनी — सुरक्षा उपाय",
  "Announcement Brochure - Kaul": "घोषणा ब्रोशर — कौल",
  "Anti Ragging / Vigilance Committee": "रैगिंग विरोधी / सतर्कता समिति",
  "Anti Ragging Committee 2024": "रैगिंग विरोधी समिति 2024",
  "Anti Ragging Committee 2024-25": "रैगिंग विरोधी समिति 2024-25",
  "Anti Ragging Vigilance Committee": "रैगिंग विरोधी सतर्कता समिति",
  "Anti Ragging/Vigilance Committee": "रैगिंग विरोधी/सतर्कता समिति",
  "Anti Ragging/Vigilance Committee & Anti-Ragging Squad Committee":
    "रैगिंग विरोधी/सतर्कता समिति एवं रैगिंग विरोधी दस्ता समिति",
  "Anti-Ragging Committee": "रैगिंग विरोधी समिति",
  "Anti-Ragging Committee 2025-26": "रैगिंग विरोधी समिति 2025-26",
  "Anti-Ragging Committee for prevention of ragging in this college":
    "इस महाविद्यालय में रैगिंग की रोकथाम हेतु रैगिंग विरोधी समिति",
  "Applications Invited from Agri Startups under PM RKVY Scheme– Apply by 09 September":
    "पीएम आरकेवीवाई योजना के अंतर्गत कृषि स्टार्टअप्स से आवेदन आमंत्रित — 09 सितंबर तक आवेदन करें",
  "Approved the Students Grievances Redressal Committee (SGRC)":
    "छात्र शिकायत निवारण समिति (एसजीआरसी) को अनुमोदित",
  "Approved the following Committee for supply of soft copy of Grey Literature to Nehru Library":
    "नेहरू पुस्तकालय को ग्रे साहित्य की सॉफ्ट कॉपी उपलब्ध कराने हेतु निम्नलिखित समिति को अनुमोदित",
  "Approved the following Equal Opportunity Cell":
    "निम्नलिखित समान अवसर प्रकोष्ठ को अनुमोदित",
  "Award of A. L. Fletcher Gold Medal 2024-25": "ए.एल. फ्लेचर स्वर्ण पदक 2024-25 का वितरण",
  "Award of Dr. P. S. Lamba Gold Medal": "डॉ. पी.एस. लांबा स्वर्ण पदक का वितरण",
  "Award of Dr. P. S. Lamba Gold Medal 2024-25": "डॉ. पी.एस. लांबा स्वर्ण पदक 2024-25 का वितरण",
  "Award of Dr. Savita Singal Gold Medal, Dr. V. D. Kashyap Gold Medal, Silver Jubilee Gold Medal for women, Dr. R. N. Pal Memorial Gold Medal & Sardar Patel Award for the year 2021-22":
    "डॉ. सविता सिंगल स्वर्ण पदक, डॉ. वी.डी. कश्यप स्वर्ण पदक, महिलाओं के लिए रजत जयंती स्वर्ण पदक, डॉ. आर.एन. पाल स्मारक स्वर्ण पदक एवं सरदार पटेल पुरस्कार 2021-22 का वितरण",
  "Award of Dr. V. D. Kashyap Gold Medal, Silver Jubilee Gold Medal for women, Dr. R. N. Pal Memorial Gold Medal & Sardar Patel Award for the year 2021-22":
    "डॉ. वी.डी. कश्यप स्वर्ण पदक, महिलाओं के लिए रजत जयंती स्वर्ण पदक, डॉ. आर.एन. पाल स्मारक स्वर्ण पदक एवं सरदार पटेल पुरस्कार 2021-22 का वितरण",
  "Award of Prof. Rattan Lal Gold Medal for the year 2021-22":
    "प्रो. रतन लाल स्वर्ण पदक 2021-22 का वितरण",
  "Breeder Seed available for Rabi Crops 2025-26": "रबी फसलों के लिए ब्रीडर बीज उपलब्ध 2025-26",
  Brochure: "ब्रोशर",
  "Calander 2023": "कैलेंडर 2023",
  "Campus Beautification Committee": "परिसर सौंदर्यीकरण समिति",
  "Certificate NIRF Ranking 2023": "एनआईआरएफ रैंकिंग प्रमाणपत्र 2023",
  "Change of nomenclature of Department of Zoology & Aquaculture to Department of Zoology":
    "प्राणी विज्ञान एवं जलीय कृषि विभाग का नामकरण प्राणी विज्ञान विभाग में परिवर्तन",
  "College  Campus Beautification Committee": "महाविद्यालय परिसर सौंदर्यीकरण समिति",
  "College  Level Internal Complaints Committee": "महाविद्यालय स्तरीय आंतरिक शिकायत समिति",
  "College Level Internal Complaints Committee": "महाविद्यालय स्तरीय आंतरिक शिकायत समिति",
  "College Purchase Committee": "महाविद्यालय खरीद समिति",
  "Committee for SC-ST": "अनुसूचित जाति-जनजाति समिति",
  "Committee for SCST 2024-25": "अनुसूचित जाति-जनजाति समिति 2024-25",
  "Committee for implementing various activities to meet out 'the Vision to make India a Developed Nation by 2047'":
    "'2047 तक भारत को विकसित राष्ट्र बनाने' की दृष्टि को पूरा करने हेतु विभिन्न गतिविधियों की क्रियान्वयन समिति",
  "Committee for upgradation of information of faculty on website":
    "वेबसाइट पर संकाय की जानकारी के उन्नयन हेतु समिति",
  "Committee of Student Counselor": "छात्र परामर्शदाता समिति",
  "Committee- Gender Champions": "समिति — जेंडर चैंपियन",
  "Committees of the College": "महाविद्यालय की समितियाँ",
  "Committees of the College 2024-25": "महाविद्यालय की समितियाँ 2024-25",
  "Constitute the following Committee for 'the Vision to make India a Developed Nation by 2047'":
    "'2047 तक भारत को विकसित राष्ट्र बनाने' की दृष्टि हेतु निम्नलिखित समिति का गठन",
  "Constitute the following Committee for opening  the tenders/finalize the rates of field operations":
    "निविदाएँ खोलने/क्षेत्रीय कार्यों की दरों को अंतिम रूप देने हेतु निम्नलिखित समिति का गठन",
  "Constitute the following Committee for upgradation  information of university website":
    "विश्वविद्यालय वेबसाइट की जानकारी के उन्नयन हेतु निम्नलिखित समिति का गठन",
  "Constitute the following Departmental Advisory Committee":
    "निम्नलिखित विभागीय सलाहकार समिति का गठन",
  "Constitute the following Inspection Committee for the office of Dean and all Departments of COBS&H":
    "डीन कार्यालय और सीओबीएसएच के सभी विभागों के लिए निम्नलिखित निरीक्षण समिति का गठन",
  "Constitute the following committees for the smooth conductance of UG programmes":
    "स्नातक कार्यक्रमों के सुचारु संचालन हेतु निम्नलिखित समितियों का गठन",
  "Constitution of College Campus Beautification Committee":
    "महाविद्यालय परिसर सौंदर्यीकरण समिति का गठन",
  "Constitution of College Canteen Review Committee":
    "महाविद्यालय कैंटीन समीक्षा समिति का गठन",
  "Constitution of College Chemical and Biosafety Committee (CCBC)":
    "महाविद्यालय रासायनिक एवं जैव सुरक्षा समिति (सीसीबीसी) का गठन",
  "Constitution of College Magazine Committee": "महाविद्यालय पत्रिका समिति का गठन",
  "Constitution of College Wall Magazine Committee": "महाविद्यालय दीवार पत्रिका समिति का गठन",
  "Constitution of College of Award and Ranking Committee":
    "महाविद्यालय पुरस्कार एवं रैंकिंग समिति का गठन",
  "Constitution of Cultural Forum Committee for the year 2022-23":
    "वर्ष 2022-23 के लिए सांस्कृतिक मंच समिति का गठन",
  "Constitution of Department Purchase Committee for the year 2022-23":
    "वर्ष 2022-23 के लिए विभागीय खरीद समिति का गठन",
  "Constitution of Drug Prevention Committee": "नशा निवारण समिति का गठन",
  "Constitution of Internal Quality Assurance Cell (IQAC)":
    "आंतरिक गुणवत्ता आश्वासन प्रकोष्ठ (आईक्यूएसी) का गठन",
  "Constitution of Internal Quality Assurance Cells (IQACs)":
    "आंतरिक गुणवत्ता आश्वासन प्रकोष्ठों (आईक्यूएसी) का गठन",
  "Constitution of Landscape Committee": "भूदृश्य समिति का गठन",
  "Constitution of Nodal DHAKAD, Senior DHAKAD & DHAKAD Committee":
    "नोडल ढक्कड़, वरिष्ठ ढक्कड़ एवं ढक्कड़ समिति का गठन",
  "Constitution of Sports Committee": "खेल समिति का गठन",
  "Constitution of Supervisory Committee for cleanliness of College":
    "महाविद्यालय की स्वच्छता हेतु पर्यवेक्षी समिति का गठन",
  "Continued to provide the services in the University till further orders of M/s Impressions Services Pvt. Ltd., Delhi and M/s Sai Ram Security and  Placement Service, Hisar":
    "एम/एस इंप्रेशन्स सर्विसेज प्रा. लि., दिल्ली और एम/एस साई राम सिक्योरिटी एंड प्लेसमेंट सर्विस, हिसार को विश्वविद्यालय में सेवाएँ आगे के आदेशों तक जारी रखने हेतु",
  "Continued to provide the services of  M/s Impressions Services Pvt. Ltd., Delhi and M/s Sai Ram Security and  Placement Service, Hisar":
    "एम/एस इंप्रेशन्स सर्विसेज प्रा. लि., दिल्ली और एम/एस साई राम सिक्योरिटी एंड प्लेसमेंट सर्विस, हिसार की सेवाएँ जारी रखने संबंधी",
  "Corrigendum University Level Gold Medal for the year 2021-22":
    "शुद्धिपत्र: विश्वविद्यालय स्तरीय स्वर्ण पदक 2021-22",
  "DELNET Resources": "डेलनेट संसाधन",
  "Daily reporting for KVKs": "कृषि विज्ञान केंद्रों के लिए दैनिक रिपोर्टिंग",
  "Date Sheet of PGS Courses for Summer session (Final Exam.) 2nd semester 2022-23 starting w.e.f. 17.07.2023":
    "ग्रीष्म सत्र (अंतिम परीक्षा) पीजीएस पाठ्यक्रमों की तिथि-पत्रिका, द्वितीय सेमेस्टर 2022-23, 17.07.2023 से प्रारंभ",
  "Dean's office staff detail": "डीन कार्यालय कर्मचारी विवरण",
  "Destruction of old records Department of Biochemistry":
    "जैव रसायन विभाग के पुराने अभिलेखों का नष्टीकरण",
  "Destruction of old records for College of Community Science":
    "सामुदायिक विज्ञान महाविद्यालय के पुराने अभिलेखों का नष्टीकरण",
  "Digital Library": "डिजिटल पुस्तकालय",
  "Director of DHRM  is nominated as Nodal Officer/Meditation Ambassador":
    "डीएचआरएम के निदेशक को नोडल अधिकारी/ध्यान राजदूत के रूप में नामित",
  "Disposal of old obsolete I.T. Products/Electronics items Computers media etc. -Condemned items":
    "पुराने अप्रचलित आई.टी. उत्पाद/इलेक्ट्रॉनिक्स वस्तुएँ, कंप्यूटर मीडिया आदि का निपटान — निष्प्रयोज्य वस्तुएँ",
  "Download Nomination Form": "नामांकन प्रपत्र डाउनलोड करें",
  "Dr. P. S. Lamba Gold medal award": "डॉ. पी.एस. लांबा स्वर्ण पदक पुरस्कार",
  'Dr. Rajive Kumar Pateria, Prof. as  Nodal Officer for "Jan Samvaad Portal"':
    'डॉ. राजीव कुमार पटेरिया, प्रो. को "जन संवाद पोर्टल" के नोडल अधिकारी के रूप में',
  "Education and Job Portal": "शिक्षा एवं रोजगार पोर्टल",
  "Engineering Admission": "इंजीनियरिंग प्रवेश",
  "Equal Opportunity  Cell": "समान अवसर प्रकोष्ठ",
  "Equal Opportunity Cell": "समान अवसर प्रकोष्ठ",
  "Exam Coordinator Commiittee": "परीक्षा समन्वयक समिति",
  "Extended date of  Dr. Savita Singal Gold Medal for the year 2021-22":
    "डॉ. सविता सिंगल स्वर्ण पदक 2021-22 की तिथि में विस्तार",
  "Extended date of Award of Dr. (Mrs.) Saroj Kashyab Gold Medal for the year 2021-22":
    "डॉ. (श्रीमती) सरोज कश्यप स्वर्ण पदक 2021-22 के वितरण की तिथि में विस्तार",
  "Extended date of Gold Medal/Awards to Ph.D. students for the year 2021-22":
    "पीएच.डी. छात्रों को स्वर्ण पदक/पुरस्कार 2021-22 की तिथि में विस्तार",
  "Extended date of Prof. Rattan Lal Gold Medal for the year 2021-22":
    "प्रो. रतन लाल स्वर्ण पदक 2021-22 की तिथि में विस्तार",
  "Extended date of Sardar Patel Award (Ph.D. Students) 2021-22":
    "सरदार पटेल पुरस्कार (पीएच.डी. छात्र) 2021-22 की तिथि में विस्तार",
  "Faculty Club Advisory Committee": "संकाय क्लब सलाहकार समिति",
  "Fee for the visitors visiting this museum in Gandhi Bhawan":
    "गांधी भवन में इस संग्रहालय में आने वाले दर्शकों के लिए शुल्क",
  "Gold Medals for the year 2021-22": "वर्ष 2021-22 के स्वर्ण पदक",
  "Grievances Committee for non-teaching employees":
    "गैर-शिक्षण कर्मचारियों की शिकायत समिति",
  "HRMS Nodal Officer": "एचआरएमएस नोडल अधिकारी",
  "Handbook on Basics of Cyber Hygiene for Higher Education Institutions":
    "उच्च शिक्षा संस्थानों के लिए साइबर स्वच्छता की मूल बातों पर पुस्तिका",
  "Honorarium for outside Experts/Scientist/Retired Professor to deliver the lecture in PG Course of Botany":
    "वनस्पति विज्ञान के स्नातकोत्तर पाठ्यक्रम में व्याख्यान हेतु बाहरी विशेषज्ञ/वैज्ञानिक/सेवानिवृत्त प्रोफेसर का सम्मानी",
  "House Allotment Committee for the year 2025": "वर्ष 2025 के लिए आवास आवंटन समिति",
  "ICAR Accreditation 2018": "आईसीएआर मान्यता 2018",
  "IQAC-APAR form": "आईक्यूएसी-एपीएआर प्रपत्र",
  "Incentive Distribution Programme": "प्रोत्साहन वितरण कार्यक्रम",
  "Information about college": "महाविद्यालय के बारे में जानकारी",
  "Inspection Committee for DCOBS&H": "डीसीओबीएसएच के लिए निरीक्षण समिति",
  "Inspection Committee for making recommendation for declaring the store articles as unserviceable":
    "भंडार वस्तुओं को अनुपयोगी घोषित करने की सिफारिश हेतु निरीक्षण समिति",
  "Institution Industry Cell": "संस्थान उद्योग प्रकोष्ठ",
  "Institutional Ethical Committee for experiment on animals":
    "पशुओं पर प्रयोग हेतु संस्थागत नैतिक समिति",
  "Invitation of Ph.D Students for dual degree Programme at Western Sydney University Australia and CCS HAU, Hisar 2026-27":
    "वेस्टर्न सिडनी विश्वविद्यालय, ऑस्ट्रेलिया और सीसीएस एचएयू, हिसार 2026-27 में दोहरी डिग्री कार्यक्रम हेतु पीएच.डी. छात्रों का आमंत्रण",
  "Invitation of Ph.D students for dual degree programme at Western Sydney University, Australia and CCSHAU, Hisar 2026-27.":
    "वेस्टर्न सिडनी विश्वविद्यालय, ऑस्ट्रेलिया और सीसीएसएचएयू, हिसार 2026-27 में दोहरी डिग्री कार्यक्रम हेतु पीएच.डी. छात्रों का आमंत्रण",
  "Invitation of Phd Students for Dual Degree at Western Sydney University":
    "वेस्टर्न सिडनी विश्वविद्यालय में दोहरी डिग्री हेतु पीएच.डी. छात्रों का आमंत्रण",
  "Invitation of Tokyo NODAI Exchange Scholarship 2025 for Ph.D. at Tokyo University of Agriculture, Tokyo Japan":
    "टोक्यो विश्वविद्यालय ऑफ एग्रीकल्चर, टोक्यो, जापान में पीएच.डी. हेतु टोक्यो नोदाई एक्सचेंज छात्रवृत्ति 2025 का आमंत्रण",
  "List of Faculty members 2023": "संकाय सदस्यों की सूची 2023",
  "List of Training and Tentative Schedule to be organized for SC/ST Candidates during the year 2021-22":
    "वर्ष 2021-22 के दौरान अनुसूचित जाति/जनजाति उम्मीदवारों के लिए आयोजित होने वाले प्रशिक्षण और संभावित कार्यक्रम",
  "Members of Internal Quality Assesment Cell": "आंतरिक गुणवत्ता मूल्यांकन प्रकोष्ठ के सदस्य",
  "Menance of Ragging": "रैगिंग की समस्या",
  "MoU Committee": "समझौता ज्ञापन (एमओयू) समिति",
  "NCC Girls 2025-26": "एनसीसी लड़कियाँ 2025-26",
  "NIRF (COA)-2023 (Agriculture & allied sector category)":
    "एनआईआरएफ (सीओए)-2023 (कृषि एवं संबद्ध क्षेत्र श्रेणी)",
  "NIRF (COA)-2024 (College category)": "एनआईआरएफ (सीओए)-2024 (महाविद्यालय श्रेणी)",
  "NIRF (COA)-2026": "एनआईआरएफ (सीओए)-2026",
  "NIRF (COAE)-2020": "एनआईआरएफ (सीओएई)-2020",
  "NIRF (COAE)-2023": "एनआईआरएफ (सीओएई)-2023",
  "NIRF (COAE)-2024": "एनआईआरएफ (सीओएई)-2024",
  "NIRF (COAE)-2025": "एनआईआरएफ (सीओएई)-2025",
  "NIRF (COBS&H)-2020": "एनआईआरएफ (सीओबीएसएच)-2020",
  "NIRF (COBS&H)-2026": "एनआईआरएफ (सीओबीएसएच)-2026",
  "NIRF (COCS)-2025 (College category)": "एनआईआरएफ (सीओसीएस)-2025 (महाविद्यालय श्रेणी)",
  "NIRF (COHS)-2020": "एनआईआरएफ (सीओएचएस)-2020",
  "NIRF (COHS)-2021": "एनआईआरएफ (सीओएचएस)-2021",
  "NIRF (COHS)-2022": "एनआईआरएफ (सीओएचएस)-2022",
  "NIRF (COHS)-2023": "एनआईआरएफ (सीओएचएस)-2023",
  "NIRF (CoA)-2020": "एनआईआरएफ (सीओए)-2020",
  "NIRF Ranking Certificate": "एनआईआरएफ रैंकिंग प्रमाणपत्र",
  "NIRF(COA)-2023 (College category)": "एनआईआरएफ (सीओए)-2023 (महाविद्यालय श्रेणी)",
  "National Essay writing Competition -2026": "राष्ट्रीय निबंध लेखन प्रतियोगिता -2026",
  "Nominated as coordinator for smooth conduct of UG & PG classes":
    "स्नातक एवं स्नातकोत्तर कक्षाओं के सुचारु संचालन हेतु समन्वयक के रूप में नामित",
  "Nominating Coordinator for DHKSHA/Orientation Programme of Fresh UG Students":
    "नए स्नातक छात्रों के ढक्शा/ओरिएंटेशन कार्यक्रम हेतु समन्वयक की नामांकन",
  "Nomination for CCSHAU Life Achievement Award for biennial 2021-22 & 2023-24":
    "द्विवार्षिक 2021-22 एवं 2023-24 के लिए सीसीएसएचएयू जीवन उपलब्धि पुरस्कार हेतु नामांकन",
  "Nomination for working as Sport Coordinator of COBS&H":
    "सीओबीएसएच के खेल समन्वयक के रूप में कार्य हेतु नामांकन",
  "Nomination of Nodal Officer for Anti Ragging Committee":
    "रैगिंग विरोधी समिति के लिए नोडल अधिकारी की नामांकन",
  "Nomination of Senior Welfare Officer/Welfare Officer":
    "वरिष्ठ कल्याण अधिकारी/कल्याण अधिकारी की नामांकन",
  "Nomination of UG student (III Year) for attending 25th International Students Summit on Food, Agriculture & Environment":
    "खाद्य, कृषि एवं पर्यावरण पर 25वें अंतर्राष्ट्रीय छात्र शिखर सम्मेलन में भाग लेने हेतु स्नातक छात्र (तीसरी वर्ष) की नामांकन",
  "Offering of Courses during 2nd Semester 2021-22":
    "द्वितीय सेमेस्टर 2021-22 के दौरान पाठ्यक्रमों की पेशकश",
  "Online Admission 2026-27": "ऑनलाइन प्रवेश 2026-27",
  "Online Prime Minister Internship Scheme (PMIS)":
    "ऑनलाइन प्रधानमंत्री इंटर्नशिप योजना (पीएमआईएस)",
  "Order regarding extension of the contract regarding engagement of part time workers and manpower in CCS HAU, Hisar":
    "सीसीएस एचएयू, हिसार में अंशकालिक कर्मचारियों और जनशक्ति की नियुक्ति संबंधी अनुबंध के विस्तार पर आदेश",
  "Prevention of Caste-Based Discrimination in Higher Education Institutions-reg.":
    "उच्च शिक्षा संस्थानों में जाति आधारित भेदभाव की रोकथाम — संबंधित",
  "Prevention of Sexual Harassment Committee": "यौन उत्पीड़न रोकथाम समिति",
  "Preventive Measures to Avoid Fire incidents in the University":
    "विश्वविद्यालय में अग्नि दुर्घटनाओं से बचाव हेतु निवारक उपाय",
  "Preventive measures to strengthen the Campus Security":
    "परिसर सुरक्षा को मजबूत करने हेतु निवारक उपाय",
  "Proforma for Identity Card": "पहचान पत्र हेतु प्रपत्र",
  "Proforma for Identity Cards": "पहचान पत्रों हेतु प्रपत्र",
  "Project Review Committee": "परियोजना समीक्षा समिति",
  "Project Review Committee (PRC)": "परियोजना समीक्षा समिति (पीआरसी)",
  "Purchases through GEM/e-tendering": "जीईएम/ई-निविदा के माध्यम से खरीद",
  "Rabi Seed Available at Director Farm": "निदेशक फार्म पर रबी बीज उपलब्ध",
  "Rate of Farm produce": "कृषि उत्पादों की दर",
  "Re-constitute the following College Level Committee for Award and Ranking of the College":
    "महाविद्यालय के पुरस्कार और रैंकिंग हेतु निम्नलिखित महाविद्यालय स्तरीय समिति का पुनर्गठन",
  "Reconstitute the following Committee as Award and Ranking Cell of the Univeristy":
    "निम्नलिखित समिति का विश्वविद्यालय के पुरस्कार और रैंकिंग प्रकोष्ठ के रूप में पुनर्गठन",
  "Reconstitution of Project Monitoring Committee": "परियोजना निगरानी समिति का पुनर्गठन",
  "Refresher Course on Education Technology from February 18 to March 10, 2026":
    "शिक्षा प्रौद्योगिकी पर रिफ्रेशर कोर्स, 18 फरवरी से 10 मार्च 2026",
  "Regarding India's Presidency of G20": "भारत की जी-20 अध्यक्षता के संबंध में",
  "Regarding Intimation about Transfer/Deputation of University Employees":
    "विश्वविद्यालय कर्मचारियों के स्थानांतरण/प्रतिनियुक्ति की सूचना के संबंध में",
  "Regarding Monitoring grievances/concerns related to Examinations and Academic Calendar in view COVID-19 pandemic - Formation of Grievance Committee thereof":
    "कोविड-19 महामारी के दृष्टिगत परीक्षाओं और शैक्षणिक कैलेंडर से संबंधित शिकायतों/चिंताओं की निगरानी — उसकी शिकायत समिति का गठन",
  "Regarding extension of the contract for  providing  security to CCSHAU, Main Campus, Director Farm, RDS Farm including Kaul and Bawal":
    "सीसीएसएचएयू, मुख्य परिसर, निदेशक फार्म, आरडीएस फार्म सहित कौल और बावल को सुरक्षा प्रदान करने के अनुबंध के विस्तार के संबंध में",
  "Regarding extension of the contract for providing the manpower to Cleaning/Sweeping works":
    "सफाई/झाड़ू-पोछा कार्यों हेतु जनशक्ति प्रदान करने के अनुबंध के विस्तार के संबंध में",
  "Regarding extension of the contract for providing the manpower to Office/Hospitality and Lab./Technical works.":
    "कार्यालय/आतिथ्य और प्रयोगशाला/तकनीकी कार्यों हेतु जनशक्ति प्रदान करने के अनुबंध के विस्तार के संबंध में",
  "Regarding intimation about Transfer/Deputation of University Employees":
    "विश्वविद्यालय कर्मचारियों के स्थानांतरण/प्रतिनियुक्ति की सूचना के संबंध में",
  "Regarding review of performance of services provided by the following agencies":
    "निम्नलिखित एजेंसियों द्वारा प्रदान की गई सेवाओं के प्रदर्शन की समीक्षा के संबंध में",
  "Register here for CCSHAU Alumni Details": "सीसीएसएचएयू पूर्व छात्र विवरण के लिए यहाँ पंजीकरण करें",
  "Requirement of part-time teachers in Campus School":
    "कैंपस स्कूल में अंशकालिक शिक्षकों की आवश्यकता",
  "Research Papers from College of Agriculture (NAAS Rating>7)":
    "कृषि महाविद्यालय से शोध पत्र (एनएएएस रेटिंग>7)",
  "Revised Academic Calendar 2024-25": "संशोधित शैक्षणिक कैलेंडर 2024-25",
  "Revised Anti-Ragging Committee 2025-26": "संशोधित रैगिंग विरोधी समिति 2025-26",
  "Revised Time table for 2nd Sem. 2023-24": "द्वितीय सेमेस्टर 2023-24 के लिए संशोधित समय सारणी",
  "Revised rates of plants": "पौधों की संशोधित दरें",
  "Revision of rates of eatables of Faculty House Complex":
    "संकाय हाउस परिसर के खाद्य पदार्थों की दरों का संशोधन",
  "SPARC Sponsored International Conference on Deciphering the Potential of Climate - Resilient Functional Crops for Sustainable Agriculture and Agro-Industries (DPCFC-SAAI-2026)":
    "जलवायु-सहनशील कार्यात्मक फसलों की क्षमता का विश्लेषण: सतत कृषि और कृषि-उद्योगों हेतु (डीपीसीएफसी-एसएएआई-2026) — एसपार्क प्रायोजित अंतर्राष्ट्रीय सम्मेलन",
  "SPARC-MHRD Sponsored International Training cum Workshop":
    "एसपार्क-एमएचआरडी प्रायोजित अंतर्राष्ट्रीय प्रशिक्षण सह कार्यशाला",
  "Sale of Farm Commodity Ram Dhan Singh Seed Farm":
    "राम धन सिंह बीज फार्म से कृषि वस्तु की बिक्री",
  "Sale of farm produce": "कृषि उत्पाद की बिक्री",
  "Sardar Patel Award (Faculty) for the year 2023-24":
    "सरदार पटेल पुरस्कार (संकाय) वर्ष 2023-24",
  "Sardar Patel Award (Faculty) for the year 2024-25":
    "सरदार पटेल पुरस्कार (संकाय) वर्ष 2024-25",
  "Sardar Patel Award (Non-teaching Employee) for the financial year 2023-24":
    "सरदार पटेल पुरस्कार (गैर-शिक्षण कर्मचारी) वित्तीय वर्ष 2023-24",
  "Sardar Patel Award (Ph.D. Students) 2021-22":
    "सरदार पटेल पुरस्कार (पीएच.डी. छात्र) 2021-22",
  "Selection criteria of Assistant Professor/equivalent":
    "सहायक प्रोफेसर/समकक्ष की चयन मानदंड",
  "Senior Research Fellow (SRF) Recuirtment  Collefe of Agriculture":
    "कृषि महाविद्यालय में वरिष्ठ अनुसंधान सहायक (एसआरएफ) की भर्ती",
  "Senior Research Fellow (SRF) Recuirtment Collefe of Agriculture":
    "कृषि महाविद्यालय में वरिष्ठ अनुसंधान सहायक (एसआरएफ) की भर्ती",
  "Senior Research Fellow (SRF) Recuirtment College of Basis Science & Humanities":
    "मूल विज्ञान एवं मानविकी महाविद्यालय में वरिष्ठ अनुसंधान सहायक (एसआरएफ) की भर्ती",
  "Sexual Harassment Committee": "यौन उत्पीड़न समिति",
  "Sexual Harassment of women": "महिलाओं का यौन उत्पीड़न",
  "Souvnir National Seminar on Innovative Strategies for Gender Equality":
    "लिंग समानता के लिए नवीन रणनीतियों पर राष्ट्रीय संगोष्ठी स्मारिका",
  "Student on Roll (2018-19 to 2022-23)": "नामांकित छात्र (2018-19 से 2022-23)",
  "Students Grievances  Redressal Committee (SGRC)":
    "छात्र शिकायत निवारण समिति (एसजीआरसी)",
  "Summer Time Table": "ग्रीष्मकालीन समय सारणी",
  "Survey Report on Insect-Pests of Cotton": "कपास के कीट-पीड़कों पर सर्वेक्षण रिपोर्ट",
  "TRAININGS CONDUCTED UNDER CENRE OF ADVANCED FACULTY TRAINING PROGRAMME":
    "उन्नत संकाय प्रशिक्षण कार्यक्रम केंद्र के अंतर्गत आयोजित प्रशिक्षण",
  'Technical bulletin on "Trends in Area, Production and Productivity of Rice, Wheat, Pulses and Oilseeds-Global, India and Haryana Perspective"':
    '"धान, गेहूँ, दलहन और तिलहन के क्षेत्र, उत्पादन और उत्पादकता के रुझान — वैश्विक, भारत और हरियाणा परिप्रेक्ष्य" पर तकनीकी बुलेटिन',
  'The Incharge , Technical Publication & Information Cell is  Nodal Officer of "Rajyapal - Vikas ke Rajdoot"':
    'तकनीकी प्रकाशन एवं सूचना प्रकोष्ठ के प्रभारी को "राज्यपाल — विकास के राजदूत" के नोडल अधिकारी के रूप में',
  "To avoid fire incidents in the University - Preventive measure thereof.":
    "विश्वविद्यालय में अग्नि दुर्घटनाओं से बचाव — उसके निवारक उपाय",
  "Training on Graphics with Abode Photoshop and Auto CAD Designing for UG & PG Students":
    "स्नातक एवं स्नातकोत्तर छात्रों के लिए एडोब फोटोशॉप और ऑटो कैड डिजाइनिंग पर प्रशिक्षण",
  "UG Courses offered for odd Semester 2026-2027":
    "विषम सेमेस्टर 2026-2027 के लिए प्रस्तावित स्नातक पाठ्यक्रम",
  "Varieties of CCSHAU Continued Efforts Towards Food Security":
    "खाद्य सुरक्षा की दिशा में सीसीएसएचएयू की निरंतर प्रयासों की किस्में",
  "Web Portal for Career Opportunities": "करियर अवसरों के लिए वेब पोर्टल",
  "YP-II Recruitment in the project college of agriculture":
    "कृषि महाविद्यालय की परियोजना में वाईपी-II की भर्ती",
  "Young Professional (YP-I) & Young Professional (YP-II )Recuirtment College of Agriculture":
    "कृषि महाविद्यालय में यंग प्रोफेशनल (वाईपी-I) एवं यंग प्रोफेशनल (वाईपी-II) की भर्ती",
  "Young Professional (YP-I) Recuirtment College of Agriculture":
    "कृषि महाविद्यालय में यंग प्रोफेशनल (वाईपी-I) की भर्ती",
};

const DEVANAGARI = /[\u0900-\u097F]/;

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

function translateTitle(titleEn) {
  if (!titleEn) return null;
  const exact = EXACT_TITLE_MAP[titleEn];
  if (exact) return exact;
  return null;
}

function needsHindi(row) {
  return !row.title_hi || !DEVANAGARI.test(row.title_hi);
}

async function main() {
  const { data: rows, error } = await supabase
    .from("ccshau_news")
    .select("id, title_en, title_hi")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;

  const pending = rows.filter(needsHindi);
  const updates = [];
  const missing = new Set();

  for (const row of pending) {
    const titleHi = translateTitle(row.title_en);
    if (titleHi && DEVANAGARI.test(titleHi)) {
      updates.push({ id: row.id, title_hi: titleHi });
    } else {
      missing.add(row.title_en);
    }
  }

  console.log(`Published news missing Hindi: ${pending.length}`);
  console.log(`Translations ready: ${updates.length}`);
  console.log(`Unique titles without mapping: ${missing.size}`);

  if (missing.size > 0) {
    console.log("\nUnmapped titles:");
    for (const t of [...missing].sort()) console.log(`  - ${t}`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    if (updates.length > 0) {
      console.log("\nSample updates:");
      for (const u of updates.slice(0, 5)) {
        const row = rows.find((r) => r.id === u.id);
        console.log(`  EN: ${row?.title_en}`);
        console.log(`  HI: ${u.title_hi}\n`);
      }
    }
    return;
  }

  let applied = 0;
  for (const batch of chunk(updates, 25)) {
    for (const u of batch) {
      const { error: upErr } = await supabase
        .from("ccshau_news")
        .update({ title_hi: u.title_hi })
        .eq("id", u.id);
      if (upErr) throw upErr;
      applied++;
    }
  }
  console.log(`Applied ${applied} title_hi updates.`);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
