#!/usr/bin/env node
/**
 * Phase 1 — Directorate of Research page headers (title_hi, excerpt_hi).
 *
 * Usage:
 *   node scripts/ops/apply-dor-phase1-headers.mjs
 *   node scripts/ops/apply-dor-phase1-headers.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEPT_SLUG_TITLES_HI } from "./department-hindi-shared.mjs";
import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "directorate-of-research";
const ORG_HI = "अनुसंधान निदेशालय";

const DOR_HEADERS = {
  "directorate-of-research": {
    title_hi: ORG_HI,
    excerpt_hi: `${ORG_HI} — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।`,
  },
  departments: {
    title_hi: "अनुसंधान सेवाएँ",
    excerpt_hi: `${ORG_HI} की अनुसंधान सेवाएँ।`,
  },
  "dor-gallery": {
    title_hi: "गैलरी",
    excerpt_hi: `${ORG_HI} की गैलरी।`,
  },
  "director-of-research-office": {
    title_hi: "अनुसंधान निदेशक कार्यालय",
    excerpt_hi: `${ORG_HI} का मुख्य कार्यालय।`,
  },
  "director-farm": {
    title_hi: "निदेशक खेत",
    excerpt_hi: `${ORG_HI} के अंतर्गत निदेशक खेत।`,
  },
  "ram-dhan-singh-seed-farm": {
    title_hi: "डॉ. राम धन सिंह बीज खेत",
    excerpt_hi: `${ORG_HI} के अंतर्गत डॉ. राम धन सिंह बीज खेत।`,
  },
  "nutri-cereals-research-station": {
    title_hi: "न्यूट्री-सीरियल्स अनुसंधान स्टेशन",
    excerpt_hi: `गोकल्पुरा (भिवानी) — ${ORG_HI}।`,
  },
  "regional-research-stations": {
    title_hi: "क्षेत्रीय अनुसंधान स्टेशन",
    excerpt_hi: `${ORG_HI} के क्षेत्रीय अनुसंधान स्टेशन।`,
  },
  "rdssf-department": {
    title_hi: "विभाग",
    excerpt_hi: "डॉ. राम धन सिंह बीज खेत के अंतर्गत विभाग।",
  },
  "stations-department": {
    title_hi: "विभाग",
    excerpt_hi: "क्षेत्रीय अनुसंधान स्टेशनों के अंतर्गत विभाग।",
  },
};

const TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI, ...DEPT_SLUG_TITLES_HI };

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

function needsTitle(en, hi, target) {
  if (!en?.trim() && !target) return false;
  if (target && hi?.trim() !== target) return true;
  if (!hi?.trim() || !/[\u0900-\u097F]/.test(hi)) return true;
  if (/[A-Za-z]/.test(hi) && /[\u0900-\u097F]/.test(hi)) return true;
  return false;
}

function resolveTitleHi(page) {
  if (DOR_HEADERS[page.slug]?.title_hi) return DOR_HEADERS[page.slug].title_hi;
  if (DEPT_SLUG_TITLES_HI[page.slug]) return DEPT_SLUG_TITLES_HI[page.slug];
  return TITLE_HI[page.title_en?.trim()] ?? null;
}

function resolveExcerptHi(page, titleHi) {
  if (DOR_HEADERS[page.slug]?.excerpt_hi) return DOR_HEADERS[page.slug].excerpt_hi;
  if (!titleHi) return null;
  return `${titleHi} — ${ORG_HI}।`;
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("Directorate of Research not found");

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi")
  .eq("college_root_id", college.id)
  .eq("status", "published");

let fields = 0;
const unmapped = [];

for (const page of pages ?? []) {
  const titleHi = resolveTitleHi(page);
  const patch = {};
  if (needsTitle(page.title_en, page.title_hi, titleHi) && titleHi) {
    patch.title_hi = titleHi;
  } else if (needsTitle(page.title_en, page.title_hi, null) && !titleHi) {
    unmapped.push(page.slug + ": " + page.title_en);
  }
  const excerptTitle = patch.title_hi ?? page.title_hi ?? titleHi;
  if (needsExcerpt(page.excerpt_en, page.excerpt_hi)) {
    const excerptHi = resolveExcerptHi(page, excerptTitle);
    if (excerptHi) patch.excerpt_hi = excerptHi;
  }
  if (!Object.keys(patch).length) continue;
  fields += Object.keys(patch).length;
  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
  } else {
    console.log(`  WOULD ${page.slug}`, patch);
  }
}

console.log(`Phase 1 DoR: ${fields} field(s) | unmapped titles: ${unmapped.length} | ${APPLY ? "APPLY" : "dry-run"}`);
if (unmapped.length) console.log("Unmapped:\n ", unmapped.join("\n  "));
if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
