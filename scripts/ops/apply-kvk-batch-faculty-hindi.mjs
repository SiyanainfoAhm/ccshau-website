#!/usr/bin/env node
/**
 * Phase 4 — KVK faculty Hindi (name, designation, specialization, qualification, details).
 * Writes ccshau_faculty_people + ccshau_faculty_assignments (public faculty table).
 *
 * Usage:
 *   node scripts/ops/apply-kvk-batch-faculty-hindi.mjs
 *   node scripts/ops/apply-kvk-batch-faculty-hindi.mjs --apply
 *   node scripts/ops/apply-kvk-batch-faculty-hindi.mjs --apply --short-only
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml, hasDevanagari } from "./faculty-html-translate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SHORT_ONLY = process.argv.includes("--short-only");
const AZURE = "https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage";

const COLLEGES = [
  "krishi-vigyan-kendra-yamunanagar",
  "krishi-vigyan-kendra-sadalpur-hisar",
  "krishi-vigyan-kendra-bhiwani",
  "krishi-vigyan-kendra-bawal",
  "krishi-vigyan-kendra-panipat",
  "krishi-vigyan-kendra-mahendergarh",
  "krishi-vigyan-kendra-kurukshetra",
  "krishi-vigyan-kendra-kaithal",
];

/** person_id → curated short-field Hindi */
const FACULTY_HI = {
  "101e3883-ed8d-41cc-a7c4-e234da38091d": {
    name_hi: "डॉ. संदीप रावल",
    designation_hi: "समन्वयक",
    specialization_hi: "कृषि विज्ञान, संसाधन संरक्षण प्रौद्योगिकियाँ",
    qualification_hi: "पी.एच.डी. (कृषि विज्ञान)",
  },
  "49a8ae9a-d3a9-4877-b5b7-cafc82740fa8": {
    name_hi: "श्री अनिल कुमार",
    designation_hi: "डी.ई.एस. (कृषि वानिकी)",
    specialization_hi: "कृषि वानिकी",
    qualification_hi: "एम.एससी.",
  },
  "e690c975-4a53-4e72-a7d3-b2cdf2fd8611": {
    name_hi: "श्री करण सिंह सैनी",
    designation_hi: "प्रशिक्षण सहायक",
  },
  "64c5e006-f87a-4f71-a2a8-6d128e9e99a0": {
    name_hi: "डॉ. आराधना बाली",
    designation_hi: "डी.ई.एस. (कृषि विज्ञान)",
    specialization_hi: "कृषि विज्ञान, संसाधन संरक्षण प्रौद्योगिकियाँ",
    qualification_hi: "पी.एच.डी. (कृषि विज्ञान)",
  },
  "3d650e5b-8193-4d5d-b1ad-57fb0736a35a": {
    name_hi: "डॉ. विशाल गोयल",
    designation_hi: "डी.ई.एस. (मृदा विज्ञान)",
    specialization_hi: "मृदा विज्ञान (मृदा एवं जल विश्लेषण)",
    qualification_hi: "पी.एच.डी. (मृदा विज्ञान)",
  },
  "da4f0ded-a652-4e60-ad31-105e70f6462a": {
    name_hi: "इंजी. कपिल",
    designation_hi: "डी.ई.एस. (कृषि अभियांत्रिकी)",
    specialization_hi: "मृदा एवं जल अभियांत्रिकी",
    qualification_hi: "एम.टेक. (कृषि अभियांत्रिकी)",
  },
  "ab7a9165-f24c-4945-9c56-c95e0aca214d": {
    name_hi: "डॉ. आश्मा खान",
    designation_hi: "डी.ई.एस. (गृह विज्ञान)",
    specialization_hi: "गृह विज्ञान (विस्तार शिक्षा एवं संचार प्रबंधन)",
    qualification_hi: "पी.एच.डी. (गृह विज्ञान)",
  },
  "b2bbdfb7-2984-47ce-9b7f-df53630a31b2": {
    name_hi: "डॉ. नरेन्द्र कुमार",
    designation_hi: "डी.ई.एस.",
    specialization_hi: "कीट विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "60b972d8-2018-4f95-9c40-614573337afa": {
    name_hi: "डॉ. कुलदीप सिंह",
    designation_hi: "जिला विस्तार विशेषज्ञ (कृषि विज्ञान)",
    specialization_hi: "कृषि विज्ञान",
    qualification_hi: "एम.एससी. (कृषि विज्ञान)",
  },
  "9adaa5c9-1dba-4cef-bc46-ccde9109d306": {
    name_hi: "डॉ. पंकज",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "पादप रोग विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "9415b4d8-13b9-442b-b4bc-8f317cde124c": {
    name_hi: "श्रीमती योगिता बाली",
    designation_hi: "डी.ई.एस. (कृषि विज्ञान)",
    specialization_hi: "फसल उत्पादन",
    qualification_hi: "एम.एससी. (कृषि विज्ञान)",
  },
  "cac827c4-37b1-42c8-9d09-65f4f5543716": {
    name_hi: "डॉ. कृष्मा नंदा",
    designation_hi: "डी.ई.एस. (वानिकी)",
    specialization_hi: "कृषि वानिकी",
    qualification_hi: "पी.एच.डी.",
  },
  "32a224c0-f665-4544-85ae-a2abb21b70c0": {
    name_hi: "डॉ. ममता",
    designation_hi: "सहायक प्रोफेसर",
    qualification_hi: "पी.एच.डी.",
  },
  "15496a83-fc9f-487c-bf27-7f45abcb3b87": {
    name_hi: "मीनु",
    designation_hi: "डी.ई.एस. (कीट विज्ञान)",
    specialization_hi: "कृषि कीट विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "4b01d35e-5234-4232-ae41-098f6e900407": {
    name_hi: "डॉ. नरेन्द्र कुमार",
    designation_hi: "डी.ई.एस., कृषि विज्ञान केंद्र (बावल)",
    specialization_hi: "पादप रोग विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "00f5ca32-70f2-441f-bde8-0943cc87a046": {
    name_hi: "डॉ. परमोद कुमार",
    designation_hi: "वरिष्ठ वैज्ञानिक",
    specialization_hi: "मृदा उर्वरता एवं जल प्रबंधन",
    qualification_hi: "पी.एच.डी. (मृदा विज्ञान)",
  },
  "93d9ebaa-11a4-4913-922d-12bd6ed4c7d9": {
    name_hi: "डॉ. सतपाल सिंह",
    designation_hi: "जिला विस्तार विशेषज्ञ (कार्यकारी वरिष्ठ समन्वयक)",
    specialization_hi: "प्रौद्योगिकी हस्तांतरण",
    qualification_hi: "पी.एच.डी.",
  },
  "2bd753a4-91a0-4d04-874e-2873d5d87a44": {
    name_hi: "डॉ. सुनील कुमार",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "मृदा विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "4da07e02-d41b-40fb-9ea5-413b1f14136a": {
    name_hi: "डॉ. राजेश कुमार",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "सब्जी विज्ञान",
  },
  "4633e427-2f43-4a92-a5b9-7032a47f379a": {
    name_hi: "श्री मोहित सेहल",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "कृषि अर्थशास्त्र",
  },
  "c8488227-10ef-43ea-9f1c-532b17a539b4": {
    name_hi: "डॉ. कुलदीप दूदी",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "पशु पोषण",
    qualification_hi: "एम.वी.एससी.",
  },
  "ed22270a-1fdc-4dac-b8bc-fe04710ecd29": {
    name_hi: "डॉ. अशोक ढिल्लों",
    designation_hi: "वरिष्ठ जिला विस्तार विशेषज्ञ",
    specialization_hi: "फार्म प्रबंधन",
    qualification_hi: "पी.एच.डी.",
  },
  "94a27299-339a-476f-baba-1b8b9b51b255": {
    name_hi: "डॉ. नरेन्द्र सिंह",
    designation_hi: "डी.ई.एस. (पादप रोग विज्ञान)",
    specialization_hi: "पादप रोग विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "6066f356-f07c-429e-9b1a-1962cdd15913": {
    name_hi: "डॉ. राजपाल यादव",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "मृदा विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "52e32a44-af6d-468f-bf19-c12bc89331c3": {
    name_hi: "डॉ. पूनम",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "गृह विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "989861d7-2381-41df-ba3a-8047e514af87": {
    name_hi: "डॉ. नरेश कुमार यादव",
    designation_hi: "सहायक वैज्ञानिक (पादप रोग विज्ञान)",
    specialization_hi: "पादप रोग विज्ञान",
    qualification_hi: "पी.एच.डी. (पादप रोग विज्ञान)",
  },
  "1f88b694-ba04-4fdb-a5d2-41c12ab2995e": {
    name_hi: "डॉ. आशीष शिवराण",
    designation_hi: "जिला विस्तार विशेषज्ञ",
    specialization_hi: "कृषि विज्ञान",
    qualification_hi: "पी.एच.डी. (कृषि विज्ञान)",
  },
  "25213593-4641-486c-85b3-b05354049faf": {
    name_hi: "डॉ. एम.के. सिंह",
    designation_hi: "सहयोगी प्रोफेसर",
    specialization_hi: "कृषि वानिकी",
    qualification_hi: "पी.एच.डी.",
  },
  "b173d7b9-4cb3-4f1d-9d57-f541af36b987": {
    name_hi: "डॉ. फ़तेह सिंह",
    designation_hi: "सहयोगी प्रोफेसर",
    specialization_hi: "पादप रोग विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "770ef4a5-fd3e-416d-84aa-a76d1f9fb638": {
    name_hi: "डॉ. ललिता रानी",
    designation_hi: "डी.ई.एस. (गृह विज्ञान)",
    specialization_hi: "वस्त्र एवं डिजाइन",
    qualification_hi: "पी.एच.डी.",
  },
  "a43444e8-c97d-45cf-97ae-d7ce9dba9332": {
    name_hi: "डॉ. सरिता रानी",
    designation_hi: "डी.ई.एस. (कृषि विज्ञान)",
    specialization_hi: "कृषि विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "aeeac51e-12c8-4991-901d-e6ae52c17933": {
    name_hi: "डॉ. कविता",
    designation_hi: "डी.ई.एस. (मृदा विज्ञान)",
    specialization_hi: "मृदा विज्ञान",
    qualification_hi: "पी.एच.डी.",
  },
  "4ea73eb3-ec5d-4580-a6b9-ccc550427361": {
    name_hi: "डॉ. आर.सी. वर्मा",
    designation_hi: "प्रोफेसर",
    specialization_hi: "कृषि वानिकी",
    qualification_hi: "पी.एच.डी.",
  },
  "23e33be1-b5d7-4b57-b118-ad4832d20008": {
    name_hi: "डॉ. गुरनाम सिंह",
    designation_hi: "डी.ई.एस. (कृषि अर्थशास्त्र)",
    specialization_hi: "कृषि विपणन",
    qualification_hi: "पी.एच.डी. (कृषि अर्थशास्त्र)",
  },
  "bc24e450-d6c1-487d-9e71-c5999a1faffe": {
    name_hi: "डॉ. जसबीर सिंह",
    designation_hi: "डी.ई.एस. (विस्तार शिक्षा)",
    specialization_hi: "कृषि विस्तार शिक्षा",
    qualification_hi: "पी.एच.डी. (कृषि विस्तार शिक्षा)",
  },
  "1b8d91d9-0aed-437e-9c42-e23ed5c58dfc": {
    name_hi: "डॉ. प्रशांत कौशिक",
    designation_hi: "डी.ई.एस. (सब्जी विज्ञान)",
    specialization_hi: "सब्जी प्रजनन एवं जैव प्रौद्योगिकी",
    qualification_hi: "पी.एच.डी. (सब्जी विज्ञान)",
  },
  "3d074572-3805-494e-8b79-7f14681ad2b8": {
    name_hi: "डॉ. दीपक कुमार",
    designation_hi: "डी.ई.एस. (मृदा विज्ञान)",
    specialization_hi: "मृदा उर्वरता, सूक्ष्म पोषक तत्व",
    qualification_hi: "पी.एच.डी. (मृदा विज्ञान)",
  },
  "50cc9bf1-9500-425d-87ce-a39aab78e062": {
    name_hi: "डॉ. अमित कुमार",
    designation_hi: "डी.ई.एस. (कृषि विज्ञान)",
    specialization_hi: "खरपतवार प्रबंधन",
    qualification_hi: "पी.एच.डी. (कृषि विज्ञान)",
  },
  "3a29d3f5-d633-4c3c-b75b-d25a0780cffe": {
    name_hi: "डॉ. नेहा शर्मा",
    designation_hi: "डी.ई.एस. (उद्यान विज्ञान — फल विज्ञान)",
    specialization_hi: "रोपण सामग्री का प्रवर्धन, बीज प्राइमिंग, छवि प्रसंस्करण आदि",
    qualification_hi: "पी.एच.डी. (उद्यान विज्ञान — फल विज्ञान)",
  },
};

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

function rewriteHauStorageToAzure(html) {
  if (!html) return html;
  return html.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^"'?\s>#]+)/gi,
    `${AZURE}/$1`,
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeNodeText(text) {
  return text.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isCitationLike(text) {
  if (/\bet\s+al\.?/i.test(text)) return true;
  if (/\bdoi:/i.test(text)) return true;
  if (/\bpp\.\s*\d/i.test(text)) return true;
  if (/\bvol\.?\s*\d/i.test(text)) return true;
  if (/\b(J\.|Journal|Int\. J|Indian J|Annals of|Proc\. )/i.test(text) && /\d{4}/.test(text)) return true;
  return false;
}

function shouldTranslateNode(text) {
  if (!text || text.length < 3 || text.length > 320) return false;
  if (!/[A-Za-z]{3,}/.test(text)) return false;
  if (hasDevanagari(text) && !/[A-Za-z]{4,}/.test(text)) return false;
  if (/https?:\/\//i.test(text)) return false;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return false;
  if (isCitationLike(text)) return false;
  if (/^[\d\s.,\-/;:()%]+$/.test(text)) return false;
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
  return [...nodes].sort((a, b) => b.length - a.length);
}

async function translateWithGoogleGtx(text) {
  try {
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `q=${encodeURIComponent(text)}`,
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    return (
      data[0]
        .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
        .join("")
        .trim() || null
    );
  } catch {
    return null;
  }
}

async function translateProfileHtml(htmlEn, phraseCache) {
  let html = rewriteHauStorageToAzure(translateFacultyProfileHtml(htmlEn) ?? htmlEn);
  const nodes = collectTextNodes(html).slice(0, 120);
  for (const en of nodes) {
    if (!phraseCache.has(en)) {
      const hi = await translateWithGoogleGtx(en);
      phraseCache.set(en, hi && hasDevanagari(hi) && hi !== en ? hi : null);
      await sleep(80);
    }
    const hi = phraseCache.get(en);
    if (hi) html = html.split(en).join(hi);
  }
  return rewriteHauStorageToAzure(html);
}

async function main() {
  console.log(`KVK faculty Hindi | ${APPLY ? "APPLY" : "dry-run"}${SHORT_ONLY ? " | short-only" : ""}`);
  const phraseCache = new Map();
  let shortUpdated = 0;
  let detailsUpdated = 0;

  for (const slug of COLLEGES) {
    const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", slug).maybeSingle();
    if (!college) throw new Error(`Missing college: ${slug}`);

    const { data: assigns } = await supabase
      .from("ccshau_faculty_assignments")
      .select("id, person_id, designation_en, designation_hi, specialization_en, specialization_hi")
      .eq("page_id", college.id)
      .eq("is_active", true);

    console.log(`\n=== ${slug} (${assigns?.length ?? 0}) ===`);

    for (const a of assigns ?? []) {
      const curated = FACULTY_HI[a.person_id];
      if (!curated) {
        console.warn(`  UNMAPPED person ${a.person_id}`);
        continue;
      }

      const { data: person } = await supabase
        .from("ccshau_faculty_people")
        .select(
          "id, name_en, name_hi, specialization_en, specialization_hi, qualification_en, qualification_hi, detail_content_en, detail_content_hi",
        )
        .eq("id", a.person_id)
        .maybeSingle();
      if (!person) continue;

      const personPatch = {};
      if (curated.name_hi && person.name_hi !== curated.name_hi) personPatch.name_hi = curated.name_hi;
      if (curated.specialization_hi && person.specialization_hi !== curated.specialization_hi) {
        personPatch.specialization_hi = curated.specialization_hi;
      }
      if (curated.qualification_hi && person.qualification_hi !== curated.qualification_hi) {
        personPatch.qualification_hi = curated.qualification_hi;
      }

      const assignPatch = {};
      if (curated.designation_hi && a.designation_hi !== curated.designation_hi) {
        assignPatch.designation_hi = curated.designation_hi;
      }
      if (curated.specialization_hi && a.specialization_hi !== curated.specialization_hi) {
        assignPatch.specialization_hi = curated.specialization_hi;
      }

      if (Object.keys(personPatch).length || Object.keys(assignPatch).length) {
        shortUpdated++;
        console.log(`  ${person.name_en}: ${curated.name_hi} | ${curated.designation_hi ?? a.designation_en}`);
        if (APPLY) {
          if (Object.keys(personPatch).length) {
            const { error } = await supabase.from("ccshau_faculty_people").update(personPatch).eq("id", person.id);
            if (error) throw new Error(`${person.name_en} person: ${error.message}`);
          }
          if (Object.keys(assignPatch).length) {
            const { error } = await supabase.from("ccshau_faculty_assignments").update(assignPatch).eq("id", a.id);
            if (error) throw new Error(`${person.name_en} assignment: ${error.message}`);
          }
        }
      }

      if (SHORT_ONLY) continue;
      const en = person.detail_content_en?.trim();
      if (!en) continue;
      const hi = person.detail_content_hi?.trim();
      const needsDetail = !hi || !hasDevanagari(hi) || /[A-Za-z]{5,}/.test(hi.replace(/https?:\/\/\S+/g, "").replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, ""));
      if (!needsDetail) continue;

      console.log(`  ${person.name_en}: translating details (${en.length} chars)`);
      if (!APPLY) {
        detailsUpdated++;
        continue;
      }
      const translated = await translateProfileHtml(en, phraseCache);
      if (translated && hasDevanagari(translated)) {
        const { error } = await supabase
          .from("ccshau_faculty_people")
          .update({ detail_content_hi: translated })
          .eq("id", person.id);
        if (error) throw new Error(`${person.name_en} detail: ${error.message}`);
        detailsUpdated++;
      }
    }
  }

  console.log(`\nShort fields ${APPLY ? "updated" : "would update"}: ${shortUpdated}`);
  console.log(`Details ${APPLY ? "updated" : "would update"}: ${detailsUpdated}`);
  if (!APPLY) console.log("Dry-run only. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
