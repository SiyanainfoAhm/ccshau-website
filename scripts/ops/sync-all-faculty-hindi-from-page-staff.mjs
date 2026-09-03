#!/usr/bin/env node
/**
 * Sync all Hindi faculty fields from page_staff → faculty tables (all microsites).
 *
 * Usage:
 *   node scripts/ops/sync-all-faculty-hindi-from-page-staff.mjs
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

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

function hasHi(value) {
  return typeof value === "string" && value.trim() && /[\u0900-\u097F]/.test(value);
}

async function main() {
  const { data: allColleges } = await supabase
    .from("ccshau_pages")
    .select("id, slug, college_root_id")
    .eq("page_type", "college")
    .order("slug");

  const roots = (allColleges ?? []).filter((p) => p.college_root_id === p.id);
  let peopleUpdated = 0;
  let assignmentsUpdated = 0;
  let skipped = 0;

  for (const college of roots) {
    const { pageIds } = await resolveStaffPageIds(supabase, college.id, { publishedOnly: true });
    const { data: staffRows } = await supabase
      .from("ccshau_page_staff")
      .select(
        "id, name_hi, designation_hi, specialization_hi, qualification_hi, experience_hi, detail_content_hi",
      )
      .in("page_id", pageIds)
      .eq("is_active", true);

    for (const staff of staffRows ?? []) {
      const { data: assignment } = await supabase
        .from("ccshau_faculty_assignments")
        .select("id, person_id")
        .eq("source_staff_id", staff.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!assignment) {
        skipped++;
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
        await supabase.from("ccshau_faculty_people").update(personPatch).eq("id", assignment.person_id);
        peopleUpdated++;
      }
      if (Object.keys(assignmentPatch).length) {
        await supabase.from("ccshau_faculty_assignments").update(assignmentPatch).eq("id", assignment.id);
        assignmentsUpdated++;
      }
    }
  }

  console.log(`Microsites: ${roots.length}`);
  console.log(`faculty_people updated: ${peopleUpdated}`);
  console.log(`faculty_assignments updated: ${assignmentsUpdated}`);
  console.log(`Skipped (no assignment): ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
