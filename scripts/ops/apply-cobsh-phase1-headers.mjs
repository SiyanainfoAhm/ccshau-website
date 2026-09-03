#!/usr/bin/env node
/**
 * Phase 1 — COBSH page headers (title_hi, excerpt_hi) + menu sync.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-phase1-headers.mjs
 *   node scripts/ops/apply-cobsh-phase1-headers.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-basic-sciences-humanities";
const COLLEGE_HI = "मूल विज्ञान और मानविकी महाविद्यालय";

const COBSH_HEADERS = {
  "college-basic-sciences-humanities": {
    title_hi: COLLEGE_HI,
    excerpt_hi: `${COLLEGE_HI} — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।`,
  },
  "cbs-department": {
    title_hi: "विभाग",
    excerpt_hi: `${COLLEGE_HI} के विभाग।`,
  },
  department: {
    title_hi: "विभाग",
    excerpt_hi: `${COLLEGE_HI} के विभाग।`,
  },
  gallery: {
    excerpt_hi: `${COLLEGE_HI} की गैलरी।`,
  },
};

const DEPT_TITLES_HI = {
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
};

/** COBSH-specific titles not in EXTENDED_SIDEBAR_LABELS_HI. */
const COBSH_EXTRA_TITLES_HI = {
  "Academic Programmes": "शैक्षणिक कार्यक्रम",
  "Award and Honors": "पुरस्कार और सम्मान",
  "Any other Information": "अन्य जानकारी",
  "Awards/Honours received by faculty members": "संकाय सदस्यों द्वारा प्राप्त पुरस्कार/सम्मान",
  "Books published by the faculty": "संकाय द्वारा प्रकाशित पुस्तकें",
  "Course Catalogue": "पाठ्यक्रम सूची",
  "Extension activities/Consultancy": "विस्तार गतिविधियाँ/परामर्श",
  "Fellowships/Projects/Foreign Visits of Faculty": "संकाय की फेलोशिप/परियोजनाएँ/विदेश यात्राएँ",
  "Future Protections": "भविष्य की योजनाएँ",
  "Infrastructural Development": "अवसंरचना विकास",
  "Instructional Manuals/Research Bulletins": "शिक्षण मैनुअल/अनुसंधान बुलेटिन",
  "List of Placement of Students": "छात्रों के प्लेसमेंट की सूची",
  "List of Students on Roll": "नामांकित छात्रों की सूची",
  "Major contributions": "प्रमुख योगदान",
  "Mathematics and Statistics at a Glance": "गणित और सांख्यिकी — एक नज़र में",
  "Mites Database": "माइट्स डेटाबेस",
  "Monographs, Research Bulletins and Manuals (Sociology)":
    "ग्रंथ, अनुसंधान बुलेटिन और मैनुअल (समाजशास्त्र)",
  "NATP Research Project Reports": "एन.ए.टी.पी. अनुसंधान परियोजना रिपोर्ट",
  "Ongoing Project": "चल रही परियोजना",
  "Package and Practices": "पैकेज और प्रथाएँ",
  "Paddy straw composting": "धान की पराली कम्पोस्टिंग",
  "Research Highlights": "अनुसंधान की मुख्य झलकियाँ",
  "Research Project in Operation": "संचालित अनुसंधान परियोजना",
  Achievments: "उपलब्धियाँ",
  "Seminar/Symposium/ Workshop/ Conferences": "सेमिनार/ सिम्पोजियम/ कार्यशाला/ सम्मेलन",
  "Software Developed": "विकसित सॉफ्टवेयर",
  "Specific achievements": "विशिष्ट उपलब्धियाँ",
  "Student qualified NET, GATE OR any other examination":
    "एन.ई.टी., गेट या अन्य परीक्षा उत्तीर्ण छात्र",
  "Thrust area": "प्रमुख कार्य क्षेत्र",
  "Thrust Areas": "प्रमुख कार्य क्षेत्र",
  "Thurst Areas of Research": "अनुसंधान के प्रमुख कार्य क्षेत्र",
  "Training/Symposium/Conference Organized": "आयोजित प्रशिक्षण/ सिम्पोजियम/ सम्मेलन",
};

const TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI, ...COBSH_EXTRA_TITLES_HI };

function subpageExcerptHi(titleHi) {
  return `${titleHi} — ${COLLEGE_HI}।`;
}

function deptExcerptHi(titleHi) {
  return `${titleHi} — ${COLLEGE_HI} का विभाग।`;
}

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function needsExcerpt(en, hi) {
  if (!en?.trim()) return false;
  return !hi?.trim() || !/[\u0900-\u097F]/.test(hi);
}

function resolveTitleHi(page) {
  if (COBSH_HEADERS[page.slug]?.title_hi) return COBSH_HEADERS[page.slug].title_hi;
  if (DEPT_TITLES_HI[page.slug]) return DEPT_TITLES_HI[page.slug];
  const en = page.title_en?.trim();
  if (en && TITLE_HI[en]) return TITLE_HI[en];
  return null;
}

const plans = [];
let unmapped = 0;

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("College not found");

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi, layout_template")
  .eq("college_root_id", college.id)
  .eq("status", "published");

for (const page of pages ?? []) {
  const updates = {};
  const header = COBSH_HEADERS[page.slug];
  const titleHi = resolveTitleHi(page);

  if (header?.title_hi && page.title_hi !== header.title_hi) updates.title_hi = header.title_hi;
  else if (titleHi && page.title_hi !== titleHi) updates.title_hi = titleHi;

  const effectiveTitleHi = updates.title_hi ?? page.title_hi ?? titleHi;

  if (header?.excerpt_hi && needsExcerpt(page.excerpt_en ?? page.title_en, page.excerpt_hi)) {
    updates.excerpt_hi = header.excerpt_hi;
  } else if (effectiveTitleHi && needsExcerpt(page.excerpt_en ?? page.title_en, page.excerpt_hi)) {
    updates.excerpt_hi = DEPT_TITLES_HI[page.slug]
      ? deptExcerptHi(effectiveTitleHi)
      : subpageExcerptHi(effectiveTitleHi);
  }

  if (!updates.title_hi && !page.title_hi?.trim() && page.title_en?.trim()) {
    unmapped++;
    console.warn(`  UNMAPPED title: ${page.slug} → "${page.title_en}"`);
  }

  if (!Object.keys(updates).length) continue;

  for (const [field, to] of Object.entries(updates)) {
    plans.push({ slug: page.slug, field, to });
  }

  if (APPLY) {
    await supabase.from("ccshau_pages").update(updates).eq("id", page.id);
    if (updates.title_hi) {
      await supabase.from("ccshau_menu_items").update({ label_hi: updates.title_hi }).eq("page_id", page.id);
    }
  }
}

console.log(`Phase 1 COBSH: ${plans.length} field(s) | unmapped titles: ${unmapped} | ${APPLY ? "APPLY" : "dry-run"}`);
if (!APPLY && plans.length) console.log("\nDry-run only. Pass --apply to write.");
