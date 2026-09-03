#!/usr/bin/env node
/**
 * Sync Hindi fields from ccshau_page_staff → faculty_people + faculty_assignments.
 * The public site reads faculty_people/assignments, not page_staff directly.
 *
 * Usage:
 *   node scripts/ops/sync-faculty-hindi-from-page-staff.mjs --college=college-of-agriculture-hisar
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const collegeSlug =
  process.argv.find((a) => a.startsWith("--college="))?.split("=")[1] ??
  "college-of-agriculture-hisar";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function hasHi(value) {
  return typeof value === "string" && value.trim() && /[\u0900-\u097F]/.test(value);
}

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, title_en")
    .eq("slug", collegeSlug)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${collegeSlug}`);

  const { pageIds } = await resolveStaffPageIds(supabase, college.id, { publishedOnly: true });

  const { data: staffRows, error: staffErr } = await supabase
    .from("ccshau_page_staff")
    .select(
      "id, page_id, name_hi, designation_hi, specialization_hi, qualification_hi, experience_hi, detail_content_hi",
    )
    .in("page_id", pageIds)
    .eq("is_active", true);
  if (staffErr) throw new Error(staffErr.message);

  let peopleUpdated = 0;
  let assignmentsUpdated = 0;
  let skipped = 0;

  for (const staff of staffRows ?? []) {
    const { data: assignment } = await supabase
      .from("ccshau_faculty_assignments")
      .select("id, person_id")
      .eq("source_staff_id", staff.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      skipped += 1;
      continue;
    }

    const personPatch = {};
    if (hasHi(staff.name_hi)) personPatch.name_hi = staff.name_hi;
    if (hasHi(staff.qualification_hi)) personPatch.qualification_hi = staff.qualification_hi;
    if (hasHi(staff.experience_hi)) personPatch.experience_hi = staff.experience_hi;
    if (hasHi(staff.specialization_hi)) personPatch.specialization_hi = staff.specialization_hi;
    if (hasHi(staff.detail_content_hi)) personPatch.detail_content_hi = staff.detail_content_hi;

    const assignmentPatch = {};
    if (hasHi(staff.designation_hi)) assignmentPatch.designation_hi = staff.designation_hi;
    if (hasHi(staff.specialization_hi)) assignmentPatch.specialization_hi = staff.specialization_hi;

    if (Object.keys(personPatch).length) {
      const { error } = await supabase
        .from("ccshau_faculty_people")
        .update(personPatch)
        .eq("id", assignment.person_id);
      if (error) throw new Error(`person ${assignment.person_id}: ${error.message}`);
      peopleUpdated += 1;
    }

    if (Object.keys(assignmentPatch).length) {
      const { error } = await supabase
        .from("ccshau_faculty_assignments")
        .update(assignmentPatch)
        .eq("id", assignment.id);
      if (error) throw new Error(`assignment ${assignment.id}: ${error.message}`);
      assignmentsUpdated += 1;
    }
  }

  console.log(`College: ${college.title_en}`);
  console.log(`Staff rows scanned: ${staffRows?.length ?? 0}`);
  console.log(`faculty_people updated: ${peopleUpdated}`);
  console.log(`faculty_assignments updated: ${assignmentsUpdated}`);
  console.log(`Skipped (no assignment link): ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
