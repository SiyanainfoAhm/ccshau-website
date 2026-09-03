#!/usr/bin/env node
/**
 * Fix mixed EN+HI specialization_hi — re-translate from specialization_en using curated map.
 *
 * Usage:
 *   node scripts/ops/fix-specialization-hindi.mjs
 *   node scripts/ops/fix-specialization-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FACULTY_HTML_PHRASES, hasDevanagari } from "./faculty-html-translate.mjs";
import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

/** Exact specialization_en → specialization_hi */
const EXACT_SPEC_HI = {
  "Abiotic Stress management, Weed Management and Resource conservation":
    "अजैविक तनाव प्रबंधन, खरपतवार प्रबंधन एवं संसाधन संरक्षण",
  "Agricultural Entomology": "कृषि कीट विज्ञान",
  "Agricultural Marketing & Price Analysis": "कृषि विपणन एवं मूल्य विश्लेषण",
  "Agricultural extension education": "कृषि विस्तार शिक्षा",
  "Agriculture Biotechnology": "कृषि जैव प्रौद्योगिकी",
  "Agriculture Biotechnology, Bionanomaterials and Plant tissue culture":
    "कृषि जैव प्रौद्योगिकी, जैव-नैनो सामग्री एवं पादप ऊतक संवर्धन",
  "Agril. Entomology": "कृषि कीट विज्ञान",
  "Agrochemicals and Soil Chemistry": "कृषि रसायन एवं मृदा रसायन",
  "Analytical Chemistry/Pesticide Residue Analysis": "विश्लेषणात्मक रसायन/कीटनाशक अवशेष विश्लेषण",
  "Analytical Chemistry; Environmental chemistry; Pesticide Residue   Analysis":
    "विश्लेषणात्मक रसायन; पर्यावरण रसायन; कीटनाशक अवशेष विश्लेषण",
  "Analytical Chemistry; Environmental chemistry; PesticideResidue Analysis":
    "विश्लेषणात्मक रसायन; पर्यावरण रसायन; कीटनाशक अवशेष विश्लेषण",
  "Animal Taxonomy, Ecology, Developmental Biology, Aquaculture and Fish Processing Technology":
    "प्राणि वर्गिकी, पारिस्थितिकी, विकास जीव विज्ञान, जलीय कृषि एवं मत्स्य प्रसंस्करण प्रौद्योगिकी",
  "Apiculture  and Economic Entomology  (Hostel No. 2)":
    "मधुमक्खी पालन एवं आर्थिक कीट विज्ञान (छात्रावास सं. 2)",
  "Apiculture & Economic Entomology": "मधुमक्खी पालन एवं आर्थिक कीट विज्ञान",
  "Apiculture and Economic Entomology": "मधुमक्खी पालन एवं आर्थिक कीट विज्ञान",
  "Applied Entomology": "अनुप्रयुक्त कीट विज्ञान",
  "Applied Nematology & Entomopathogenic nematodes":
    "अनुप्रयुक्त सूत्रकृमि विज्ञान एवं कीट-जनित सूत्रकृमि",
  "Bajra Pathologist": "बाजरा रोग विज्ञ",
  "Bioenergy & Bioprocess Engineering": "जैव ऊर्जा एवं जैव प्रक्रम अभियांत्रिकी",
  "Bioenergy, Bioprocess Engineering, Lignocellulosic Ethanol, Fermentation":
    "जैव ऊर्जा, जैव प्रक्रम अभियांत्रिकी, लकड़ी-कोशिका आधारित इथेनॉल, किण्वन",
  "Bioinformatics & Computational Biology": "जैव सूचना विज्ञान एवं गणनात्मक जीव विज्ञान",
  "Bioinformatics and Chemistry": "जैव सूचना विज्ञान एवं रसायन",
  "Bioinformatics and Computational Biology": "जैव सूचना विज्ञान एवं गणनात्मक जीव विज्ञान",
  "Breeding Cereals, pulses, oilseeds & MAP Crops":
    "अनाज, दलहन, तिलहन एवं औषधीय, सुगंधित एवं संभावित फसलों का प्रजनन",
  "Breeding and molecular breeding": "प्रजनन एवं आणविक प्रजनन",
  "Castor and Pulses Breeding": "अरंडी एवं दलहन प्रजनन",
  "Catfish Breeding Ornamental Fish Breeding and Feeding, Vermicomposting":
    "मागुर प्रजनन, सजावटी मछली प्रजनन एवं आहार, कीचड़ कीड़ा खाद",
  "Civil Engineering, Geotechnical and Rock Engineering":
    "सिविल अभियांत्रिकी, भू-तकनीकी एवं चट्टान अभियांत्रिकी",
  "Clinical trials, Food, Human Nutrition, Dietetics, Lipid mediators":
    "नैदानिक परीक्षण, खाद्य, मानव पोषण, आहार विज्ञान, लिपिड मध्यस्थ",
  "Computer Aided Designing/ Apparel & Textile Designing":
    "कंप्यूटर सहायित डिजाइन/ परिधान एवं वस्त्र डिजाइन",
  "Cotton Agronomy": "कपास कृषि विज्ञान",
  "Cotton Biochemistry": "कपास जैव रसायन",
  "Cotton Entomology": "कपास कीट विज्ञान",
  "Cotton Entomology and Biological control": "कपास कीट विज्ञान एवं जैव नियंत्रण",
  "Crop Production and Nutrient Management": "फसल उत्पादन एवं पोषक तत्व प्रबंधन",
  "Crop production & weed management": "फसल उत्पादन एवं खरपतवार प्रबंधन",
  "Cropping system based research and crop diversification, weed management, conservation agriculture":
    "फसल प्रणाली आधारित अनुसंधान एवं फसल विविधीकरण, खरपतवार प्रबंधन, संरक्षण कृषि",
  "Design, Development and Testing of Agricultural Machinery":
    "कृषि मशीनरी का डिजाइन, विकास एवं परीक्षण",
  "Development and evaluation of Agricultural Machinery":
    "कृषि मशीनरी का विकास एवं मूल्यांकन",
  "Development and evaluation of Farm Machinery for different types of crops":
    "विभिन्न फसलों के लिए कृषि मशीनरी का विकास एवं मूल्यांकन",
  "Development of DSS/Windows and Android Apps, Precision farming and automation":
    "निर्णय सहायक प्रणाली/विंडोज़ एवं एंड्रॉइड ऐप का विकास, सटीक खेती एवं स्वचालन",
  "Dyeing & Printing / Apparel Designing": "रंगाई एवं छपाई / परिधान डिजाइन",
  "Economic Entomology and Biological Control": "आर्थिक कीट विज्ञान एवं जैव नियंत्रण",
  "Economic Nematology and Biocontrol agents": "आर्थिक सूत्रकृमि विज्ञान एवं जैव नियंत्रण एजेंट",
  "Electronics & Communication Engineering": "इलेक्ट्रॉनिक्स एवं संचार अभियांत्रिकी",
  "Entomopathogenic nematodes and biological control of nematoldes":
    "कीट-जनित सूत्रकृमि एवं सूत्रकृमियों का जैव नियंत्रण",
  "Entomopathogenic nematology and Molecular Nematology":
    "कीट-जनित सूत्रकृमि विज्ञान एवं आणविक सूत्रकृमि विज्ञान",
  "Environment/Ergonomics/Energy/Gerontology/Women Studies":
    "पर्यावरण/कार्य-विज्ञान/ऊर्जा/वृद्धावस्था विज्ञान/महिला अध्ययन",
  "Extension & Communication": "विस्तार एवं संचार",
  "Extension Education & Communication Management/Research on Women in Agriculture":
    "विस्तार शिक्षा एवं संचार प्रबंधन/कृषि में महिलाओं पर अनुसंधान",
  "Extension Education & Communication Management/Training":
    "विस्तार शिक्षा एवं संचार प्रबंधन/प्रशिक्षण",
  "Extension Education and Communication Management": "विस्तार शिक्षा एवं संचार प्रबंधन",
  "Farm Mechanization, Tillage and Traction, Precision Agriculture":
    "कृषि यंत्रीकरण, जुताई एवं खिंचाव, सटीक कृषि",
  "Farmers Training and Education": "किसान प्रशिक्षण एवं शिक्षा",
  "Farming System Economist": "कृषि प्रणाली अर्थशास्त्री",
  "Farming system agronomist": "कृषि प्रणाली कृषि विज्ञ",
  "Fish & Shellfish Diseases and their Management":
    "मछली एवं शंख-मछली रोग एवं उनका प्रबंधन",
  "Fish Nutrition,Vermiculture and Wild Life": "मत्स्य पोषण, वर्मी संस्कृति एवं वन्यजीव",
  "Fish Toxicology, Live Fish Feed and Carp Culture":
    "मत्स्य विष विज्ञान, जीवित मछली आहार एवं रोहू संस्कृति",
  "Fisheries Engineering and Technology": "मत्स्य अभियांत्रिकी एवं प्रौद्योगिकी",
  "Food Packaging and Shelf life": "खाद्य पैकेजिंग एवं शेल्फ लाइफ",
  "Foods and Nutrition": "खाद्य एवं पोषण",
  "Forage Agronomy": "चारा कृषि विज्ञान",
  "Forestry (Wood Science & Technology)": "वानिकी (लकड़ी विज्ञान एवं प्रौद्योगिकी)",
  "Fruit Pathologist": "फल रोग विज्ञ",
  "Genetics & Plant Breeding": "आनुवंशिकी एवं पादप प्रजनन",
  "Genetics & Plant breeding": "आनुवंशिकी एवं पादप प्रजनन",
  "Genetics and Plant Biotechnology": "आनुवंशिकी एवं पादप जैव प्रौद्योगिकी",
  "Gentics and Plant Breeding": "आनुवंशिकी एवं पादप प्रजनन",
  "Groundwater hydraulics, well hydraulics, spring hydrology; Irrigation and Drainage Engineering":
    "भूजल जलगतिकी, कुएं जलगतिकी, झरना जलविज्ञान; सिंचाई एवं जल निकासी अभियांत्रिकी",
  "Home Science (Extension Education and Communication Management)":
    "गृह विज्ञान (विस्तार शिक्षा एवं संचार प्रबंधन)",
  "Home Science Ext. Education / Training / Management":
    "गृह विज्ञान विस्तार शिक्षा / प्रशिक्षण / प्रबंधन",
  "Home Science Ext. Education/Communication Skills":
    "गृह विज्ञान विस्तार शिक्षा/संचार कौशल",
  "Horticulture Fruit Science": "उद्यान फल विज्ञान",
  "Horticulture- Floriculture and Landscaping": "उद्यान- पुष्प संवर्धन एवं भू-दृश्य",
  "Horticulture-Floriculture & Landscape Architecture":
    "उद्यान- पुष्प संवर्धन एवं भू-दृश्य वास्तुकला",
  "Human Development and Family Studies, Academic motivation, Social intelligence":
    "मानव विकास एवं पारिवारिक अध्ययन, शैक्षिक प्रेरणा, सामाजिक बुद्धि",
  "Human Development, Cognition, Behaviour Studies , Parenting":
    "मानव विकास, संज्ञान, व्यवहार अध्ययन, पालन-पोषण",
  "Human Development, Parenting, Behaviour  Studies":
    "मानव विकास, पालन-पोषण, व्यवहार अध्ययन",
  "IPM  Field  and Horticulture crops, Toxicology, Economic Entomology":
    "एकीकृत कीट प्रबंधन, क्षेत्र एवं उद्यान फसलें, विष विज्ञान, आर्थिक कीट विज्ञान",
  "Industrial Biotechnology": "औद्योगिक जैव प्रौद्योगिकी",
  "Insecticide Toxicology & Economic Entomology": "कीटनाशक विष विज्ञान एवं आर्थिक कीट विज्ञान",
  "Irrigation and groundwater": "सिंचाई एवं भूजल",
  "MD Simulations, Machine Learning, Phylogenetics":
    "आणविक गतिकी अनुकरण, यंत्र अधिगम, वंश विकास विज्ञान",
  "Maize Agronomy, Weed management, Sugarcane, Rice, wheat and resource conservation and sustainable agriculture":
    "मक्का कृषि विज्ञान, खरपतवार प्रबंधन, गन्ना, धान, गेहूँ एवं संसाधन संरक्षण एवं सतत कृषि",
  "Marketing and Human Resource Management": "विपणन एवं मानव संसाधन प्रबंधन",
  "Mechanization in Horticulture Crops": "उद्यान फसलों में यंत्रीकरण",
  "Molecular Biology and Biotechnology": "आणविक जीव विज्ञान एवं जैव प्रौद्योगिकी",
  "Molecular Genetics, Molecular Biology, Genomics and Plant Biotechnology":
    "आणविक आनुवंशिकी, आणविक जीव विज्ञान, जीनोमिक्स एवं पादप जैव प्रौद्योगिकी",
  "Molecular Microbiology, Biocontrol of insect-pest and plant diseases":
    "आणविक सूक्ष्म जीव विज्ञान, कीट-पीड़क एवं पादप रोगों का जैव नियंत्रण",
  "Molecular Nematology & Nematode and Host Plant interaction":
    "आणविक सूत्रकृमि विज्ञान एवं सूत्रकृमि-पोषक पादप परस्पर क्रिया",
  "Molecular Plant Pathology": "आणविक पादप रोग विज्ञान",
  "Mushroom Production Technology, Mushroom Pathology and Plant Pathology":
    "मशरूम उत्पादन प्रौद्योगिकी, मशरूम रोग विज्ञान एवं पादप रोग विज्ञान",
  "Oilseed Crop production, Cropping system, Abiotic stress, water management and Integrated Nutrient Management":
    "तिलहन फसल उत्पादन, फसल प्रणाली, अजैविक तनाव, जल प्रबंधन एवं एकीकृत पोषक तत्व प्रबंधन",
  "Oilseeds Entomology": "तिलहन कीट विज्ञान",
  "Organic Synthesis, Heterocyclic Compounds, Hypervalent Reagent,  Medicinal Chemistry, Drug Discovery, Phytochemistry of Medicinal and Aromatic Crops":
    "कार्बनिक संश्लेषण, हेटेरोसाइक्लिक यौगिक, हाइपरवैलेंट अभिकर्मक, औषधीय रसायन, दवा खोज, औषधीय एवं सुगंधित फसलों का वनस्पति रसायन",
  "Organic Synthesis, Medicinal Chemistry, Chemistry of nanomaterialsNatural Products Based Drug Discovery, Phytochemistry of Medicinal and Potential Crops":
    "कार्बनिक संश्लेषण, औषधीय रसायन, नैनो-सामग्री का रसायन, प्राकृतिक उत्पाद आधारित दवा खोज, औषधीय एवं संभावित फसलों का वनस्पति रसायन",
  "Pearl Millet Breeding & Biotechnology": "बाजरा प्रजनन एवं जैव प्रौद्योगिकी",
  "Plant Biochemistry": "पादप जैव रसायन",
  "Plant Biotechnology and Molecular Biology": "पादप जैव प्रौद्योगिकी एवं आणविक जीव विज्ञान",
  "Plant Breeding and Genomics": "पादप प्रजनन एवं जीनोमिक्स",
  "Plant Genome Editing and Functional Genomics": "पादप जीनोम संपादन एवं कार्यात्मक जीनोमिक्स",
  "Processing & Food Engineering": "प्रसंस्करण एवं खाद्य अभियांत्रिकी",
  "Processing and Agricultural Structures": "प्रसंस्करण एवं कृषि संरचनाएँ",
  "Rapeseed and Mustard Breeding": "सरसों प्रजनन",
  "Renewable & Bio-Energy Engineering": "नवीकरणीय एवं जैव-ऊर्जा अभियांत्रिकी",
  "Renewable and Bioenergy Engineering": "नवीकरणीय एवं जैव-ऊर्जा अभियांत्रिकी",
  "Research Areas: Bioenergy, Biochemical Engineering, Biomass densification, Biogas production":
    "अनुसंधान क्षेत्र: जैव ऊर्जा, जैव-रासायनिक अभियांत्रिकी, बायोमास संघनन, बायोगैस उत्पादन",
  "Research Interest: Statistics, Multivariate analysis": "अनुसंधान रुचि: सांख्यिकी, बहु-चर विश्लेषण",
  "Resist Dyeing Techniques, Textile   Handicrafts ,  Herbal Textiles , Computer aided designing":
    "रेजिस्ट रंगाई तकनीक, वस्त्र हस्तशिल्प, वनस्पति वस्त्र, कंप्यूटर सहायित डिजाइन",
  "Rice Entomology, Maize Entomology & Sugarcane Entomology":
    "धान कीट विज्ञान, मक्का कीट विज्ञान एवं गन्ना कीट विज्ञान",
  "Seed  Science & Technology": "बीज विज्ञान एवं प्रौद्योगिकी",
  "Seed Science & Technology": "बीज विज्ञान एवं प्रौद्योगिकी",
  "Soil Chemistry and Fertility": "मृदा रसायन एवं उर्वरता",
  "Soil Chemistry/Soil Salinity": "मृदा रसायन/मृदा लवणता",
  "Soil Fertility and Chemistry": "मृदा उर्वरता एवं रसायन",
  "Soil Fertility and Nutrient Management": "मृदा उर्वरता एवं पोषक तत्व प्रबंधन",
  "Soil Fertility, Micronutrients": "मृदा उर्वरता, सूक्ष्म पोषक तत्व",
  "Soil Fertility, Remote Sensing & GIS": "मृदा उर्वरता, दूरसंवेदन एवं भू-सूचना प्रणाली",
  "Soil Physics": "मृदा भौतिकी",
  "Soil Physics and Soil Fertility and Chemistry": "मृदा भौतिकी एवं मृदा उर्वरता एवं रसायन",
  "Soil Salinity and Crop Production": "मृदा लवणता एवं फसल उत्पादन",
  "Soil Science (Soil Fertility)": "मृदा विज्ञान (मृदा उर्वरता)",
  "Soil Science organic farming": "मृदा विज्ञान जैविक खेती",
  "Soil and Water Eng.": "मृदा एवं जल अभियांत्रिकी",
  "Soil and Water Engineering": "मृदा एवं जल अभियांत्रिकी",
  "Soil and Water Engineering, Micro Irrigation": "मृदा एवं जल अभियांत्रिकी, सूक्ष्म सिंचाई",
  "Soil fertility & chemistry": "मृदा उर्वरता एवं रसायन",
  "Sugarcane Agronomy": "गन्ना कृषि विज्ञान",
  "Sugarcane Breeding and Biotechnology": "गन्ना प्रजनन एवं जैव प्रौद्योगिकी",
  "Textile & Apparel Designing, Traditional Embroideries and specialty in Aari Work":
    "वस्त्र एवं परिधान डिजाइन, पारंपरिक कढ़ाई एवं आरी कार्य में विशेषज्ञता",
  "Textile Dyeing/Textile Finishing/Computer Aided Designing":
    "वस्त्र रंगाई/वस्त्र अंतिम प्रक्रिया/कंप्यूटर सहायित डिजाइन",
  "Textile and designing": "वस्त्र एवं डिजाइन",
  "Toxicology & Nutrition": "विष विज्ञान एवं पोषण",
  "Tree Physiology, Forestry, Agroforestry": "वृक्ष शरीर क्रिया विज्ञान, वानिकी, कृषि वानिकी",
  "Water Quality Characterization and it's Bioremediation":
    "जल गुणवत्ता विशेषीकरण एवं जैव उपचार",
  "Weed Control, Resource Conservation Technologies, Crop production and Integrated Farming System":
    "खरपतवार नियंत्रण, संसाधन संरक्षण प्रौद्योगिकियाँ, फसल उत्पादन एवं एकीकृत कृषि प्रणाली",
  "Wheat & Barley Crop Production": "गेहूँ एवं जौ फसल उत्पादन",
  "Wheat & Barley Nematology": "गेहूँ एवं जौ सूत्रकृमि विज्ञान",
  "Wheat Pathologist": "गेहूँ रोग विज्ञ",
  "Wheat, Barley and Pearl Millet breeding": "गेहूँ, जौ एवं बाजरा प्रजनन",
};

const PHRASES = [...FACULTY_HTML_PHRASES].sort((a, b) => b[0].length - a[0].length);

function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}

function isMixedPartial(hi) {
  return hi?.trim() && hasDevanagari(hi) && hasLatin(hi);
}

function translateSpec(en) {
  if (!en?.trim()) return null;
  const exact = EXACT_SPEC_HI[en.trim()];
  if (exact) return exact;

  let out = en.trim();
  for (const [phrase, hi] of PHRASES) {
    if (out.includes(phrase)) out = out.split(phrase).join(hi);
  }
  return hasDevanagari(out) ? out : null;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function syncFaculty(staffId, specializationHi) {
  const { data: assignment } = await supabase
    .from("ccshau_faculty_assignments")
    .select("id, person_id")
    .eq("source_staff_id", staffId)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) return false;
  await supabase.from("ccshau_faculty_people").update({ specialization_hi: specializationHi }).eq("id", assignment.person_id);
  await supabase.from("ccshau_faculty_assignments").update({ specialization_hi: specializationHi }).eq("id", assignment.id);
  return true;
}

async function main() {
  const { data: all } = await supabase.from("ccshau_pages").select("id,slug,college_root_id").eq("page_type", "college");
  const roots = (all ?? []).filter((p) => p.college_root_id === p.id);

  const plans = [];
  const unmapped = new Set();

  for (const c of roots) {
    const { pageIds } = await resolveStaffPageIds(supabase, c.id, { publishedOnly: true });
    const { data: staff } = await supabase
      .from("ccshau_page_staff")
      .select("id, specialization_en, specialization_hi")
      .in("page_id", pageIds)
      .eq("is_active", true);

    for (const row of staff ?? []) {
      const en = row.specialization_en?.trim();
      const hi = row.specialization_hi?.trim();
      if (!en) continue;
      if (!isMixedPartial(hi) && hi && hasDevanagari(hi) && !hasLatin(hi)) continue;

      const newHi = translateSpec(en);
      if (!newHi || !hasDevanagari(newHi)) {
        unmapped.add(en);
        continue;
      }
      if (newHi === hi) continue;
      plans.push({ id: row.id, en, oldHi: hi, newHi });
    }
  }

  console.log(`Fix plans: ${plans.length}`);
  for (const p of plans.slice(0, 15)) console.log(`  ${p.en.slice(0, 50)}… → ${p.newHi.slice(0, 60)}…`);
  if (unmapped.size) {
    console.log(`\nUnmapped: ${unmapped.size}`);
    for (const u of [...unmapped].sort().slice(0, 10)) console.log(`  ! ${u}`);
  }

  if (!APPLY) {
    console.log("\nDry-run. Pass --apply to write.");
    return;
  }

  let updated = 0;
  let synced = 0;
  for (const p of plans) {
    const { error } = await supabase.from("ccshau_page_staff").update({ specialization_hi: p.newHi }).eq("id", p.id);
    if (error) throw error;
    updated++;
    if (await syncFaculty(p.id, p.newHi)) synced++;
  }
  console.log(`\nUpdated ${updated}, synced ${synced}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
