#!/usr/bin/env node
/**
 * Phased Hindi for one college/directorate microsite:
 *   Phase 1 — sidebar labels
 *   Phase 2 — department sub-menu titles (title_hi)
 *   Phase 3 — about department (content_hi)
 *   Phase 4 — faculty designation/specialization sync
 *
 * Usage:
 *   node scripts/ops/apply-college-dept-hindi-phased.mjs --college=college-of-biotechnology
 *   node scripts/ops/apply-college-dept-hindi-phased.mjs --college=college-of-biotechnology --apply
 *   node scripts/ops/apply-college-dept-hindi-phased.mjs --college=college-of-biotechnology --apply --phase=sidebar
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  lookupSidebarLabelHi,
  needsHi,
  hasDevanagari,
  translateDepartmentTitle,
  translateAboutHtmlPhrase,
} from "./department-hindi-shared.mjs";
import { translateHtmlEnToHi, sleep } from "./translate-en-hi.mjs";
import { EXACT_DESIGNATION_HI } from "./faculty-designation-hindi.mjs";
import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const collegeSlug = process.argv.find((a) => a.startsWith("--college="))?.split("=")[1];
const phaseArg = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "all";
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");

const PHASES =
  phaseArg === "all"
    ? ["sidebar", "titles", "about", "faculty"]
    : phaseArg.split(",").map((p) => p.trim());

if (!collegeSlug && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.error("Usage: node apply-college-dept-hindi-phased.mjs --college=<slug> [--apply] [--phase=all|sidebar|titles|about|faculty]");
  process.exit(1);
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

function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}
function isMixed(hi) {
  return hi?.trim() && hasDevanagari(hi) && hasLatin(hi);
}

async function syncFaculty(supabase, staffId, patch) {
  const { data: assignment } = await supabase
    .from("ccshau_faculty_assignments")
    .select("id, person_id")
    .eq("source_staff_id", staffId)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) return false;
  const personPatch = {};
  if (patch.specialization_hi) personPatch.specialization_hi = patch.specialization_hi;
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

async function resolveAboutHi(slug, contentEn, apply) {
  const hiFile = join(ABOUT_DIR, `${slug}-hi.html`);
  if (existsSync(hiFile)) {
    const curated = readFileSync(hiFile, "utf8");
    if (hasDevanagari(curated)) return curated;
  }
  const phrase = translateAboutHtmlPhrase(contentEn);
  if (phrase && hasDevanagari(phrase) && !needsHi(contentEn, phrase)) return phrase;
  if (!apply) return null;
  const machine = await translateHtmlEnToHi(contentEn);
  if (machine && hasDevanagari(machine)) return machine;
  return null;
}

const BAD_SIDEBAR_HI = [
  /^(थ्रस्ट|झस्ट|Thurst)\s*क्षेत्र$/i,
  /^Thrust Area$/i,
  /^Thurst Area$/i,
  /^थ्रस्ट क्षेत्र$/i,
];

async function phaseSidebar(deptIds, stats, { apply, supabase }) {
  const { data: items } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, label_hi")
    .in("page_id", deptIds)
    .eq("is_active", true);

  for (const item of items ?? []) {
    const en = item.label_en?.trim();
    if (!en) continue;
    let target = lookupSidebarLabelHi(en);
    if (!target) {
      target = translateDepartmentTitle("", en);
    }
    const hi = item.label_hi?.trim() ?? "";
    const badHi = BAD_SIDEBAR_HI.some((re) => re.test(hi));
    const shouldUpdate = badHi || needsHi(en, item.label_hi);
    if (!target || !shouldUpdate || target === item.label_hi) continue;
    stats.sidebar++;
    if (!apply) continue;
    await supabase.from("ccshau_page_sidebar_items").update({ label_hi: target }).eq("id", item.id);
  }
}

async function phaseTitles(depts, stats, { apply, supabase }) {
  for (const d of depts) {
    if (!needsHi(d.title_en, d.title_hi)) continue;
    const titleHi = translateDepartmentTitle(d.slug, d.title_en);
    if (!titleHi || titleHi === d.title_hi) continue;
    stats.titles++;
    if (!apply) continue;
    await supabase.from("ccshau_pages").update({ title_hi: titleHi }).eq("id", d.id);
  }
}

async function phaseAbout(depts, stats, { apply, supabase }) {
  for (const d of depts) {
    if (!d.content_en?.trim() || !needsHi(d.content_en, d.content_hi)) continue;
    if (!apply) {
      stats.about++;
      continue;
    }
    const contentHi = await resolveAboutHi(d.slug, d.content_en, apply);
    if (!contentHi || contentHi === d.content_hi) continue;
    stats.about++;
    await supabase.from("ccshau_pages").update({ content_hi: contentHi }).eq("id", d.id);
    await sleep(300);
  }
}

async function phaseFaculty(collegeId, stats, { apply, supabase }) {
  const { pageIds } = await resolveStaffPageIds(supabase, collegeId, { publishedOnly: true });
  if (!pageIds.length) return;
  const { data: staff } = await supabase
    .from("ccshau_page_staff")
    .select("id, designation_en, designation_hi, specialization_en, specialization_hi")
    .in("page_id", pageIds)
    .eq("is_active", true);

  for (const row of staff ?? []) {
    const patch = {};
    if (row.designation_en?.trim() && (needsHi(row.designation_en, row.designation_hi) || isMixed(row.designation_hi))) {
      const dhi = EXACT_DESIGNATION_HI[row.designation_en.trim()];
      if (dhi) patch.designation_hi = dhi;
    }
    if (!Object.keys(patch).length) continue;
    stats.faculty++;
    if (!apply) continue;
    await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
    await syncFaculty(supabase, row.id, patch);
  }
}

async function processCollegePhased(supabase, collegeSlug, { apply = false, phases = ["sidebar", "titles", "about", "faculty"] } = {}) {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", collegeSlug)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`Microsite not found: ${collegeSlug}`);

  const { data: depts } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, title_hi, content_en, content_hi")
    .eq("college_root_id", college.id)
    .eq("layout_template", "office_portal")
    .eq("status", "published");

  const deptIds = (depts ?? []).map((d) => d.id);
  const stats = { sidebar: 0, titles: 0, about: 0, faculty: 0 };

  console.log(`\n=== ${college.title_en} (${college.slug}) ===`);
  console.log(`Phases: ${phases.join(", ")} | ${apply ? "APPLY" : "dry-run"}`);

  const ctx = { apply, supabase };

  if (phases.includes("sidebar") && deptIds.length) await phaseSidebar(deptIds, stats, ctx);
  if (phases.includes("titles")) await phaseTitles(depts ?? [], stats, ctx);
  if (phases.includes("about")) await phaseAbout(depts ?? [], stats, ctx);
  if (phases.includes("faculty")) await phaseFaculty(college.id, stats, ctx);

  console.log(
    `  sidebar=${stats.sidebar} titles=${stats.titles} about=${stats.about} faculty=${stats.faculty}`,
  );
  return stats;
}

export { processCollegePhased };

async function main() {
  if (!collegeSlug) return;
  await processCollegePhased(supabase, collegeSlug, { apply: APPLY, phases: PHASES });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
