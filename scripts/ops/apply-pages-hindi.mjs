#!/usr/bin/env node
/**
 * Translate missing Hindi fields on ccshau_pages (title/excerpt/content).
 * Skips fields that already have Devanagari Hindi (different from English).
 *
 * Usage:
 *   node scripts/ops/apply-pages-hindi.mjs
 *   node scripts/ops/apply-pages-hindi.mjs --apply
 *   node scripts/ops/apply-pages-hindi.mjs --apply --short-only
 *   node scripts/ops/apply-pages-hindi.mjs --apply --limit=50
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEPT_SLUG_TITLES_HI,
  TITLE_EN_PHRASES,
  lookupSidebarLabelHi,
  needsHi,
  hasDevanagari,
  translateFacultyProfileHtml,
} from "./department-hindi-shared.mjs";
import { FACULTY_HTML_PHRASES } from "./faculty-html-translate.mjs";
import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SHORT_ONLY = process.argv.includes("--short-only");
const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const LIMIT = limitArg ? Number(limitArg) : null;

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const EXTRA_TITLE_HI = {
  ...EXTENDED_SIDEBAR_LABELS_HI,
  Publication: "प्रकाशन",
  Publications: "प्रकाशन",
  "Proforma for Identity card": "पहचान पत्र हेतु प्रोफार्मा",
  "Nomination Form": "नामांकन प्रपत्र",
  "Thurst Area": "प्रमुख कार्य क्षेत्र",
  "Thurst Areas": "प्रमुख कार्य क्षेत्र",
  "Awards and Honors": "पुरस्कार और सम्मान",
  "Awards & Honors": "पुरस्कार और सम्मान",
  "Media Gallery": "मीडिया गैलरी",
  "Photo Gallery": "फोटो गैलरी",
  "Ongoining Research Projects": "चालू अनुसंधान परियोजनाएँ",
  "Ongoing Research Projects": "चालू अनुसंधान परियोजनाएँ",
  "Boxing Club": "बॉक्सिंग क्लब",
  "Glorious Past": "गौरवशाली अतीत",
  "Retiree of the Department": "विभाग के सेवानिवृत्त सदस्य",
  "Alumni of the Department": "विभाग के पूर्व छात्र",
  "Terms & Conditions": "नियम एवं शर्तें",
  "Terms and Conditions": "नियम एवं शर्तें",
  "CBSE Shiksha Shapath 2024": "सीबीएसई शिक्षा शपथ 2024",
  "Academic Committee": "शैक्षणिक समिति",
  "Focus Areas for Start-ups, entrepreneurs and innovators":
    "स्टार्ट-अप, उद्यमियों और नवप्रवर्तकों के लिए प्रमुख क्षेत्र",
  "Amendment in House Allotment Rules": "आवास आवंटन नियमों में संशोधन",
  Clientele: "लाभार्थी समूह",
  "University Trademark": "विश्वविद्यालय ट्रेडमार्क",
  "Management Committee": "प्रबंधन समिति",
  "Other details": "अन्य विवरण",
  "Application Form for the Allotment of House in CCSHAU, Hisar":
    "सीसीएसएचएयू, हिसार में आवास आवंटन हेतु आवेदन पत्र",
  "Mandate and Thurst Area": "जनादेश एवं प्रमुख कार्य क्षेत्र",
  "Production & Income": "उत्पादन एवं आय",
  "CBSE Results 2023-24": "सीबीएसई परिणाम 2023-24",
  "Exhibitions on": "प्रदर्शनी",
  "Salient Achievement": "प्रमुख उपलब्धि",
  "Salient Achievements": "प्रमुख उपलब्धियाँ",
  "Major Activities": "प्रमुख गतिविधियाँ",
  "Admission are open": "प्रवेश खुले हैं",
  "Service Charges": "सेवा शुल्क",
  "Saraswati Hostel": "सरस्वती छात्रावास",
  "Alaknanda Girls Hostel, Bawal": "अलकनंदा बालिका छात्रावास, बावल",
  "Report of NIC": "एनआईसी की रिपोर्ट",
  "CBSE Mandatory  Disclosure": "सीबीएसई अनिवार्य प्रकटीकरण",
  "CBSE Mandatory Disclosure": "सीबीएसई अनिवार्य प्रकटीकरण",
  "Mini Soil Testing Lab (Mridaparoikshak)": "लघु मृदा परीक्षण प्रयोगशाला (मृदा परीक्षक)",
  "ABIC Details": "एबीआईसी विवरण",
  "Campus Placements": "कैंपस प्लेसमेंट",
  "International day of Yoga (21 June, 2023)": "अंतर्राष्ट्रीय योग दिवस (21 जून, 2023)",
  "Har Ghar tiranga": "हर घर तिरंगा",
  "KVK at Glance": "कृषि विज्ञान केंद्र एक दृष्टि में",
  "Sports activity": "खेल गतिविधि",
  "Skill Development Programme": "कौशल विकास कार्यक्रम",
  "Drinking water Certifiacate": "पेयजल प्रमाण पत्र",
  HAUTA: "एचएयूटीए",
  "Faculty Profile - 2024": "संकाय प्रोफ़ाइल - 2024",
  "Faculty Profile": "संकाय प्रोफ़ाइल",
  "ABIC-Application- Form": "एबीआईसी आवेदन पत्र",
  NIRF: "एनआईआरएफ",
  "Rectification in the entitlement for 10 Type houses": "10 प्रकार के आवासों की पात्रता में सुधार",
  "Survey report on Insect-Pests of cotton in Bhiwani": "भिवानी में कपास के कीट-पतंगों पर सर्वेक्षण रिपोर्ट",
  "On line Scheme wise Expenditure": "ऑनलाइन योजनावार व्यय",
  "Farmer's Advisory": "किसान सलाह",
  "E-books": "ई-पुस्तकें",
  "Mother's Day(2025) Celebrations": "मातृ दिवस (2025) समारोह",
  "NSS Unit": "एनएसएस इकाई",
  "Requisition Form": "माँग पत्र",
  OPSTAT: "ओपीस्टेट",
  "Academic Calander": "शैक्षणिक कैलेंडर",
  "Capacity Building Program-2023": "क्षमता निर्माण कार्यक्रम-2023",
  "Pension Branch": "पेंशन शाखा",
  Abstract: "सारांश",
  "PG Studies": "स्नातकोत्तर अध्ययन",
  "Post Graduate Studies": "स्नातकोत्तर अध्ययन",
  "Capacity Building": "क्षमता निर्माण",
  "Gallery of ABIC": "एबीआईसी गैलरी",
  "Annual Accounts (Consolidated)": "वार्षिक लेखा (समेकित)",
  "Boys Hostel": "बालक छात्रावास",
  "Girls Hostel": "बालिका छात्रावास",
  "Academic Branch": "शैक्षणिक शाखा",
  Budget: "बजट",
  "Establishment/Employees Branch": "स्थापना/कर्मचारी शाखा",
  "Anti Ragging Programme": "रैगिंग विरोधी कार्यक्रम",
  "Establishment Branch": "स्थापना शाखा",
  "Budget Branch": "बजट शाखा",
  "Accounts Branch": "लेखा शाखा",
  "Interactive Session with International Delegates": "अंतर्राष्ट्रीय प्रतिनिधियों के साथ संवादात्मक सत्र",
  Programmes: "कार्यक्रम",
  "Visits or Awareness Prgrammes": "भ्रमण या जागरूकता कार्यक्रम",
  "Controller of Examination": "परीक्षा नियंत्रक",
  "Retiree Corner": "सेवानिवृत्त कोना",
  "Employee Corner": "कर्मचारी कोना",
  "Alaknanda Hostel, Bawal": "अलकनंदा छात्रावास, बावल",
  HAUNTEA: "एचएयूएनटीईए",
  "Saraswati Hostel, Kaul": "सरस्वती छात्रावास, कौल",
  "Bawal Hostel": "बावल छात्रावास",
  "Books published by the faculty members": "संकाय सदस्यों द्वारा प्रकाशित पुस्तकें",
  "Fee Structure": "शुल्क संरचना",
  "New Girls Hostel Bawal": "नई बालिका छात्रावास, बावल",
  Alumni: "पूर्व छात्र",
  "Requisition Forms": "माँग पत्र",
  "Instructions/orders/guidelines issued regarding COVID-19":
    "कोविड-19 संबंधी जारी निर्देश/आदेश/दिशानिर्देश",
  "Faculty Boys Hostel Kaul": "संकाय बालक छात्रावास, कौल",
  Result: "परिणाम",
  "Pariksha pe Charcha": "परीक्षा पर चर्चा",
  "Last 3 Years Result": "पिछले 3 वर्षों का परिणाम",
  "Animal Deases Investigation Laboratory": "पशु रोग जाँच प्रयोगशाला",
  Database: "डेटाबेस",
  "Outstanding Performance of Campus School in Atheletics":
    "एथलेटिक्स में कैंपस स्कूल का उत्कृष्ट प्रदर्शन",
  References: "संदर्भ",
  Rationale: "औचित्य",
  "Instructions Relating to Backlog Vacancies, Roster":
    "बकाया रिक्तियों, रोस्टर संबंधी निर्देश",
  "Building safety cerficate": "भवन सुरक्षा प्रमाण पत्र",
  NCC: "एनसीसी",
  "About IDP": "आईडीपी के बारे में",
  "Faculty New Girls Hostel Bawal": "संकाय नई बालिका छात्रावास, बावल",
  Members: "सदस्य",
  "Faculty Branch": "संकाय शाखा",
  "Recruitment Branch": "भर्ती शाखा",
  Sitemap: "साइटमैप",
  "Technologies for Commercialization": "व्यावसायीकरण हेतु प्रौद्योगिकियाँ",
  "Contact-Us": "संपर्क करें",
  "CCS HAU Prospectus 2024-25": "सीसीएस एचएयू विवरणिका 2024-25",
  Historic: "ऐतिहासिक",
  "CBSE SAFAL Online Examination 2024": "सीबीएसई सफल ऑनलाइन परीक्षा 2024",
  "General Branch": "सामान्य शाखा",
  "NSS MOTTO": "एनएसएस ध्येय",
  "Gallery of Comptroller office": "नियंत्रक कार्यालय गैलरी",
  "Focus Area": "प्रमुख क्षेत्र",
  "Activities-2024": "गतिविधियाँ-2024",
  "Inspection Branch": "निरीक्षण शाखा",
  "Braham Sarover Hostel": "ब्रह्म सरोवर छात्रावास",
  "Environmental Sustainability Plan (ESP)": "पर्यावरणीय स्थिरता योजना (ईएसपी)",
  "Sports Infrastructure": "खेल अवसंरचना",
  "English Broucher": "अंग्रेज़ी ब्रोशर",
  NOC: "एनओसी",
  Review: "समीक्षा",
  "School Safety Committee": "स्कूल सुरक्षा समिति",
  "Fire safety certificate": "अग्नि सुरक्षा प्रमाण पत्र",
  "Objectives of NSS": "एनएसएस के उद्देश्य",
  "NSS BADGE": "एनएसएस बैज",
  "Procedure for (UPN)": "यूपीएन हेतु प्रक्रिया",
  "Programme SOP, Pahal ,Safal": "कार्यक्रम एसओपी, पहल, सफल",
  "Aim of NSS": "एनएसएस का उद्देश्य",
  "List of Controlling officers": "नियंत्रण अधिकारियों की सूची",
  "IDP Team Detail": "आईडीपी टीम विवरण",
  "Hostel Bawal": "छात्रावास बावल",
  "Hostel Warden Boys Hostel Bawal": "हॉस्टल वार्डन, बालक छात्रावास बावल",
  "Stubble Burning": "पराली जलाना",
  "Advertisement No. 01/2019": "विज्ञापन संख्या 01/2019",
  "Advt 02/2019": "विज्ञापन 02/2019",
  "NSS DAY": "एनएसएस दिवस",
  "NSS LOGO": "एनएसएस लोगो",
  "Sports Council1": "खेल परिषद",
  Resources: "संसाधन",
  "Technologies Available": "उपलब्ध प्रौद्योगिकियाँ",
  Certificate: "प्रमाण पत्र",
  "Industrial Conclave": "औद्योगिक सम्मेलन",
  "Action Plan of (EAP)": "ईएपी की कार्य योजना",
  "Inter House Activity": "अंतर-सदन गतिविधि",
  "Landscape unit": "लैंडस्केप इकाई",
  "Organogram department": "संगठनात्मक संरचना विभाग",
  "Undergraduate programmes": "स्नातक कार्यक्रम",
  "Academic calendar volume II": "शैक्षणिक कैलेंडर खंड II",
  "ELP Programmes — Experiential Learning Programme": "ईएलपी कार्यक्रम — अनुभव आधारित अधिगम कार्यक्रम",
  "Status Of ELP Units — Experiential Learning Programme": "ईएलपी इकाइयों की स्थिति — अनुभव आधारित अधिगम कार्यक्रम",
  "Objectives — Experiential Learning Programme": "उद्देश्य — अनुभव आधारित अधिगम कार्यक्रम",
  "Academic departments at Experiential Learning Programme":
    "अनुभव आधारित अधिगम कार्यक्रम के शैक्षणिक विभाग",
  "Experiential Learning Programme": "अनुभव आधारित अधिगम कार्यक्रम",
};

const ALL_PHRASES = [
  ["KRISHI VIGYAN KENDRA", "कृषि विज्ञान केंद्र"],
  ["Krishi Vigyan Kendra", "कृषि विज्ञान केंद्र"],
  ["Agribusiness Incubation Centre", "कृषि व्यवसाय इनक्यूबेशन केंद्र"],
  ["Agri-tourism center", "कृषि पर्यटन केंद्र"],
  ["Sports Facilities", "खेल सुविधाएँ"],
  ["Financial Status", "वित्तीय स्थिति"],
  ["Campus School", "कैंपस स्कूल"],
  ["CCS HAU Hisar", "सीसीएस एचएयू, हिसार"],
  ["CCS HAU", "सीसीएस एचएयू"],
  ["Academic departments at PG Studies", "स्नातकोत्तर अध्ययन के शैक्षणिक विभाग"],
  ["Kaul gallery", "कौल गैलरी"],
  ["About Us", "हमारे बारे में"],
  ["Messages", "संदेश"],
  ...TITLE_EN_PHRASES,
  ...FACULTY_HTML_PHRASES,
].sort((a, b) => b[0].length - a[0].length);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mapPhrases(text) {
  if (!text?.trim()) return null;
  let out = text.trim();
  for (const [en, hi] of ALL_PHRASES) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  out = out.replace(/\s+/g, " ").trim();
  return hasDevanagari(out) ? out : null;
}

function resolveTitleHi(slug, titleEn) {
  if (!titleEn?.trim()) return null;
  const en = titleEn.trim();
  const enNorm = en.replace(/[.。]+$/u, "").trim();
  if (DEPT_SLUG_TITLES_HI[slug]) return DEPT_SLUG_TITLES_HI[slug];
  if (EXTRA_TITLE_HI[en] || EXTRA_TITLE_HI[enNorm]) return EXTRA_TITLE_HI[en] ?? EXTRA_TITLE_HI[enNorm];
  const sidebar = lookupSidebarLabelHi(en) ?? lookupSidebarLabelHi(enNorm);
  if (sidebar) return sidebar;
  return mapPhrases(en) ?? mapPhrases(enNorm);
}

async function translateWithGoogleGtx(text, { retries = 4 } = {}) {
  const q = (text ?? "").trim();
  if (!q) return null;
  // Keep chunk size modest for GTX reliability
  const chunk = q.length > 4500 ? q.slice(0, 4500) : q;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `q=${encodeURIComponent(chunk)}`,
        },
      );
      if (!response.ok) {
        await sleep(180 * (attempt + 1));
        continue;
      }
      const data = await response.json();
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        await sleep(180 * (attempt + 1));
        continue;
      }
      const hi =
        data[0]
          .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
          .join("")
          .trim() || null;
      if (hi && hasDevanagari(hi)) return hi;
      await sleep(120 * (attempt + 1));
    } catch {
      await sleep(200 * (attempt + 1));
    }
  }
  return null;
}

function isNonTranslatableText(en) {
  const t = (en ?? "").trim();
  if (!t) return true;
  if (!/[A-Za-z]{2,}/.test(t)) return true; // years, numbers, phones
  if (/^CALL US:/i.test(t)) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^legacy-cms-\d+$/i.test(t)) return true;
  if (/^(onlinefee|university_photos|logos|Rectnotice|StudyMaterial)$/i.test(t)) return true;
  if (/^legacy-cms-\d+$/i.test(t)) return true;
  return false;
}

function extractPdfUrl(html) {
  if (!html?.trim()) return null;
  const patterns = [
    /<(?:iframe|embed|object)\b[^>]*\b(?:src|data)=["']([^"']+\.pdf[^"']*)["']/i,
    /\b(?:src|data|href)=["']([^"']+\.pdf[^"']*)["']/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function normalizeNodeText(text) {
  return text.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function shouldTranslateNode(text) {
  if (!text || text.length < 3 || text.length > 400) return false;
  if (!/[A-Za-z]{3,}/.test(text)) return false;
  if (hasDevanagari(text) && !/[A-Za-z]{4,}/.test(text)) return false;
  if (/https?:\/\//i.test(text)) return false;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return false;
  if (/\.pdf\b/i.test(text)) return false;
  return true;
}

function collectTextNodes(html) {
  const nodes = new Set();
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(html))) {
    const raw = normalizeNodeText(m[1]);
    if (shouldTranslateNode(raw)) nodes.add(raw);
  }
  return [...nodes].sort((a, b) => b.length - a.length).slice(0, 40);
}

async function translateContentHtml(htmlEn, titleEn, titleHi, phraseCache) {
  if (isNonTranslatableText((htmlEn ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())) {
    return null;
  }

  const pdfUrl = extractPdfUrl(htmlEn);
  const plain = (htmlEn ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (pdfUrl && plain.length < 280) {
    const label = titleHi || resolveTitleHi("", titleEn) || titleEn?.trim() || "दस्तावेज़";
    return `<p><a href="${pdfUrl}" rel="noopener noreferrer" target="_blank"><strong>${label}</strong></a></p>`;
  }

  // Short plain / lightly marked content: one GTX call
  const tagCount = (htmlEn.match(/<[a-zA-Z]/g) ?? []).length;
  if (plain.length <= 500 && tagCount <= 8) {
    const hi =
      EXTRA_TITLE_HI[plain] ??
      lookupSidebarLabelHi(plain) ??
      mapPhrases(plain) ??
      (await translateWithGoogleGtx(plain, { retries: 3 }));
    if (hi && hasDevanagari(hi)) {
      if (tagCount === 0) return `<p>${hi}</p>`;
      // replace visible text if single text payload
      return htmlEn.includes(plain) ? htmlEn.split(plain).join(hi) : `<p>${hi}</p>`;
    }
  }

  let html = translateFacultyProfileHtml(htmlEn) ?? htmlEn;
  // Apply common page phrases once more
  for (const [en, hi] of ALL_PHRASES) {
    if (en.length >= 4 && html.includes(en)) html = html.split(en).join(hi);
  }

  if (hasDevanagari(html)) {
    // Enough Hindi from dictionaries — skip expensive per-node GTX for bulk speed
    const remainingLatin = (html.replace(/<[^>]+>/g, " ").match(/\b[A-Za-z]{4,}\b/g) ?? []).length;
    if (remainingLatin <= 12) return html;
  }

  const nodes = collectTextNodes(html);
  let gtxCalls = 0;
  for (const en of nodes) {
    if (!phraseCache.has(en)) {
      const mapped = mapPhrases(en) ?? EXTRA_TITLE_HI[en] ?? lookupSidebarLabelHi(en);
      if (mapped && hasDevanagari(mapped)) {
        phraseCache.set(en, mapped);
      } else if (gtxCalls < 25) {
        const hi = await translateWithGoogleGtx(en, { retries: 2 });
        phraseCache.set(en, hi && hasDevanagari(hi) && hi !== en ? hi : null);
        gtxCalls++;
        await sleep(25);
      } else {
        phraseCache.set(en, null);
      }
    }
    const hi = phraseCache.get(en);
    if (hi) html = html.split(en).join(hi);
  }
  return hasDevanagari(html) ? html : null;
}

async function fetchAllPages() {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function main() {
  console.log(`ccshau_pages Hindi | ${APPLY ? "APPLY" : "dry-run"}${SHORT_ONLY ? " | short-only" : ""}`);
  const pages = await fetchAllPages();
  console.log(`Rows: ${pages.length}`);

  const phraseCache = new Map();
  const stats = {
    scanned: 0,
    updated: 0,
    title: 0,
    excerpt: 0,
    content: 0,
    skippedAlready: 0,
    skippedNonTranslatable: 0,
    failedTitle: 0,
    failedExcerpt: 0,
    failedContent: 0,
  };

  for (const row of pages) {
    stats.scanned++;
    if (LIMIT != null && stats.updated >= LIMIT) break;

    const patch = {};

    if (needsHi(row.title_en, row.title_hi)) {
      if (isNonTranslatableText(row.title_en)) {
        stats.skippedNonTranslatable++;
      } else {
        let hi = resolveTitleHi(row.slug, row.title_en);
        if (!hi) {
          hi = await translateWithGoogleGtx(row.title_en);
          await sleep(60);
        }
        if (hi && hasDevanagari(hi)) {
          patch.title_hi = hi;
          stats.title++;
        } else {
          stats.failedTitle++;
        }
      }
    }

    if (needsHi(row.excerpt_en, row.excerpt_hi)) {
      if (isNonTranslatableText(row.excerpt_en)) {
        stats.skippedNonTranslatable++;
      } else {
        const plainExcerpt = row.excerpt_en.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        let hi =
          resolveTitleHi(row.slug, row.excerpt_en) ??
          mapPhrases(row.excerpt_en) ??
          mapPhrases(plainExcerpt);
        if (!hi) {
          hi = await translateWithGoogleGtx(plainExcerpt || row.excerpt_en);
          await sleep(60);
        }
        if (hi && hasDevanagari(hi)) {
          patch.excerpt_hi = hi;
          stats.excerpt++;
        } else {
          stats.failedExcerpt++;
        }
      }
    }

    if (!SHORT_ONLY && needsHi(row.content_en, row.content_hi)) {
      const bytes = row.content_en?.length ?? 0;
      if (APPLY || stats.content < 15) {
        process.stdout.write(`  content ${row.slug} (${bytes}b)… `);
      }
      const titleHi = patch.title_hi ?? row.title_hi ?? resolveTitleHi(row.slug, row.title_en);
      const hi = await translateContentHtml(row.content_en, row.title_en, titleHi, phraseCache);
      if (hi) {
        patch.content_hi = hi;
        stats.content++;
        if (APPLY || stats.content <= 15) console.log("ok");
      } else {
        stats.failedContent++;
        if (APPLY || stats.failedContent <= 15) console.log(`FAILED ${row.slug}`);
      }
    }

    if (!Object.keys(patch).length) {
      stats.skippedAlready++;
      continue;
    }

    stats.updated++;
    if (!APPLY) {
      if (stats.updated <= 20) {
        console.log(`  WOULD ${row.slug}: ${Object.keys(patch).join(", ")}`);
      }
      continue;
    }

    const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", row.id);
    if (error) throw new Error(`${row.slug}: ${error.message}`);
    if (stats.updated % 25 === 0) console.log(`  updated ${stats.updated}…`);
  }

  console.log("\nSummary:");
  console.log(`  scanned: ${stats.scanned}`);
  console.log(`  ${APPLY ? "updated" : "would update"}: ${stats.updated}`);
  console.log(`  already ok / no patch: ${stats.skippedAlready}`);
  console.log(`  skipped non-translatable: ${stats.skippedNonTranslatable}`);
  console.log(`  title: ${stats.title} (failed ${stats.failedTitle})`);
  console.log(`  excerpt: ${stats.excerpt} (failed ${stats.failedExcerpt})`);
  console.log(`  content: ${stats.content} (failed ${stats.failedContent})`);
  if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
