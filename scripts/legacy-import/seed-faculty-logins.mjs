/**
 * Create Auth logins for every active faculty/HOD person with an email.
 * Password is set to Admin@123. Existing CMS admin accounts are linked only
 * (password is not changed).
 *
 *   node seed-faculty-logins.mjs
 *   node seed-faculty-logins.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const PASSWORD = "Admin@123";

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
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listAllAuthUsers(sb) {
  const byEmail = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    for (const user of users) {
      const email = String(user.email ?? "")
        .trim()
        .toLowerCase();
      if (email) byEmail.set(email, user.id);
    }
    if (users.length < 1000) break;
    page += 1;
  }
  return byEmail;
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: people, error: peopleErr } = await sb
    .from("ccshau_faculty_people")
    .select("id, name_en, email, user_id")
    .eq("is_active", true)
    .not("email", "is", null)
    .order("name_en");
  if (peopleErr) throw new Error(peopleErr.message);

  const rows = (people ?? [])
    .map((row) => ({
      id: row.id,
      nameEn: row.name_en,
      email: String(row.email ?? "")
        .trim()
        .toLowerCase(),
      userId: row.user_id,
    }))
    .filter((row) => row.email.includes("@"));

  const [{ data: roles }, { data: colleges }, { data: hods }, { data: profiles }] = await Promise.all([
    sb.from("ccshau_user_roles").select("user_id"),
    sb.from("ccshau_user_colleges").select("user_id"),
    sb.from("ccshau_user_department_pages").select("user_id"),
    sb.from("ccshau_profiles").select("id, email"),
  ]);

  const privileged = new Set(
    [...(roles ?? []), ...(colleges ?? []), ...(hods ?? [])].map((row) => row.user_id).filter(Boolean),
  );
  const profileByEmail = new Map(
    (profiles ?? [])
      .map((row) => [
        String(row.email ?? "")
          .trim()
          .toLowerCase(),
        row.id,
      ])
      .filter(([email]) => email),
  );

  const authByEmail = await listAllAuthUsers(sb);

  const summary = {
    total: rows.length,
    created: 0,
    passwordSet: 0,
    linkedOnly: 0,
    skippedPrivileged: 0,
    alreadyLinked: 0,
    errors: [],
  };

  console.log(
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        peopleWithEmail: rows.length,
        existingAuthUsers: authByEmail.size,
      },
      null,
      2,
    ),
  );

  if (!CONFIRM) {
    console.log("Pass --confirm to create logins and set password Admin@123.");
    return;
  }

  for (let i = 0; i < rows.length; i += 1) {
    const person = rows[i];
    try {
      let userId = person.userId || profileByEmail.get(person.email) || authByEmail.get(person.email) || null;

      if (!userId) {
        const { data, error } = await sb.auth.admin.createUser({
          email: person.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: person.nameEn },
        });
        if (error || !data?.user) throw new Error(error?.message ?? "createUser failed");
        userId = data.user.id;
        authByEmail.set(person.email, userId);
        summary.created += 1;
        summary.passwordSet += 1;

        const { error: profileError } = await sb.from("ccshau_profiles").insert({
          id: userId,
          display_name: person.nameEn,
          email: person.email,
          is_active: true,
        });
        if (profileError && !String(profileError.message).toLowerCase().includes("duplicate")) {
          throw new Error(profileError.message);
        }
        profileByEmail.set(person.email, userId);
      } else if (privileged.has(userId)) {
        summary.skippedPrivileged += 1;
      } else {
        const { error } = await sb.auth.admin.updateUserById(userId, { password: PASSWORD });
        if (error) throw new Error(error.message);
        summary.passwordSet += 1;
        if (!profileByEmail.has(person.email)) {
          await sb.from("ccshau_profiles").insert({
            id: userId,
            display_name: person.nameEn,
            email: person.email,
            is_active: true,
          });
          profileByEmail.set(person.email, userId);
        }
      }

      if (person.userId === userId) {
        summary.alreadyLinked += 1;
      } else {
        const { error } = await sb.from("ccshau_faculty_people").update({ user_id: userId }).eq("id", person.id);
        if (error) throw new Error(error.message);
        summary.linkedOnly += person.userId ? 0 : 1;
      }
    } catch (error) {
      summary.errors.push({
        personId: person.id,
        email: person.email,
        name: person.nameEn,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if ((i + 1) % 25 === 0) {
      console.log(`Progress ${i + 1}/${rows.length} created=${summary.created} errors=${summary.errors.length}`);
    }
    await sleep(80);
  }

  const reportDir = join(__dirname, "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "seed-faculty-logins.json");
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, errors: summary.errors.slice(0, 20), reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
