/**
 * Reset and verify a test CMS login (development only).
 * Usage: node scripts/verify-test-login.mjs [email]
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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] ?? "test.editor@ccshau.test";
const password = "Admin@123";

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

const user = await findUserByEmail(email);
if (!user) {
  console.error(`No auth user found for ${email}`);
  process.exit(1);
}

const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});
if (updateError) {
  console.error("Password reset failed:", updateError.message);
  process.exit(1);
}

const { data, error: signInError } = await anon.auth.signInWithPassword({ email, password });
if (signInError || !data.user) {
  console.error("Sign-in verification failed:", signInError?.message ?? "unknown");
  process.exit(1);
}

console.log(`OK: ${email} can sign in with the test password.`);
