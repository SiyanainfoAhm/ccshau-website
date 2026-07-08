/**
 * Reset every Supabase auth user password (dev/testing).
 * Run: node scripts/reset-all-user-passwords.mjs
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

const PASSWORD = process.argv[2] ?? "Admin@123";

let page = 1;
let total = 0;

while (page <= 20) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;

  for (const user of data.users) {
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
    });
    if (updateError) {
      console.error(`Failed ${user.email}: ${updateError.message}`);
    } else {
      console.log(`Updated: ${user.email}`);
      total += 1;
    }
  }

  if (data.users.length < 200) break;
  page += 1;
}

console.log(`\nTotal updated: ${total}. Password: ${PASSWORD}`);
