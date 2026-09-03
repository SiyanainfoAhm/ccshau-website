/**
 * Shared Hindi maps for college/directorate department pages.
 */
import { FACULTY_HTML_PHRASES, hasDevanagari, translateFacultyProfileHtml } from "./faculty-html-translate.mjs";
import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

/** slug → curated title_hi (merged from college-specific scripts). */
export const DEPT_SLUG_TITLES_HI = {
  "hisar-agricultural-economics": "कृषि अर्थशास्त्र",
  "hisar-agricultural-extension-education": "कृषि विस्तार शिक्षा",
  "hisar-agricultural-meteorology": "कृषि मौसम विज्ञान",
  "hisar-agronomy": "कृषि विज्ञान",
  "hisar-bajra-section": "बाजरा अनुभाग",
  "hisar-business-management": "व्यवसाय प्रबंधन",
  "hisar-cotton-section": "कपास अनुभाग",
  "hisar-entomology": "कीट विज्ञान",
  "hisar-forages-section": "चारा अनुभाग",
  "hisar-forestry": "वानिकी",
  "hisar-genetics-and-plant-breeding": "आनुवंशिकी और पादप प्रजनन",
  "hisar-horticulture": "उद्यान विज्ञान",
  "hisar-medicinal-aromatic-and-potential-crops-section": "औषधीय, सुगंधित और संभावित फसल अनुभाग",
  "hisar-nematology": "सूत्रकृमि विज्ञान",
  "hisar-oil-seeds-section": "तिलहन अनुभाग",
  "hisar-plant-pathology": "पादप रोग विज्ञान",
  "hisar-pulses-section": "दलहन अनुभाग",
  "hisar-seed-science-technology": "बीज विज्ञान एवं प्रौद्योगिकी",
  "hisar-soil-science": "मृदा विज्ञान",
  "hisar-teaching-section": "शिक्षण अनुभाग",
  "hisar-vegetable-science": "सब्जी विज्ञान",
  "hisar-wheat-and-barley-section": "गेहूँ एवं जौ अनुभाग",
  "dsw-young-journalism-cell": "युवा पत्रकारिता प्रकोष्ठ",
  "dsw-youth-red-cross": "युवा रेड क्रॉस",
  "dsw-national-service-scheme-bawal": "राष्ट्रीय सेवा योजना, बावल",
  "dsw-national-service-scheme-kaul": "राष्ट्रीय सेवा योजना, कौल",
  "dsw-national-cadet-corps-kaul": "राष्ट्रीय कैडेट कोर, कौल",
  "nl-technical-section": "तकनीकी अनुभाग",
  "nl-acquisition-section": "अधिग्रहण अनुभाग",
  "nl-periodical-section": "पत्रिका अनुभाग",
  "eo-cum-se": "कार्यकारी अधिकारी-सह-मुख्य अभियंता",
  "ecs-executive-engineer-public-health": "कार्यकारी अभियंता (सार्वजनिक स्वास्थ्य)",
  "ecs-executive-engineer-electrical": "कार्यकारी अभियंता (विद्युत)",
  "ecs-house-allotment": "आवास आवंटन",
  "ecs-executive-engineer-ci": "कार्यकारी अभियंता (सी.आई.)",
  dsw: "छात्र कल्याण निदेशालय",
  hrm: "मानव संसाधन प्रबंधन",
  "director-farm": "निदेशक खेत",
  "farms-director-farm": "निदेशक खेत",
  "cbt-bio-nanotechnology": "जैव-नैनो प्रौद्योगिकी",
  "cbt-agricultural-biotechnology": "कृषि जैव प्रौद्योगिकी",
  "cbt-bioinformatics-computational-biology": "बायोइंफॉर्मेटिक्स और कम्प्यूटेशनल जीव विज्ञान",
  "cbt-industrial-biotechnology": "औद्योगिक जैव प्रौद्योगिकी",
  "cbt-molecular-biology-biotechnology": "आणविक जीव विज्ञान और जैव प्रौद्योगिकी",
  "coaet-innovation-centre-for-agriwaste-management": "कृषि अपशिष्ट प्रबंधन नवाचार केंद्र",
  "krishi-vigyan-kendra-mahendergarh": "कृषि विज्ञान केंद्र, महेंद्रगढ़",
  "dee-directorate": "निदेशालय",
  "dee-agricultural-technology-information-centre": "कृषि प्रौद्योगिकी सूचना केंद्र",
  "eein-about-institute": "संस्थान के बारे में",
  "humanities-botany-plant-physiology": "वनस्पति विज्ञान और पादप शरीर क्रिया विज्ञान",
  "humanities-biochemistry": "जैव रसायन",
  chemistry: "रसायन विज्ञान",
  "science-resource-management-and-consumer-science": "संसाधन प्रबंधन और उपभोक्ता विज्ञान",
  "ram-dhan-singh-seed-farm": "डॉ. राम धन सिंह बीज खेत",
  "kaul-agriculture-college": "कृषि महाविद्यालय",
  "bawal-agriculture-college": "कृषि महाविद्यालय",
  "cbs-biochemistry": "जैव रसायन",
  "cbs-botany-plant-physiology": "वनस्पति विज्ञान और पादप शरीर क्रिया विज्ञान",
  "cbs-chemistry": "रसायन विज्ञान",
  "cbs-languages-haryanvi-culture": "भाषाएँ और हरियाणवी संस्कृति",
  "cbs-mathematics-statistics": "गणित और सांख्यिकी",
  "cbs-microbiology": "सूक्ष्म जीव विज्ञान",
  "cbs-physics": "भौतिकी",
  "cbs-sociology": "समाजशास्त्र",
  "cbs-zoology": "प्राणि विज्ञान",
  "cbs-computer-section": "कंप्यूटर सेक्शन",
  "cfs-aquaculture": "जलीय कृषि",
  "cfs-aquatic-animal-health-management": "जलीय पशु स्वास्थ्य प्रबंधन",
  "cfs-aquatic-environment-management": "जलीय पर्यावरण प्रबंधन",
  "cfs-fish-engineering": "मत्स्य अभियांत्रिकी",
  "cfs-fish-processing-technology": "मत्स्य प्रसंस्करण प्रौद्योगिकी",
  "cfs-fisheries-extension-economics-and-statistics": "मत्स्य विस्तार, अर्थशास्त्र और सांख्यिकी",
  "cfs-fisheries-resource-management": "मत्स्य संसाधन प्रबंधन",
};

export const TITLE_EN_PHRASES = [
  ["Agricultural Engineering and Technology", "कृषि अभियांत्रिकी और प्रौद्योगिकी"],
  ["Fisheries Extension, Economics and Statistics", "मत्स्य विस्तार, अर्थशास्त्र और सांख्यिकी"],
  ["Aquatic Animal Health Management", "जलीय पशु स्वास्थ्य प्रबंधन"],
  ["Aquatic Environment Management", "जलीय पर्यावरण प्रबंधन"],
  ["Fish Processing Technology", "मत्स्य प्रसंस्करण प्रौद्योगिकी"],
  ["Fisheries Resource Management", "मत्स्य संसाधन प्रबंधन"],
  ["Community Science", "समुदाय विज्ञान"],
  ["Extension Education", "विस्तार शिक्षा"],
  ["Biotechnology", "जैव प्रौद्योगिकी"],
  ["Counseling & Placement", "परामर्श एवं प्लेसमेंट"],
  ["Counseling and Placement", "परामर्श एवं प्लेसमेंट"],
  ["National Service Scheme", "राष्ट्रीय सेवा योजना"],
  ["National Cadet Corps", "राष्ट्रीय कैडेट कोर"],
  ["Mountaineering Club", "पर्वतारोहण क्लब"],
  ["Literary Society", "साहित्यिक समिति"],
  ["Art & Graphics", "कला एवं ग्राफिक्स"],
  ["Art and Graphics", "कला एवं ग्राफिक्स"],
  ["Sports Activity", "खेल गतिविधि"],
  ["Human Resource Management", "मानव संसाधन प्रबंधन"],
  ["Organic Farming", "जैविक खेती"],
  ["Food Technology", "खाद्य प्रौद्योगिकी"],
  ["Plant Pathology", "पादप रोग विज्ञान"],
  ["Soil Science", "मृदा विज्ञान"],
  ["Entomology", "कीट विज्ञान"],
  ["Horticulture", "उद्यान विज्ञान"],
  ["Agronomy", "कृषि विज्ञान"],
  ["Aquaculture", "जलीय कृषि"],
  ["Statistics", "सांख्यिकी"],
  ["Economics", "अर्थशास्त्र"],
  ["Accommodation", "आवास"],
  ["Library", "पुस्तकालय"],
  ["Research", "अनुसंधान"],
  ["Extension", "विस्तार"],
  ["Engineering", "अभियांत्रिकी"],
  ["Fisheries", "मत्स्य विज्ञान"],
  ["Agriculture", "कृषि"],
  ["Young Journalism Cell", "युवा पत्रकारिता प्रकोष्ठ"],
  ["Youth Red Cross", "युवा रेड क्रॉस"],
  ["Humanities", "मानविकी"],
  ["Botany", "वनस्पति विज्ञान"],
  ["Plant Physiology", "पादप शरीर क्रिया विज्ञान"],
  ["Biochemistry", "जैव रसायन"],
  ["Chemistry", "रसायन विज्ञान"],
  ["Technical Section", "तकनीकी अनुभाग"],
  ["Acquisition Section", "अधिग्रहण अनुभाग"],
  ["Periodical Section", "पत्रिका अनुभाग"],
  ["Innovation Centre for Agriwaste Management", "कृषि अपशिष्ट प्रबंधन नवाचार केंद्र"],
  ["Bio-Nanotechnology", "जैव-नैनो प्रौद्योगिकी"],
  ["Executive Engineer (Public Health)", "कार्यकारी अभियंता (सार्वजनिक स्वास्थ्य)"],
  ["Executive Engineer (Electrical)", "कार्यकारी अभियंता (विद्युत)"],
  ["Executive Engineer (C.I)", "कार्यकारी अभियंता (सी.आई.)"],
  ["House Allotment", "आवास आवंटन"],
  ["Director Farm", "निदेशक खेत"],
  ["About Institute", "संस्थान के बारे में"],
  ["Agricultural Technology Information Centre", "कृषि प्रौद्योगिकी सूचना केंद्र"],
  ["Directorate", "निदेशालय"],
  ["Krishi Vigyan Kendra, Mahendergarh", "कृषि विज्ञान केंद्र, महेंद्रगढ़"],
  ["EO-cum-CE", "कार्यकारी अधिकारी-सह-मुख्य अभियंता"],
  ["DSW", "छात्र कल्याण निदेशालय"],
  ["HRM", "मानव संसाधन प्रबंधन"],
  ["Department", "विभाग"],
  ["Section", "अनुभाग"],
  ["Cell", "प्रकोष्ठ"],
  ["Club", "क्लब"],
  ["&", " एवं "],
  [" and ", " एवं "],
];

export const SIDEBAR_LABELS_HI = { ...EXTENDED_SIDEBAR_LABELS_HI };

const SIDEBAR_LABELS_LOOKUP = new Map(
  Object.entries(SIDEBAR_LABELS_HI).map(([k, v]) => [k.trim().toLowerCase(), v]),
);

export function lookupSidebarLabelHi(labelEn) {
  const en = labelEn?.trim();
  if (!en) return null;
  return SIDEBAR_LABELS_HI[en] ?? SIDEBAR_LABELS_LOOKUP.get(en.toLowerCase()) ?? null;
}

export function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (hi.trim() === en.trim()) return true;
  if (!hasDevanagari(hi)) return true;
  return false;
}

export function translateDepartmentTitle(slug, titleEn) {
  const exact = DEPT_SLUG_TITLES_HI[slug];
  if (exact) return exact;
  if (!titleEn?.trim()) return null;
  let out = titleEn.trim();
  for (const [phrase, hi] of TITLE_EN_PHRASES) {
    if (out.includes(phrase)) out = out.split(phrase).join(hi);
  }
  for (const [phrase, hi] of [...FACULTY_HTML_PHRASES].sort((a, b) => b[0].length - a[0].length)) {
    if (out.includes(phrase)) out = out.split(phrase).join(hi);
  }
  out = out.replace(/\s+/g, " ").trim();
  return hasDevanagari(out) ? out : null;
}

export function translateAboutHtmlPhrase(html) {
  if (!html?.trim()) return null;
  const out = translateFacultyProfileHtml(html);
  return out && hasDevanagari(out) ? out : null;
}

export { hasDevanagari, translateFacultyProfileHtml };
