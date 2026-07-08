import type { PublicNavItem } from "@/lib/data/public-types";
import { university } from "@/lib/mock/site-content";

/** Demo navigation for Option A — Heritage Premium (client presentations). */
export const OPTION_A_BASE = "/design/option-a";

export const optionANavItems: PublicNavItem[] = [
  {
    labelEn: "Home",
    labelHi: "होम",
    href: OPTION_A_BASE,
  },
  {
    labelEn: "News",
    labelHi: "समाचार",
    href: `${OPTION_A_BASE}/news`,
  },
  {
    labelEn: "Circulars",
    labelHi: "परिपत्र",
    href: `${OPTION_A_BASE}/circulars`,
  },
  {
    labelEn: "Tenders",
    labelHi: "निविदाएं",
    href: `${OPTION_A_BASE}/tenders`,
  },
  {
    labelEn: "Contact",
    labelHi: "संपर्क",
    href: `${OPTION_A_BASE}/contact`,
  },
];

export const optionADemoNews = [
  {
    id: 1,
    category: "Admissions",
    categoryHi: "प्रवेश",
    titleEn: "Online Admission 2026–27 — UG & PG programmes open",
    titleHi: "ऑनलाइन प्रवेश 2026–27 — स्नातक और स्नातकोत्तर कार्यक्रम खुले",
    date: "08 Jul 2026",
    excerptEn:
      "Applications are invited for undergraduate and postgraduate programmes across colleges at Hisar, Kaul and Bawal.",
  },
  {
    id: 2,
    category: "Notice",
    categoryHi: "सूचना",
    titleEn: "Revised Academic Calendar 2026–27 published",
    titleHi: "संशोधित शैक्षणिक कैलेंडर 2026–27 प्रकाशित",
    date: "05 Jul 2026",
    excerptEn:
      "The Registrar has notified the revised academic calendar including examination schedules and vacation periods.",
  },
  {
    id: 3,
    category: "Recruitment",
    categoryHi: "भर्ती",
    titleEn: "Senior Research Fellow positions — Directorate of Research",
    titleHi: "वरिष्ठ शोध फेलो पद — अनुसंधान निदेशालय",
    date: "02 Jul 2026",
    excerptEn: "Walk-in interviews for SRF positions under ICAR-funded projects at CCSHAU Hisar.",
  },
  {
    id: 4,
    category: "Event",
    categoryHi: "कार्यक्रम",
    titleEn: "Kisan Mela and Farm Innovation showcase — August 2026",
    titleHi: "किसान मेला और कृषि नवाचार प्रदर्शनी — अगस्त 2026",
    date: "28 Jun 2026",
    excerptEn:
      "Annual Kisan Mela will feature live crop demonstrations, farmer awards and technology stalls.",
  },
  {
    id: 5,
    category: "Notice",
    categoryHi: "सूचना",
    titleEn: "Heat Wave Advisory — Safety Measures for campus & farms",
    titleHi: "लू संबंधी सलाह — परिसर और फार्म सुरक्षा उपाय",
    date: "22 Jun 2026",
    excerptEn: "Guidelines for students, staff and field workers during summer peak temperatures.",
  },
];

export const optionADemoCirculars = [
  {
    id: 1,
    number: "CIR/REG/2026/101",
    titleEn: "Revised Academic Calendar 2026–27",
    titleHi: "संशोधित शैक्षणिक कैलेंडर 2026–27",
    date: "05 Jul 2026",
    dept: "Registrar",
  },
  {
    id: 2,
    number: "CIR/ACAD/2026/088",
    titleEn: "Guidelines for mid-semester examinations",
    titleHi: "मध्य-सत्र परीक्षाओं के लिए दिशानिर्देश",
    date: "01 Jul 2026",
    dept: "Academics",
  },
  {
    id: 3,
    number: "CIR/EST/2026/074",
    titleEn: "Office order on attendance and biometric reporting",
    titleHi: "उपस्थिति और बायोमेट्रिक रिपोर्टिंग पर कार्यालय आदेश",
    date: "24 Jun 2026",
    dept: "Establishment",
  },
  {
    id: 4,
    number: "CIR/DSW/2026/061",
    titleEn: "Hostel allotment schedule for odd semester",
    titleHi: "विषम सत्र हेतु छात्रावास आवंटन अनुसूची",
    date: "18 Jun 2026",
    dept: "Students Welfare",
  },
];

export const optionADemoTenders = [
  {
    id: 1,
    title: "Auction Notice — RDS Seed Farm produce",
    titleHi: "नीलामी सूचना — आरडीएस सीड फार्म उत्पाद",
    dept: "RDS Seed Farm",
    date: "18 Jun 2026",
    status: "Open" as const,
  },
  {
    id: 2,
    title: "E-tender for laboratory equipment — College of Agriculture",
    titleHi: "प्रयोगशाला उपकरण हेतु ई-निविदा — कृषि महाविद्यालय",
    dept: "College of Agriculture",
    date: "15 Jun 2026",
    status: "Open" as const,
  },
  {
    id: 3,
    title: "Tender Notice — Civil works at KVK Yamunanagar",
    titleHi: "निविदा सूचना — केवीके यमुनानगर सिविल कार्य",
    dept: "KVK Yamunanagar",
    date: "12 Jun 2026",
    status: "Open" as const,
  },
  {
    id: 4,
    title: "Supply of farm machinery — NCRS Gokalpura",
    titleHi: "कृषि मशीनरी आपूर्ति — एनसीआरएस गोकालपुरा",
    dept: "NCRS",
    date: "08 Jun 2026",
    status: "Closed" as const,
  },
];

export const optionADemoOffices = [
  { name: "Vice-Chancellor Office", phone: "01662-284301", email: "vc@hau.ac.in" },
  { name: "Registrar Office", phone: "01662-255200", email: "registrar@hau.ac.in" },
  { name: "Public Relations", phone: "01662-255202", email: "pro@hau.ac.in" },
];

export { university };
