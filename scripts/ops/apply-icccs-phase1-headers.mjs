#!/usr/bin/env node
/**
 * Phase 1 — I.C. College of Community Science page headers (title_hi, excerpt_hi) + menu sync.
 *
 * Usage:
 *   node scripts/ops/apply-icccs-phase1-headers.mjs
 *   node scripts/ops/apply-icccs-phase1-headers.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "ic-college-of-community-science";
const COLLEGE_HI = "आई.सी. सामुदायिक विज्ञान महाविद्यालय";

const ICCC_HEADERS = {
  "ic-college-of-community-science": {
    title_hi: COLLEGE_HI,
    excerpt_hi: `${COLLEGE_HI} — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।`,
  },
  "science-department": {
    title_hi: "विभाग",
    excerpt_hi: `${COLLEGE_HI} के विभाग।`,
  },
  "science-gallery": {
    title_hi: "गैलरी",
    excerpt_hi: `${COLLEGE_HI} की गैलरी।`,
  },
};

const DEPT_TITLES_HI = {
  "foods-and-nutrition": "खाद्य और पोषण",
  "icccs-apparel-and-textile-science": "वस्त्र और वस्त्र विज्ञान",
  "icccs-human-development-and-family-studies": "मानव विकास और परिवार अध्ययन",
  "science-extension-education-and-communication-management": "विस्तार शिक्षा और संचार प्रबंधन",
  "science-resource-management-and-consumer-science": "संसाधन प्रबंधन और उपभोक्ता विज्ञान",
};

/** ICCC-specific titles not in EXTENDED_SIDEBAR_LABELS_HI. */
const ICCC_EXTRA_TITLES_HI = {
  "BSMA  Courses": "बी.एस.एम.ए. पाठ्यक्रम",
  "Course Offered": "संचालित पाठ्यक्रम",
  "Gallery of Dempartment": "विभाग की गैलरी",
  "List of PG students": "स्नातकोत्तर छात्रों की सूची",
  "Major contributions": "प्रमुख योगदान",
  "Ongoing Research  Projects": "चल रही अनुसंधान परियोजनाएँ",
  "Publications (List of Books/Manual/Technical Bulletins only)":
    "प्रकाशन (केवल पुस्तकें/मैनुअल/तकनीकी बुलेटिन की सूची)",
  "Students achievements": "छात्र उपलब्धियाँ",
  "Teaching & Research Achievements": "शिक्षण और अनुसंधान उपलब्धियाँ",
  "Teaching Achievements": "शिक्षण उपलब्धियाँ",
  "Thurst Area": "प्रमुख कार्य क्षेत्र",
  "Thurst area": "प्रमुख कार्य क्षेत्र",
  "Thurst areas": "प्रमुख कार्य क्षेत्र",
  "Thrust Area": "प्रमुख कार्य क्षेत्र",
  "Academic programs": "शैक्षणिक कार्यक्रम",
  "Infrastructure (laboratories etc.)": "अवसंरचना (प्रयोगशालाएँ आदि)",
  "Infrastructurelaboratories etc.": "अवसंरचना (प्रयोगशालाएँ आदि)",
};

const TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI, ...ICCC_EXTRA_TITLES_HI };

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
  if (ICCC_HEADERS[page.slug]?.title_hi) return ICCC_HEADERS[page.slug].title_hi;
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
  const header = ICCC_HEADERS[page.slug];
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

console.log(`Phase 1 ICCC: ${plans.length} field(s) | unmapped titles: ${unmapped} | ${APPLY ? "APPLY" : "dry-run"}`);
if (!APPLY && plans.length) console.log("\nDry-run only. Pass --apply to write.");
