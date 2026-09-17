/**
 * Fix ECS House Allotment HOD to match legacy Head of Section:
 * Dr. M. L. Khichar, Chairman (legacy user 701)
 * Legacy: https://hau.ac.in/department/NTM=/MTAz
 *
 * Usage: node fix-ecs-house-allotment-hod.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");
const PAGE_SLUG = "ecs-house-allotment";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const mysqlConn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  // role_id 1 = college head often; on this dept page legacy UI shows Chairman (701) as Head of Section
  const [users] = await mysqlConn.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.contact_number, u.designation,
            u.profile_image, u.role_id, ud.department_id
     FROM hau_user_departments ud
     JOIN users u ON u.id = ud.user_id
     WHERE ud.department_id = 103
     ORDER BY u.role_id, u.view_order, u.id`,
  );
  await mysqlConn.end();

  console.log(
    "legacy dept users",
    users.map((u) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name || ""}`.trim(),
      desig: u.designation,
      role: u.role_id,
      email: u.email,
      phone: u.contact_number,
    })),
  );

  // Head of Section on legacy = Chairman Khichar (701), not EO Vashisht (343)
  const head = users.find((u) => Number(u.id) === 701) || users.find((u) => /chairman/i.test(u.designation || ""));
  const others = users.filter((u) => u.id !== head?.id);

  if (!head) throw new Error("Could not resolve Head of Section from legacy");

  const { data: page, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id")
    .eq("slug", PAGE_SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page) throw new Error("page missing");

  const { data: people } = await sb
    .from("ccshau_faculty_people")
    .select("id,name_en,email,legacy_user_id,image_path,mobile")
    .in("legacy_user_id", users.map((u) => String(u.id)));

  const byLegacy = Object.fromEntries(
    (people || []).map((p) => [String(p.legacy_user_id), p]),
  );

  const headPerson = byLegacy[String(head.id)];
  if (!headPerson) throw new Error(`Person missing for legacy user ${head.id}`);

  console.log({
    mode: CONFIRM ? "apply" : "dry-run",
    headOfSection: {
      legacyId: head.id,
      name: `${head.first_name}`.trim(),
      designation: head.designation,
      email: head.email,
      phone: head.contact_number,
      personId: headPerson.id,
    },
    faculty: others.map((u) => ({
      legacyId: u.id,
      name: u.first_name,
      designation: u.designation,
      personId: byLegacy[String(u.id)]?.id,
    })),
  });

  if (!CONFIRM) {
    console.log("Pass --confirm to write");
    return;
  }

  // Update head person contact/mobile if needed
  await sb
    .from("ccshau_faculty_people")
    .update({
      mobile: head.contact_number || headPerson.mobile,
      email: head.email || headPerson.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", headPerson.id);

  // Replace assignments on this page
  await sb.from("ccshau_faculty_assignments").delete().eq("page_id", page.id);

  const { error: hodErr } = await sb.from("ccshau_faculty_assignments").insert({
    page_id: page.id,
    person_id: headPerson.id,
    member_type: "hod",
    designation_en: head.designation || "Chairman",
    designation_hi: null,
    staff_slug: `legacy-user-${head.id}`,
    sort_order: 1,
    is_active: true,
  });
  if (hodErr) throw new Error(hodErr.message);

  let facultySort = 1;
  for (const u of others) {
    const person = byLegacy[String(u.id)];
    if (!person) {
      console.warn("skip missing person", u.id, u.first_name);
      continue;
    }
    // Do not list college EO as faculty on this section page unless legacy shows them under Faculty.
    // Legacy Head of Section is Khichar; Vashisht is college EO — keep only if role suggests faculty list.
    if (Number(u.id) === 343) {
      console.log("omit college EO from House Allotment faculty list", u.first_name);
      continue;
    }
    await sb.from("ccshau_faculty_assignments").insert({
      page_id: page.id,
      person_id: person.id,
      member_type: "faculty",
      designation_en: u.designation,
      staff_slug: `legacy-user-${u.id}`,
      sort_order: facultySort++,
      is_active: true,
    });
  }

  // Rename sidebar label to match legacy
  const { data: sidebars } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en")
    .eq("page_id", page.id)
    .eq("side", "left");

  const hodSidebar = (sidebars || []).find((s) =>
    /head of (department|section)/i.test(s.label_en || ""),
  );
  if (hodSidebar) {
    await sb
      .from("ccshau_page_sidebar_items")
      .update({
        label_en: "Head of Section",
        label_hi: "अनुभाग प्रमुख",
        updated_at: new Date().toISOString(),
      })
      .eq("id", hodSidebar.id);
  }

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
