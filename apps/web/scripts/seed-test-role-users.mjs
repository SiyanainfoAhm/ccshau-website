/**
 * Seed test users for CMS roles, college roles, and one dept_admin per university department.
 * Run: node scripts/seed-test-role-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Admin@123";
const DEPT_REGISTRAR = "365a33a8-1009-4192-afb4-f99bd8349fb9";
const DEPT_ACADEMICS = "e234bb53-66a9-4929-88b6-1c7f3a409eda";
const COLLEGE_HISAR = "555239b2-bc8f-468b-82da-4592879e865b";

/** Core role-matrix accounts (kept for automated tests). */
const ROLE_MATRIX_USERS = [
  {
    email: "test.superadmin@ccshau.test",
    displayName: "Test Super Admin",
    cmsRole: "super_admin",
    departmentId: null,
    collegePageId: null,
    collegeRole: null,
  },
  {
    email: "test.deptadmin@ccshau.test",
    displayName: "Test Department Admin",
    cmsRole: "dept_admin",
    departmentId: DEPT_REGISTRAR,
    collegePageId: null,
    collegeRole: null,
  },
  {
    email: "test.editor@ccshau.test",
    displayName: "Test Content Editor",
    cmsRole: "editor",
    departmentId: DEPT_ACADEMICS,
    collegePageId: null,
    collegeRole: null,
  },
  {
    email: "test.viewer@ccshau.test",
    displayName: "Test Viewer",
    cmsRole: "viewer",
    departmentId: DEPT_ACADEMICS,
    collegePageId: null,
    collegeRole: null,
  },
  {
    email: "test.collegeadmin@ccshau.test",
    displayName: "Test College Admin",
    cmsRole: null,
    departmentId: null,
    collegePageId: COLLEGE_HISAR,
    collegeRole: "college_admin",
  },
  {
    email: "test.collegeeditor@ccshau.test",
    displayName: "Test College Editor",
    cmsRole: null,
    departmentId: null,
    collegePageId: COLLEGE_HISAR,
    collegeRole: "college_editor",
  },
  {
    email: "test.collegeviewer@ccshau.test",
    displayName: "Test College Viewer",
    cmsRole: null,
    departmentId: null,
    collegePageId: COLLEGE_HISAR,
    collegeRole: "college_viewer",
  },
];

async function loadDepartments() {
  const { data, error } = await admin
    .from("ccshau_departments")
    .select("id, slug, name_en")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load departments: ${error.message}`);
  return data ?? [];
}

function departmentTestUsers(departments) {
  return departments.map((dept) => ({
    email: `test.dept.${dept.slug}@ccshau.test`,
    displayName: `Test Dept Admin — ${dept.name_en}`,
    cmsRole: "dept_admin",
    departmentId: dept.id,
    collegePageId: null,
    collegeRole: null,
  }));
}

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureUser(config) {
  let userId;
  const existing = await findUserByEmail(config.email);

  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: config.displayName },
    });
    if (error) throw new Error(`${config.email}: ${error.message}`);
    console.log(`Updated auth user: ${config.email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: config.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: config.displayName },
    });
    if (error || !data.user) throw new Error(`${config.email}: ${error?.message ?? "create failed"}`);
    userId = data.user.id;
    console.log(`Created auth user: ${config.email}`);
  }

  await admin.from("ccshau_profiles").upsert({
    id: userId,
    display_name: config.displayName,
    email: config.email,
    department_id: config.departmentId,
    is_active: true,
  });

  await admin.from("ccshau_user_roles").delete().eq("user_id", userId);
  if (config.cmsRole) {
    const { error } = await admin.from("ccshau_user_roles").insert({
      user_id: userId,
      role: config.cmsRole,
      department_id: config.cmsRole === "super_admin" ? null : config.departmentId,
    });
    if (error) throw new Error(`${config.email} role: ${error.message}`);
  }

  await admin.from("ccshau_user_colleges").delete().eq("user_id", userId);
  if (config.collegePageId && config.collegeRole) {
    const { error } = await admin.from("ccshau_user_colleges").insert({
      user_id: userId,
      college_page_id: config.collegePageId,
      role: config.collegeRole,
    });
    if (error) throw new Error(`${config.email} college: ${error.message}`);
  }

  return userId;
}

console.log("Seeding test role users…\n");

console.log("— Role matrix accounts —");
for (const config of ROLE_MATRIX_USERS) {
  await ensureUser(config);
}

console.log("\n— One department admin per university department —");
const departments = await loadDepartments();
if (departments.length === 0) {
  console.warn("No active departments found in ccshau_departments.");
} else {
  for (const config of departmentTestUsers(departments)) {
    await ensureUser(config);
  }
  console.log("\nDepartment test logins (all passwords: Admin@123):");
  for (const dept of departments) {
    console.log(`  ${dept.name_en.padEnd(36)} test.dept.${dept.slug}@ccshau.test`);
  }
}

console.log("\nDone. Password for all accounts:", PASSWORD);
