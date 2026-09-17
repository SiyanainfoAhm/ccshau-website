#!/usr/bin/env node
/**
 * Align AAREM faculty with legacy https://hau.ac.in/department/MjA=/NzI=
 * Faculty table should only list:
 *   1. Dr. Jayanti Tokas — Joint Director — Plant Biochemistry
 *   2. Dr. Anurag — Asstt. Scientist cum Asstt. Director — GIS, Remote Sensing, Cartography
 * HOD (Yogesh) stays; HOD is excluded from faculty table in UI.
 *
 *   node scripts/ops/fix-hrm-aarem-faculty-legacy.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const AAREM_ID = "f8200e88-2ed4-4e60-9f22-219566617f72";

const KEEP_FACULTY = [
  { name: /jayanti\s*tokas/i, designation: "Joint Director", specialization: "Plant Biochemistry" },
  {
    name: /^dr\.?\s*anurag$/i,
    designation: "Asstt. Scientist cum Asstt. Director",
    specialization: "GIS, Remote Sensing, Cartography,",
  },
];

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data: asg, error } = await sb
    .from("ccshau_faculty_assignments")
    .select(
      "id, person_id, source_staff_id, designation_en, specialization_en, member_type, sort_order, is_active, person:person_id(name_en)",
    )
    .eq("page_id", AAREM_ID)
    .order("sort_order");
  if (error) throw error;

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("Current AAREM assignments:");
  for (const a of asg ?? []) {
    console.log(
      `  ${a.is_active ? "ON " : "off"} ${a.member_type.padEnd(7)} ${a.person?.name_en} | ${a.designation_en} | ${a.specialization_en ?? "—"}`,
    );
  }

  const keepName = (name) => KEEP_FACULTY.some((k) => k.name.test((name ?? "").trim()));
  const updates = [];

  for (const a of asg ?? []) {
    const name = a.person?.name_en ?? "";
    if (a.member_type === "hod") {
      // keep HOD active (Yogesh)
      updates.push({ id: a.id, action: "keep-hod", name });
      continue;
    }
    if (keepName(name)) {
      const spec = KEEP_FACULTY.find((k) => k.name.test(name.trim()));
      updates.push({
        id: a.id,
        source_staff_id: a.source_staff_id,
        action: "keep-faculty",
        name,
        designation_en: spec.designation,
        specialization_en: spec.specialization,
      });
    } else {
      updates.push({ id: a.id, source_staff_id: a.source_staff_id, action: "deactivate", name });
    }
  }

  console.log("\nPlan:");
  for (const u of updates) console.log(`  ${u.action}: ${u.name}`);

  if (!APPLY) {
    console.log("Pass --apply to write.");
    return;
  }

  for (const u of updates) {
    if (u.action === "deactivate") {
      await sb
        .from("ccshau_faculty_assignments")
        .update({ is_active: false, updated_at: now })
        .eq("id", u.id);
      if (u.source_staff_id) {
        await sb
          .from("ccshau_page_staff")
          .update({ is_active: false, updated_at: now })
          .eq("id", u.source_staff_id);
      }
    } else if (u.action === "keep-faculty") {
      await sb
        .from("ccshau_faculty_assignments")
        .update({
          is_active: true,
          member_type: "faculty",
          designation_en: u.designation_en,
          specialization_en: u.specialization_en,
          updated_at: now,
        })
        .eq("id", u.id);
      if (u.source_staff_id) {
        await sb
          .from("ccshau_page_staff")
          .update({
            is_active: true,
            designation_en: u.designation_en,
            specialization_en: u.specialization_en,
            updated_at: now,
          })
          .eq("id", u.source_staff_id);
      }
    }
  }

  // Deactivate empty college-template sidebar tabs not on legacy faculty page nav
  // Keep: HOD, Faculty, International MoU, National MoU, Application Form, List of Courses, Self Study Report
  const keepLabels = [
    /^head of department$/i,
    /^faculty$/i,
    /^international mou$/i,
    /^national mou$/i,
    /^application form/i,
    /^list of courses$/i,
    /^self study report/i,
  ];
  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, is_active")
    .eq("page_id", AAREM_ID);
  for (const s of sides ?? []) {
    const keep = keepLabels.some((re) => re.test(s.label_en.trim()));
    if (s.is_active === keep) continue;
    await sb
      .from("ccshau_page_sidebar_items")
      .update({ is_active: keep, updated_at: now })
      .eq("id", s.id);
    console.log(`  sidebar ${s.label_en}: ${keep ? "KEEP" : "off"}`);
  }

  const { data: after } = await sb
    .from("ccshau_faculty_assignments")
    .select("member_type, designation_en, specialization_en, is_active, person:person_id(name_en)")
    .eq("page_id", AAREM_ID)
    .eq("is_active", true)
    .order("sort_order");
  console.log("\nActive after:");
  for (const a of after ?? []) {
    console.log(`  ${a.member_type} ${a.person?.name_en} | ${a.designation_en} | ${a.specialization_en ?? "—"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
