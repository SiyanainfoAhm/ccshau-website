#!/usr/bin/env node
/**
 * Apply full faculty Hindi — designation, qualification, detail profile HTML.
 * All colleges/directorates. Syncs to faculty_people/assignments.
 *
 * Usage:
 *   node scripts/ops/apply-all-faculty-full-hindi.mjs
 *   node scripts/ops/apply-all-faculty-full-hindi.mjs --apply
 *   node scripts/ops/apply-all-faculty-full-hindi.mjs --apply --fields=designation,qualification
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml, hasDevanagari } from "./faculty-html-translate.mjs";
import {
  EXACT_DESIGNATION_HI,
  QUALIFICATION_PHRASES,
} from "./faculty-designation-hindi.mjs";
import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const fieldsArg = process.argv.find((a) => a.startsWith("--fields="))?.split("=")[1];
const FIELDS = fieldsArg
  ? new Set(fieldsArg.split(",").map((s) => s.trim()))
  : new Set(["designation", "qualification", "detail_content"]);

function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}
function isMixed(hi) {
  return hi?.trim() && hasDevanagari(hi) && hasLatin(hi);
}
function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (hi.trim() === en.trim()) return true;
  if (!hasDevanagari(hi)) return true;
  return false;
}

function translateDesignation(en) {
  if (!en?.trim()) return null;
  const exact = EXACT_DESIGNATION_HI[en.trim()];
  if (exact) return exact;
  return null;
}

function mapQualSubject(s) {
  const sub = s.trim();
  const map = {
    Bioinformatics: "जैव सूचना विज्ञान",
    EECM: "ई.ई.सी.एम.",
    "G&PB": "आनुवंशिकी एवं पादप प्रजनन",
    Stat: "सांख्यिकी",
    "IIT Roorkee": "आई.आई.टी. रुड़की",
    "Vegetable Science": "सब्जी विज्ञान",
    "Electrical Engineering": "विद्युत अभियांत्रिकी",
  };
  if (map[sub]) return map[sub];
  let out = sub;
  for (const [phrase, hi] of QUALIFICATION_PHRASES) {
    if (out.includes(phrase)) out = out.split(phrase).join(hi);
  }
  return out;
}

function translateQualification(en) {
  if (!en?.trim()) return null;
  if (/^\d+$/.test(en.trim())) return null;

  let out = en.trim();
  out = out.replace(/Ph\.?\s*D\.?\s*\(([^)]+)\)/gi, (_, sub) => `पी.एच.डी. (${mapQualSubject(sub)})`);
  out = out.replace(/Ph\.?\s*D\.?\s*,?\s*/gi, "पी.एच.डी. ");
  out = out.replace(/\bM\.?\s*Sc\.?\s*\(([^)]+)\)/gi, (_, sub) => `एम.एससी. (${mapQualSubject(sub)})`);
  out = out.replace(/\bM\.?\s*P\.?\s*Ed\.?\s*,?\s*/gi, "एम.पी.एड. ");
  out = out.replace(/\bNutritionist\b/gi, "पोषण विशेषज्ञ");
  out = out.replace(/\bCanada\b/gi, "कनाडा");

  for (const [phrase, hi] of QUALIFICATION_PHRASES) {
    if (out.includes(phrase)) out = out.split(phrase).join(hi);
  }
  return hasDevanagari(out) ? out.replace(/\s+/g, " ").trim() : null;
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

async function syncFaculty(staffId, patch) {
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

  if (Object.keys(personPatch).length) {
    await supabase.from("ccshau_faculty_people").update(personPatch).eq("id", assignment.person_id);
  }
  if (Object.keys(assignmentPatch).length) {
    await supabase.from("ccshau_faculty_assignments").update(assignmentPatch).eq("id", assignment.id);
  }
  return true;
}

async function main() {
  const { data: allColleges } = await supabase
    .from("ccshau_pages")
    .select("id, slug, college_root_id")
    .eq("page_type", "college")
    .order("slug");

  const roots = (allColleges ?? []).filter((p) => p.college_root_id === p.id);
  const stats = { designation: 0, qualification: 0, detail_content: 0, synced: 0 };
  const unmapped = { designation: new Set(), qualification: new Set() };

  for (const college of roots) {
    const { pageIds } = await resolveStaffPageIds(supabase, college.id, { publishedOnly: true });
    if (!pageIds.length) continue;

    const { data: staff } = await supabase
      .from("ccshau_page_staff")
      .select(
        "id, designation_en, designation_hi, qualification_en, qualification_hi, detail_content_en, detail_content_hi",
      )
      .in("page_id", pageIds)
      .eq("is_active", true);

    for (const row of staff ?? []) {
      const patch = {};

      if (FIELDS.has("designation")) {
        const en = row.designation_en?.trim();
        const hi = row.designation_hi?.trim();
        if (en && (isMixed(hi) || needsHi(en, hi))) {
          const newHi = translateDesignation(en);
          if (newHi && newHi !== hi) patch.designation_hi = newHi;
          else if (!newHi) unmapped.designation.add(en);
        }
      }

      if (FIELDS.has("qualification")) {
        const en = row.qualification_en?.trim();
        const hi = row.qualification_hi?.trim();
        if (en && (needsHi(en, hi) || isMixed(hi))) {
          const newHi = translateQualification(en);
          if (newHi && newHi !== hi) patch.qualification_hi = newHi;
          else if (!newHi) unmapped.qualification.add(en);
        }
      }

      if (FIELDS.has("detail_content")) {
        const en = row.detail_content_en?.trim();
        const hi = row.detail_content_hi?.trim();
        if (en && (needsHi(en, hi) || isMixed(hi))) {
          const newHi = translateFacultyProfileHtml(en);
          if (newHi && hasDevanagari(newHi) && newHi !== hi) {
            patch.detail_content_hi = newHi;
          }
        }
      }

      if (!Object.keys(patch).length) continue;

      if (FIELDS.has("designation") && patch.designation_hi) stats.designation++;
      if (FIELDS.has("qualification") && patch.qualification_hi) stats.qualification++;
      if (FIELDS.has("detail_content") && patch.detail_content_hi) stats.detail_content++;

      if (!APPLY) continue;

      const { error } = await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
      if (error) throw error;
      if (await syncFaculty(row.id, patch)) stats.synced++;
    }
  }

  console.log(`${APPLY ? "Applied" : "Would apply"}:`);
  console.log(`  designation: ${stats.designation}`);
  console.log(`  qualification: ${stats.qualification}`);
  console.log(`  detail_content: ${stats.detail_content}`);
  if (APPLY) console.log(`  synced: ${stats.synced}`);
  if (unmapped.designation.size) {
    console.log(`\nUnmapped designations (${unmapped.designation.size}):`);
    for (const u of [...unmapped.designation].sort().slice(0, 8)) console.log(`  ! ${u}`);
  }
  if (unmapped.qualification.size) {
    console.log(`\nUnmapped qualifications (${unmapped.qualification.size}):`);
    for (const u of [...unmapped.qualification].sort().slice(0, 8)) console.log(`  ! ${u}`);
  }
  if (!APPLY) console.log("\nDry-run. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
