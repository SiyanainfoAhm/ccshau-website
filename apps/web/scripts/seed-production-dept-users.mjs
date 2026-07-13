/**
 * Create production department CMS users from a JSON template.
 *
 * 1. Copy production-dept-users.template.json → production-dept-users.json
 * 2. Edit emails, names, and roles for real CCSHAU accounts
 * 3. Run: node scripts/seed-production-dept-users.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local
 * Set INITIAL_PASSWORD env var or pass as first CLI arg for the initial password.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const templatePath = resolve(__dirname, "production-dept-users.json");
const fallbackTemplatePath = resolve(__dirname, "production-dept-users.template.json");

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
const password = process.argv[2] ?? process.env.INITIAL_PASSWORD;

if (!url || !serviceKey) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

if (!password || password.length < 8) {
  console.error("Set INITIAL_PASSWORD env var or pass password as first argument (min 8 chars).");
  process.exit(1);
}

const usersPath = existsSync(templatePath) ? templatePath : fallbackTemplatePath;
const users = JSON.parse(readFileSync(usersPath, "utf8"));

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadDepartments() {
  const { data, error } = await admin
    .from("ccshau_departments")
    .select("id, slug, name_en")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((d) => [d.slug, d]));
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

async function ensureUser(config, deptMap) {
  const department = deptMap.get(config.departmentSlug);
  if (!department) {
    throw new Error(`Unknown department slug: ${config.departmentSlug}`);
  }

  const isUniversityWide = ["super_admin", "university_admin"].includes(config.role);
  let userId;
  const existing = await findUserByEmail(config.email);

  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { display_name: config.displayName },
    });
    if (error) throw new Error(`${config.email}: ${error.message}`);
    console.log(`Updated: ${config.email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: config.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: config.displayName },
    });
    if (error || !data.user) throw new Error(`${config.email}: ${error?.message ?? "create failed"}`);
    userId = data.user.id;
    console.log(`Created: ${config.email}`);
  }

  await admin.from("ccshau_profiles").upsert({
    id: userId,
    display_name: config.displayName,
    email: config.email,
    department_id: department.id,
    is_active: true,
  });

  await admin.from("ccshau_user_roles").delete().eq("user_id", userId);
  const { error: roleError } = await admin.from("ccshau_user_roles").insert({
    user_id: userId,
    role: config.role,
    department_id: isUniversityWide ? null : department.id,
  });
  if (roleError) throw new Error(`${config.email} role: ${roleError.message}`);

  if (config.note) console.log(`  → ${config.note}`);
}

console.log(`Production dept users from ${usersPath}\n`);

const deptMap = await loadDepartments();
for (const config of users) {
  await ensureUser(config, deptMap);
}

console.log("\nDone. Share passwords securely with each department owner.");
