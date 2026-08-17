/**
 * Seed faculty_people + faculty_assignments for a KVK microsite from legacy MySQL users.
 * Required when the college root is in faculty_people_public_college_ids (Phase 11).
 *
 * Usage:
 *   node seed-kvk-faculty.mjs --slug=krishi-vigyan-kendra-bawal --dry-run
 *   node seed-kvk-faculty.mjs --slug=krishi-vigyan-kendra-bawal --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

const COLLEGE_SLUG = argValue("--slug");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

function loadFromWeb(name) {
  return createRequire(join(ROOT, "apps/web/package.json"))(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");

function personName(row) {
  return `${row.first_name || ""} ${row.last_name || ""}`.replace(/\s+/g, " ").trim();
}

function facultyPhotoUrl(profileImage) {
  if (!profileImage) return null;
  const path = String(profileImage).replace(/^\/+/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return `https://hau.ac.in/storage/app/${path}`;
}

/** Live hau.ac.in faculty list — local MySQL college_id can be stale. */
async function fetchLiveFaculty(legacyCollegeId) {
  const res = await fetch(
    `https://hau.ac.in/college/faculty/${legacyCollegeId}/teaching_staff`,
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

function mergeFacultyRows(liveRows, mysqlRows) {
  const byId = new Map(mysqlRows.map((row) => [String(row.id), row]));
  if (liveRows.length === 0) return mysqlRows;
  return liveRows.map((live, index) => {
    const id = String(live.id ?? live.user_id ?? "");
    const local = byId.get(id) || {};
    return {
      id,
      first_name: live.first_name ?? local.first_name,
      last_name: live.last_name ?? local.last_name,
      email: live.email || local.email,
      designation: live.designation || local.designation,
      specialization: live.specialization || local.specialization,
      profile_image: live.profile_image || local.profile_image,
      view_order: live.view_order ?? local.view_order ?? index + 1,
      contact_number: live.contact_number || local.contact_number,
      qualification: live.qualification || local.qualification,
      other_activity: live.other_activity || local.other_activity,
    };
  });
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(supabase, preferred) {
  const base = slugify(preferred) || `faculty-${Date.now()}`;
  for (let i = 0; i < 30; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await supabase
      .from("ccshau_faculty_people")
      .select("id")
      .eq("global_slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

async function mysqlConn() {
  return mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }
  if (!COLLEGE_SLUG) {
    console.error("Missing --slug=krishi-vigyan-kendra-bawal");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error: pageErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", COLLEGE_SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page?.id) throw new Error(`Page not found: ${COLLEGE_SLUG}`);

  const conn = await mysqlConn();
  const [colleges] = await conn.query(
    `SELECT college_id FROM hau_college WHERE college_slug = ? LIMIT 1`,
    [COLLEGE_SLUG],
  );
  const legacyCollegeId = colleges[0]?.college_id;
  if (!legacyCollegeId) {
    await conn.end();
    throw new Error(`Legacy college not found for ${COLLEGE_SLUG}`);
  }

  const [mysqlRows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization,
            profile_image, view_order, contact_number, qualification, other_activity
     FROM users
     WHERE status = '1'
       AND FIND_IN_SET(?, REPLACE(college_id, ' ', ''))
     ORDER BY view_order, id`,
    [String(legacyCollegeId)],
  );
  await conn.end();

  const liveRows = await fetchLiveFaculty(legacyCollegeId);
  const userRows = mergeFacultyRows(liveRows, mysqlRows);

  const summary = {
    mode: CONFIRM ? "apply" : "dry-run",
    slug: COLLEGE_SLUG,
    pageId: page.id,
    legacyCollegeId: Number(legacyCollegeId),
    users: userRows.length,
    liveUsers: liveRows.length,
    mysqlUsers: mysqlRows.length,
    peopleCreated: 0,
    peopleReused: 0,
    assignmentsCreated: 0,
    assignmentsUpdated: 0,
    assignmentsDeactivated: 0,
    names: userRows.map(personName),
  };

  console.log(`${summary.mode} faculty for ${COLLEGE_SLUG}: ${userRows.length} legacy users`);

  for (const row of userRows) {
    const legacyId = String(row.id);
    const staffSlug = `legacy-user-${legacyId}`;
    const name = personName(row);
    const email = row.email ? String(row.email).trim().toLowerCase() : null;

    let person = null;
    const { data: byLegacy } = await supabase
      .from("ccshau_faculty_people")
      .select("*")
      .eq("legacy_user_id", legacyId)
      .maybeSingle();
    person = byLegacy;

    if (!person && email) {
      const { data: byEmail } = await supabase
        .from("ccshau_faculty_people")
        .select("*")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      person = byEmail;
    }

    const personPayload = {
      name_en: name,
      image_path: facultyPhotoUrl(row.profile_image),
      email,
      mobile: row.contact_number || null,
      qualification_en: row.qualification || null,
      specialization_en: row.specialization || null,
      detail_content_en: row.other_activity || null,
      legacy_user_id: legacyId,
      is_active: true,
    };

    if (CONFIRM) {
      if (!person) {
        const globalSlug = await uniqueSlug(supabase, staffSlug);
        const { data: inserted, error } = await supabase
          .from("ccshau_faculty_people")
          .insert({ ...personPayload, global_slug: globalSlug })
          .select("*")
          .single();
        if (error) throw new Error(`person ${name}: ${error.message}`);
        person = inserted;
        summary.peopleCreated += 1;
      } else {
        const { error } = await supabase
          .from("ccshau_faculty_people")
          .update(personPayload)
          .eq("id", person.id);
        if (error) throw new Error(`person update ${name}: ${error.message}`);
        summary.peopleReused += 1;
      }

      const assignmentPayload = {
        person_id: person.id,
        page_id: page.id,
        source_staff_id: null,
        designation_en: String(row.designation || "Faculty").slice(0, 500),
        specialization_en: row.specialization || null,
        member_type: "faculty",
        staff_slug: staffSlug,
        sort_order: Number(row.view_order) || Number(row.id),
        is_active: true,
      };

      const { data: existingAssignment } = await supabase
        .from("ccshau_faculty_assignments")
        .select("id")
        .eq("person_id", person.id)
        .eq("page_id", page.id)
        .maybeSingle();

      if (existingAssignment?.id) {
        const { error } = await supabase
          .from("ccshau_faculty_assignments")
          .update(assignmentPayload)
          .eq("id", existingAssignment.id);
        if (error) throw new Error(`assignment update ${name}: ${error.message}`);
        summary.assignmentsUpdated += 1;
      } else {
        const { error } = await supabase
          .from("ccshau_faculty_assignments")
          .insert(assignmentPayload);
        if (error) throw new Error(`assignment insert ${name}: ${error.message}`);
        summary.assignmentsCreated += 1;
      }
    }

    console.log(`  ${name} — ${row.designation} (${row.specialization || "—"})`);
  }

  if (CONFIRM) {
    const keepSlugs = new Set(userRows.map((row) => `legacy-user-${row.id}`));
    const { data: currentAssignments, error: listErr } = await supabase
      .from("ccshau_faculty_assignments")
      .select("id, staff_slug")
      .eq("page_id", page.id)
      .eq("is_active", true);
    if (listErr) throw new Error(listErr.message);
    for (const row of currentAssignments || []) {
      if (keepSlugs.has(row.staff_slug)) continue;
      const { error } = await supabase
        .from("ccshau_faculty_assignments")
        .update({ is_active: false })
        .eq("id", row.id);
      if (error) throw new Error(`deactivate ${row.staff_slug}: ${error.message}`);
      summary.assignmentsDeactivated += 1;
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, `seed-kvk-faculty-${COLLEGE_SLUG}.json`);
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
