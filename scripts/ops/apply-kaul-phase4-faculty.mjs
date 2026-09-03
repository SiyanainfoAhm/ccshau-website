#!/usr/bin/env node
/**
 * Phase 4 — Kaul faculty: qualification fixes + full profile HTML Hindi.
 * Re-translates mixed Hinglish profiles from detail_content_en (never from detail_content_hi).
 *
 * Usage:
 *   node scripts/ops/apply-kaul-phase4-faculty.mjs
 *   node scripts/ops/apply-kaul-phase4-faculty.mjs --apply
 *   node scripts/ops/apply-kaul-phase4-faculty.mjs --apply --phrases-only
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml, hasDevanagari } from "./faculty-html-translate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PHRASES_ONLY = process.argv.includes("--phrases-only");
const DEPT_SLUG = "kaul-agriculture-college";

const QUALIFICATION_HI = {
  "M.Sc. (Mathematics)": "एम.एससी. (गणित)",
  "M.Sc.(Mathematics)": "एम.एससी. (गणित)",
  "M.Sc (Mathematics)": "एम.एससी. (गणित)",
  "M.Tech Farm power and Machinery": "एम.टेक. (कृषि शक्ति और मशीनरी)",
  "M.Tech. Farm power and Machinery": "एम.टेक. (कृषि शक्ति और मशीनरी)",
};

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}
function isMixed(t) {
  return hasDevanagari(t) && hasLatin(t);
}
function devanagariRatio(text) {
  const plain = text.replace(/<[^>]+>/g, " ");
  const dev = (plain.match(/[\u0900-\u097F]/g) ?? []).length;
  return dev / Math.max(plain.replace(/\s+/g, "").length, 1);
}
function normalizeNodeText(text) {
  return text.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
function collectTextNodes(html) {
  const nodes = new Set();
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(html))) {
    const raw = normalizeNodeText(m[1]);
    if (raw.length < 2 || !/[A-Za-z]/.test(raw)) continue;
    if (/^[\d\s.,\-/;:()]+$/.test(raw)) continue;
    nodes.add(raw);
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

async function translatePhrase(text) {
  if (text.length > 4500) {
    const parts = [];
    let rest = text;
    while (rest.length > 4500) {
      let cut = rest.lastIndexOf(". ", 4500);
      if (cut < 2000) cut = rest.lastIndexOf(" ", 4500);
      if (cut < 2000) cut = 4500;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    const out = [];
    for (const p of parts) {
      const t = await translateWithGoogleGtx(p);
      if (!t) return null;
      out.push(t);
      await sleep(150);
    }
    return out.join(" ");
  }
  return translateWithGoogleGtx(text);
}

async function translateProfileHtml(htmlEn) {
  let html = translateFacultyProfileHtml(htmlEn) ?? htmlEn;
  const nodes = collectTextNodes(html);
  const phraseMap = new Map();
  for (const en of nodes) {
    if (phraseMap.has(en)) continue;
    const hi = await translatePhrase(en);
    if (hi && hasDevanagari(hi) && hi !== en) phraseMap.set(en, hi);
    await sleep(100);
  }
  for (const [en, hi] of phraseMap) {
    html = html.split(en).join(hi);
    const nbsp = en.replace(/ /g, "&nbsp;");
    if (nbsp !== en && html.includes(nbsp)) html = html.split(nbsp).join(hi);
  }
  return html;
}

async function syncStaff(staffId, patch) {
  const { data: assignment } = await supabase
    .from("ccshau_faculty_assignments")
    .select("id, person_id")
    .eq("source_staff_id", staffId)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) return false;
  const personPatch = {};
  if (patch.qualification_hi) personPatch.qualification_hi = patch.qualification_hi;
  if (patch.detail_content_hi) personPatch.detail_content_hi = patch.detail_content_hi;
  const assignmentPatch = {};
  if (patch.designation_hi) assignmentPatch.designation_hi = patch.designation_hi;
  if (patch.specialization_hi) assignmentPatch.specialization_hi = patch.specialization_hi;
  if (Object.keys(personPatch).length) {
    await supabase.from("ccshau_faculty_people").update(personPatch).eq("id", assignment.person_id);
  }
  if (Object.keys(assignmentPatch).length) {
    await supabase.from("ccshau_faculty_assignments").update(assignmentPatch).eq("id", assignment.id);
  }
  return true;
}

function shouldRetranslateProfile(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim() || !hasDevanagari(hi)) return true;
  if (isMixed(hi)) return true;
  return devanagariRatio(hi) < 0.92;
}

async function main() {
  const { data: dept } = await supabase.from("ccshau_pages").select("id").eq("slug", DEPT_SLUG).maybeSingle();
  if (!dept) throw new Error(`Department not found: ${DEPT_SLUG}`);

  const { data: staffRows } = await supabase
    .from("ccshau_page_staff")
    .select(
      "id, name_en, designation_en, designation_hi, specialization_en, specialization_hi, qualification_en, qualification_hi, detail_content_en, detail_content_hi",
    )
    .eq("page_id", dept.id)
    .eq("is_active", true)
    .order("sort_order");

  console.log(`Phase 4 faculty | ${APPLY ? "APPLY" : "dry-run"} | staff: ${(staffRows ?? []).length}`);

  let qualFixed = 0;
  let profilesUpdated = 0;
  let synced = 0;

  for (const row of staffRows ?? []) {
    const patch = {};

    const qen = row.qualification_en?.trim();
    if (qen) {
      let qhi = QUALIFICATION_HI[qen];
      if (!qhi && /Mathematics/i.test(qen)) qhi = "एम.एससी. (गणित)";
      if (qhi && row.qualification_hi !== qhi) {
        patch.qualification_hi = qhi;
        qualFixed++;
        console.log(`\n${row.name_en} — qualification: ${qen} → ${patch.qualification_hi}`);
      }
    }

    const en = row.detail_content_en?.trim();
    const hi = row.detail_content_hi?.trim();
    if (en && shouldRetranslateProfile(en, hi)) {
      console.log(`\n${row.name_en} — profile retranslate (mixed=${isMixed(hi)})`);
      if (APPLY) {
        let translated;
        if (PHRASES_ONLY) {
          translated = translateFacultyProfileHtml(en);
        } else {
          translated = await translateProfileHtml(en);
        }
        const ratio = devanagariRatio(translated ?? "");
        console.log(`  Hindi ratio: ${(ratio * 100).toFixed(1)}% | mixed=${isMixed(translated)}`);
        if (translated && hasDevanagari(translated) && ratio >= 0.15) {
          patch.detail_content_hi = translated;
          profilesUpdated++;
        } else {
          console.log("  skip save (translation insufficient)");
        }
      } else {
        console.log(`  would retranslate profile${PHRASES_ONLY ? " (phrases)" : ""}`);
        profilesUpdated++;
      }
    }

    if (!Object.keys(patch).length) continue;
    if (!APPLY) continue;

    await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
    if (await syncStaff(row.id, patch)) synced++;
  }

  console.log(`\nQualification fixed: ${qualFixed}`);
  console.log(`Profiles updated: ${profilesUpdated}`);
  if (APPLY) console.log(`Synced to public tables: ${synced}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
