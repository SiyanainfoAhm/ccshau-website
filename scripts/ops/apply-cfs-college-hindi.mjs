#!/usr/bin/env node
/**
 * Apply Hindi for College of Fisheries Science — dept menu, sidebar, about content.
 *
 * Usage:
 *   node scripts/ops/apply-cfs-college-hindi.mjs
 *   node scripts/ops/apply-cfs-college-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXACT_DESIGNATION_HI } from "./faculty-designation-hindi.mjs";
import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-of-fisheries-science";
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");

const DEPT_TITLES_HI = {
  "cfs-aquaculture": "जलीय कृषि",
  "cfs-aquatic-animal-health-management": "जलीय पशु स्वास्थ्य प्रबंधन",
  "cfs-aquatic-environment-management": "जलीय पर्यावरण प्रबंधन",
  "cfs-fish-engineering": "मत्स्य अभियांत्रिकी",
  "cfs-fish-processing-technology": "मत्स्य प्रसंस्करण प्रौद्योगिकी",
  "cfs-fisheries-extension-economics-and-statistics": "मत्स्य विस्तार, अर्थशास्त्र और सांख्यिकी",
  "cfs-fisheries-resource-management": "मत्स्य संसाधन प्रबंधन",
};

const SIDEBAR_LABELS_HI = {
  "Head of Department": "विभागाध्यक्ष",
  Faculty: "संकाय",
  "Thurst Areas, Mission and Vision": "प्रमुख कार्य क्षेत्र, मिशन और दृष्टि",
  "Courses offered": "संचालित पाठ्यक्रम",
  "Faculty Achievements": "संकाय उपलब्धियाँ",
  "Student Achievements": "छात्र उपलब्धियाँ",
  "Alumni of the Department": "विभाग के पूर्व छात्र",
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

function hasDevanagari(t) {
  return /[\u0900-\u097F]/.test(t ?? "");
}
function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}
function isMixed(hi) {
  return hi?.trim() && hasDevanagari(hi) && hasLatin(hi);
}

async function syncFaculty(staffId, patch) {
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

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, title_en")
    .eq("slug", COLLEGE_SLUG)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error("College not found");

  const stats = { titles: 0, sidebars: 0, about: 0, faculty: 0, synced: 0 };

  for (const [slug, titleHi] of Object.entries(DEPT_TITLES_HI)) {
    if (!APPLY) {
      stats.titles++;
      continue;
    }
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ title_hi: titleHi })
      .eq("college_root_id", college.id)
      .eq("slug", slug);
    if (error) throw error;
    stats.titles++;
  }

  const { data: depts } = await supabase
    .from("ccshau_pages")
    .select("id, slug")
    .eq("college_root_id", college.id)
    .eq("layout_template", "office_portal");
  const deptIds = (depts ?? []).map((d) => d.id);

  const { data: sidebarItems } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, label_hi")
    .in("page_id", deptIds)
    .eq("is_active", true);

  for (const item of sidebarItems ?? []) {
    const target = SIDEBAR_LABELS_HI[item.label_en?.trim()];
    if (!target || item.label_hi === target) continue;
    if (!APPLY) {
      stats.sidebars++;
      continue;
    }
    await supabase.from("ccshau_page_sidebar_items").update({ label_hi: target }).eq("id", item.id);
    stats.sidebars++;
  }

  for (const slug of Object.keys(DEPT_TITLES_HI)) {
    const hiPath = join(ABOUT_DIR, `${slug}-hi.html`);
    if (!existsSync(hiPath)) continue;
    const contentHi = readFileSync(hiPath, "utf8");
    if (!hasDevanagari(contentHi)) continue;
    if (!APPLY) {
      stats.about++;
      continue;
    }
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ content_hi: contentHi })
      .eq("college_root_id", college.id)
      .eq("slug", slug);
    if (error) throw error;
    stats.about++;
  }

  const { pageIds } = await resolveStaffPageIds(supabase, college.id, { publishedOnly: true });
  const { data: staff } = await supabase
    .from("ccshau_page_staff")
    .select("id, designation_en, designation_hi, specialization_en, specialization_hi")
    .in("page_id", pageIds)
    .eq("is_active", true);

  for (const row of staff ?? []) {
    const patch = {};
    if (row.designation_en?.trim() && isMixed(row.designation_hi)) {
      const dhi = EXACT_DESIGNATION_HI[row.designation_en.trim()];
      if (dhi) patch.designation_hi = dhi;
    }
    if (row.specialization_en?.trim() && isMixed(row.specialization_hi)) {
      // import translateSpec from fix script inline - use phrase for fisheries
      const { translateFacultyProfileHtml } = await import("./faculty-html-translate.mjs");
      const specHi = translateFacultyProfileHtml(`<p>${row.specialization_en}</p>`)
        ?.replace(/<\/?p>/g, "")
        .trim();
      if (specHi && hasDevanagari(specHi) && !hasLatin(specHi)) patch.specialization_hi = specHi;
    }
    if (!Object.keys(patch).length) continue;
    if (!APPLY) {
      stats.faculty++;
      continue;
    }
    await supabase.from("ccshau_page_staff").update(patch).eq("id", row.id);
    if (await syncFaculty(row.id, patch)) stats.synced++;
    stats.faculty++;
  }

  console.log(`${APPLY ? "Applied" : "Would apply"} for ${college.title_en}:`);
  console.log(`  dept menu titles: ${stats.titles}`);
  console.log(`  sidebar labels: ${stats.sidebars}`);
  console.log(`  about content: ${stats.about}`);
  console.log(`  faculty fixes: ${stats.faculty}`);
  if (APPLY) console.log(`  synced: ${stats.synced}`);
  if (!APPLY) console.log("\nDry-run. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
