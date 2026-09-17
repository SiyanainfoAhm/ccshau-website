#!/usr/bin/env node
/**
 * Fix IPR Cell faculty list empty:
 * Legacy HOD = Dr. Yogesh Jindal (Incharge IPR)
 * Legacy Faculty = Dr. Yogesh Kumar Jindal (Joint Director, Plant Breeding)
 * Currently only Joint Director is assigned as HOD → filtered out of Faculty table.
 *
 *   node scripts/ops/fix-hrm-ipr-faculty.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const PAGE_ID = "6d775969-a631-41fb-a78f-3c2618327bd0";
const INCHARGE_STAFF = "e4b853dd-aa69-4ae3-97cf-98b3b6d55689";
const INCHARGE_PERSON = "960e1f8f-19b9-4c6e-aa11-2d3f04fc2c7f";
const JOINT_STAFF = "8136055a-f5f1-4b62-bdf7-aa8b896e9f1d";
const JOINT_PERSON = "25312b20-62fc-43c8-9636-de8dd209de79";
const JOINT_ASG = "f10a6f41-de4f-4102-bfa1-08faa5aa02a9";

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

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("1) HOD → Dr. Yogesh Jindal (Incharge IPR)");
  console.log("2) Faculty → Dr. Yogesh Kumar Jindal (Joint Director, Plant Breeding)");

  if (!APPLY) {
    console.log("Pass --apply to write.");
    return;
  }

  // Ensure both staff active
  await sb
    .from("ccshau_page_staff")
    .update({
      is_active: true,
      designation_en: "Incharge IPR",
      designation_hi: "प्रभारी आई.पी.आर.",
      email: "ipr@hau.ac.in",
      mobile: "01662255414",
      sort_order: 1,
      updated_at: now,
    })
    .eq("id", INCHARGE_STAFF);

  await sb
    .from("ccshau_page_staff")
    .update({
      is_active: true,
      designation_en: "Joint Director",
      designation_hi: "संयुक्त निदेशक",
      specialization_en: "Plant Breeding",
      specialization_hi: "पादप प्रजनन",
      sort_order: 2,
      updated_at: now,
    })
    .eq("id", JOINT_STAFF);

  // Joint Director → faculty (was wrongly hod)
  {
    const { error } = await sb
      .from("ccshau_faculty_assignments")
      .update({
        member_type: "faculty",
        designation_en: "Joint Director",
        designation_hi: "संयुक्त निदेशक",
        specialization_en: "Plant Breeding",
        specialization_hi: "पादप प्रजनन",
        source_staff_id: JOINT_STAFF,
        sort_order: 2,
        is_active: true,
        updated_at: now,
      })
      .eq("id", JOINT_ASG);
    if (error) throw error;
    console.log("OK Joint Director → faculty");
  }

  // Incharge IPR → hod
  {
    const { data: existing } = await sb
      .from("ccshau_faculty_assignments")
      .select("id")
      .eq("page_id", PAGE_ID)
      .eq("person_id", INCHARGE_PERSON)
      .maybeSingle();

    const payload = {
      person_id: INCHARGE_PERSON,
      page_id: PAGE_ID,
      source_staff_id: INCHARGE_STAFF,
      designation_en: "Incharge IPR",
      designation_hi: "प्रभारी आई.पी.आर.",
      member_type: "hod",
      staff_slug: "yogesh-jindal-incharge-ipr",
      sort_order: 1,
      is_active: true,
      updated_at: now,
    };

    if (existing) {
      const { error } = await sb.from("ccshau_faculty_assignments").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from("ccshau_faculty_assignments").insert(payload);
      if (error) throw error;
    }
    console.log("OK Incharge IPR → hod");
  }

  // Sync person display for HOD
  await sb
    .from("ccshau_faculty_people")
    .update({
      name_en: "Dr. Yogesh Jindal",
      name_hi: "डॉ. योगेश जिंदल",
      email: "ipr@hau.ac.in",
      mobile: "01662255414",
      updated_at: now,
    })
    .eq("id", INCHARGE_PERSON);

  // Contact lines for IPR (legacy mailing)
  await sb.from("ccshau_page_contact_lines").delete().eq("page_id", PAGE_ID);
  const { error: cErr } = await sb.from("ccshau_page_contact_lines").insert([
    {
      page_id: PAGE_ID,
      label_en: "Mailing Address",
      label_hi: "डाक पता",
      value_en: "IPR Cell & BPD Unit, Directorate of Human Resource Management",
      value_hi: "आई.पी.आर. प्रकोष्ठ एवं बी.पी.डी. इकाई, मानव संसाधन प्रबंधन निदेशालय",
      sort_order: 1,
      is_active: true,
    },
    {
      page_id: PAGE_ID,
      label_en: "Phone No",
      label_hi: "दूरभाष संख्या",
      value_en: "01662255414",
      value_hi: "01662255414",
      sort_order: 2,
      is_active: true,
    },
    {
      page_id: PAGE_ID,
      label_en: "Email Id",
      label_hi: "ई-मेल आईडी",
      value_en: "ipr@hau.ac.in",
      value_hi: "ipr@hau.ac.in",
      sort_order: 3,
      is_active: true,
    },
  ]);
  if (cErr) throw cErr;

  const { data: page } = await sb.from("ccshau_pages").select("layout_config").eq("id", PAGE_ID).single();
  await sb
    .from("ccshau_pages")
    .update({
      layout_config: { ...(page?.layout_config ?? {}), contacts: true },
      updated_at: now,
    })
    .eq("id", PAGE_ID);

  const { data: after } = await sb
    .from("ccshau_faculty_assignments")
    .select("member_type, designation_en, specialization_en, is_active, person:person_id(name_en)")
    .eq("page_id", PAGE_ID)
    .eq("is_active", true)
    .order("sort_order");
  console.log("\nActive:");
  for (const a of after ?? []) {
    console.log(`  ${a.member_type} ${a.person?.name_en} | ${a.designation_en} | ${a.specialization_en ?? "—"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
