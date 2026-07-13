/**
 * Phase A: Section × CMS module access smoke test.
 * Run: node scripts/test-section-modules.mjs
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

const SECTIONS = [
  {
    slug: "purchase-tender",
    email: "test.dept.purchase-tender@ccshau.test",
    allowed: ["/admin/tenders"],
    denied: ["/admin/news", "/admin/circulars", "/admin/pages"],
  },
  {
    slug: "pro-media",
    email: "test.dept.pro-media@ccshau.test",
    allowed: ["/admin/news", "/admin/media"],
    denied: ["/admin/tenders", "/admin/circulars", "/admin/downloads"],
  },
  {
    slug: "admin-section",
    email: "test.dept.admin-section@ccshau.test",
    allowed: ["/admin/circulars", "/admin/news"],
    denied: ["/admin/tenders", "/admin/media", "/admin/pages"],
  },
  {
    slug: "agriculture-department",
    email: "test.dept.agriculture-department@ccshau.test",
    allowed: ["/admin/pages", "/admin/news", "/admin/downloads", "/admin/media"],
    denied: ["/admin/tenders", "/admin/circulars"],
  },
];

function createCookieClient() {
  const jar = new Map();
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  return { sb, jar };
}

async function login(email) {
  const { sb, jar } = createCookieClient();
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) return { ok: false, error: error.message, jar: null };
  return { ok: true, jar };
}

async function fetchPath(path, jar) {
  const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location") };
}

function isAllowedResult(result) {
  if (result.status === 200) return true;
  if (result.status >= 300 && result.status < 400) {
    return result.location?.includes("/admin/login");
  }
  return false;
}

function isDeniedResult(result) {
  if (result.status >= 300 && result.status < 400) {
    return result.location?.endsWith("/admin") || result.location?.includes("/admin?");
  }
  return result.status === 200 ? false : true;
}

async function main() {
  console.log(`Section module test @ ${BASE_URL}\n`);
  let passed = 0;
  let failed = 0;

  for (const section of SECTIONS) {
    const loginResult = await login(section.email);
    if (!loginResult.ok) {
      console.log(`SKIP ${section.slug}: login failed (${loginResult.error}) — run seed-test-role-users.mjs`);
      failed += section.allowed.length + section.denied.length;
      continue;
    }

    for (const path of section.allowed) {
      const result = await fetchPath(path, loginResult.jar);
      const ok = isAllowedResult(result) && result.status === 200;
      console.log(`${ok ? "PASS" : "FAIL"} [${section.slug}] ALLOW ${path} → HTTP ${result.status}`);
      if (ok) passed++;
      else failed++;
    }

    for (const path of section.denied) {
      const result = await fetchPath(path, loginResult.jar);
      const ok = isDeniedResult(result);
      console.log(`${ok ? "PASS" : "FAIL"} [${section.slug}] DENY ${path} → HTTP ${result.status} ${result.location ?? ""}`);
      if (ok) passed++;
      else failed++;
    }
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
