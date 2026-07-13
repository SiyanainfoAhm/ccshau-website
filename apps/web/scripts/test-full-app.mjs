/**
 * Full application smoke test — RBAC, modules, pages scope, feedback, settings.
 * Run: node scripts/test-full-app.mjs
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
const PASSWORD = "Admin@123";

const results = [];

function record(name, ok, note = "") {
  results.push({ name, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

async function login(email) {
  const jar = new Map();
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) return { ok: false, error: error.message };
  return { ok: true, jar };
}

async function fetchPath(jar, path) {
  const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const body = await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

async function main() {
  console.log(`Full app smoke test @ ${BASE_URL}\n`);

  // Health & public routes
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    record("API health", health.status === 200, `HTTP ${health.status}`);
  } catch (e) {
    record("API health", false, String(e));
  }

  for (const path of ["/", "/news", "/circulars", "/tenders", "/contact", "/admin/login"]) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
      record(`Public ${path}`, res.status === 200, `HTTP ${res.status}`);
    } catch (e) {
      record(`Public ${path}`, false, String(e));
    }
  }

  // Super admin critical pages
  const superLogin = await login("test.superadmin@ccshau.test");
  if (!superLogin.ok) {
    record("Super admin login", false, superLogin.error);
    process.exit(1);
  }
  record("Super admin login", true);

  for (const path of [
    "/admin",
    "/admin/users",
    "/admin/users?q=test",
    "/admin/settings",
    "/admin/settings/department-modules",
    "/admin/pages",
    "/admin/tenders",
  ]) {
    const res = await fetchPath(superLogin.jar, path);
    const ok = res.status === 200 && !res.body.includes("Runtime Error");
    record(`Super admin ${path}`, ok, `HTTP ${res.status}`);
  }

  const deptModules = await fetchPath(superLogin.jar, "/admin/settings/department-modules");
  record(
    "Department modules UI",
    deptModules.body.includes("Department module access") &&
      deptModules.body.includes("purchase-tender"),
    "",
  );

  // Section-restricted user: purchase-tender
  const tenderLogin = await login("test.dept.purchase-tender@ccshau.test");
  if (tenderLogin.ok) {
    const tenders = await fetchPath(tenderLogin.jar, "/admin/tenders");
    const news = await fetchPath(tenderLogin.jar, "/admin/news");
    const pages = await fetchPath(tenderLogin.jar, "/admin/pages");
    record("Purchase/Tender → tenders allowed", tenders.status === 200);
    record(
      "Purchase/Tender → news denied",
      news.status >= 300 && news.status < 400,
      `HTTP ${news.status}`,
    );
    record(
      "Purchase/Tender denied pages module",
      pages.status >= 300 && pages.status < 400,
      `HTTP ${pages.status}`,
    );
  } else {
    record("Purchase/Tender login", false, tenderLogin.error);
  }

  // Agriculture dept: pages allowed, tenders denied
  const agLogin = await login("test.dept.agriculture-department@ccshau.test");
  if (agLogin.ok) {
    const pages = await fetchPath(agLogin.jar, "/admin/pages");
    const tenders = await fetchPath(agLogin.jar, "/admin/tenders");
    record("Agriculture → pages allowed", pages.status === 200);
    record(
      "Agriculture → tenders denied",
      tenders.status >= 300 && tenders.status < 400,
      `HTTP ${tenders.status}`,
    );
  } else {
    record("Agriculture login", false, agLogin.error);
  }

  // Dept admin cannot access department-modules settings
  const deptAdmin = await login("test.deptadmin@ccshau.test");
  if (deptAdmin.ok) {
    const modSettings = await fetchPath(deptAdmin.jar, "/admin/settings/department-modules");
    record(
      "Dept admin denied department-modules",
      modSettings.status >= 300 && modSettings.status < 400,
      `HTTP ${modSettings.status} → ${modSettings.location ?? ""}`,
    );
  }

  // Non-super denied users page
  if (deptAdmin.ok) {
    const users = await fetchPath(deptAdmin.jar, "/admin/users");
    record(
      "Dept admin denied /admin/users",
      users.status >= 300 && users.status < 400,
      `HTTP ${users.status}`,
    );
  }

  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  if (fails.length) {
    console.log("\nFailures:");
    for (const f of fails) console.log(`  - ${f.name}: ${f.note}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
