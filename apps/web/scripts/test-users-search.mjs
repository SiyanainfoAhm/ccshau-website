/**
 * Users page search smoke test.
 * Run: node scripts/test-users-search.mjs
 */
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function login(email) {
  const jar = new Map();
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: "Admin@123" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, jar };
}

async function fetchUsers(jar, q) {
  const url = q
    ? `${BASE_URL}/admin/users?q=${encodeURIComponent(q)}`
    : `${BASE_URL}/admin/users`;
  const res = await fetch(url, {
    headers: { Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") },
    redirect: "manual",
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  console.log(`Users search test @ ${BASE_URL}\n`);
  let passed = 0;
  let failed = 0;

  const loginResult = await login("test.superadmin@ccshau.test");
  if (!loginResult.ok) {
    console.log(`FAIL login — ${loginResult.error}`);
    process.exit(1);
  }

  const checks = [
    {
      label: "Users page loads",
      run: async () => {
        const res = await fetchUsers(loginResult.jar);
        return res.status === 200;
      },
    },
    {
      label: "Search UI present",
      run: async () => {
        const res = await fetchUsers(loginResult.jar);
        return res.body.includes("Search by name, email, or department");
      },
    },
    {
      label: "Search q=purchase returns results or valid empty",
      run: async () => {
        const res = await fetchUsers(loginResult.jar, "purchase");
        return (
          res.status === 200 &&
          (res.body.toLowerCase().includes("purchase") || res.body.includes("No users match your search"))
        );
      },
    },
    {
      label: "Search no-match message",
      run: async () => {
        const res = await fetchUsers(loginResult.jar, "zzznomatchxyz123");
        return res.status === 200 && res.body.includes("No users match your search");
      },
    },
    {
      label: "Non-super-admin denied",
      run: async () => {
        const deptLogin = await login("test.deptadmin@ccshau.test");
        if (!deptLogin.ok) return false;
        const res = await fetch(`${BASE_URL}/admin/users`, {
          headers: { Cookie: [...deptLogin.jar].map(([n, v]) => `${n}=${v}`).join("; ") },
          redirect: "manual",
        });
        return res.status >= 300 && res.status < 400;
      },
    },
  ];

  for (const check of checks) {
    const ok = await check.run();
    console.log(`${ok ? "PASS" : "FAIL"} ${check.label}`);
    if (ok) passed++;
    else failed++;
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
