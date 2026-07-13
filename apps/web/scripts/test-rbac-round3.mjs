/**
 * RBAC round-3 smoke test (site structure, reports, role matrix).
 * Run: node scripts/test-rbac-round3.mjs
 */
import { createServerClient } from "@supabase/ssr";
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

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "Admin@123";

const USERS = [
  { role: "super_admin", email: "test.superadmin@ccshau.test" },
  { role: "university_admin", email: "test.universityadmin@ccshau.test" },
  { role: "dept_admin", email: "test.deptadmin@ccshau.test" },
  { role: "editor", email: "test.editor@ccshau.test" },
  { role: "reviewer", email: "test.reviewer@ccshau.test" },
  { role: "viewer", email: "test.viewer@ccshau.test" },
];

const PAGES = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/reports", label: "Reports" },
  { path: "/admin/pages", label: "Pages" },
  { path: "/admin/news", label: "News" },
  { path: "/admin/tenders", label: "Tenders" },
  { path: "/admin/banners", label: "Banners" },
  { path: "/admin/homepage", label: "Homepage" },
  { path: "/admin/menus", label: "Menus" },
  { path: "/admin/related-links", label: "Related links" },
  { path: "/admin/settings", label: "Settings" },
  { path: "/admin/redirects", label: "URL redirects" },
  { path: "/admin/audit", label: "Audit log" },
  { path: "/admin/users", label: "Users & roles" },
];

const SITE_STRUCTURE = ["/admin/banners", "/admin/homepage", "/admin/menus", "/admin/related-links"];
const SUPER_ADMIN_ONLY = ["/admin/audit", "/admin/users"];
const SETTINGS = ["/admin/settings", "/admin/redirects"];
const READ_ONLY = [
  "/admin",
  "/admin/reports",
  "/admin/pages",
  "/admin/news",
  "/admin/circulars",
  "/admin/tenders",
  "/admin/downloads",
  "/admin/feedback",
  "/admin/media",
];

function matchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function expectedAccess(role, path) {
  if (role === "super_admin") return true;

  for (const prefix of SUPER_ADMIN_ONLY) {
    if (matchesPrefix(path, prefix)) return false;
  }

  if (role === "university_admin") {
    if (path === "/admin/reports") return false;
    return true;
  }

  if (role === "dept_admin") {
    if (path === "/admin/reports") return false;
    if (SETTINGS.some((p) => matchesPrefix(path, p))) return true;
    if (SITE_STRUCTURE.some((p) => matchesPrefix(path, p))) return false;
    return true;
  }

  if (role === "editor") {
    if (SETTINGS.some((p) => matchesPrefix(path, p))) return false;
    if (SITE_STRUCTURE.some((p) => matchesPrefix(path, p))) return false;
    if (path === "/admin/reports") return false;
    return true;
  }

  if (role === "reviewer" || role === "viewer") {
    if (path === "/admin/reports") return true;
    if (SETTINGS.some((p) => matchesPrefix(path, p))) return false;
    if (SITE_STRUCTURE.some((p) => matchesPrefix(path, p))) return false;
    return READ_ONLY.some((p) => {
      if (p === "/admin/pages" || p === "/admin") return matchesPrefix(path, p);
      return path === p;
    });
  }

  return false;
}

function createCookieClient() {
  const jar = new Map();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return [...jar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });
  return { supabase, jar };
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function login(email) {
  const { supabase, jar } = createCookieClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) return { ok: false, error: error.message, jar: null };
  return { ok: true, jar };
}

async function fetchPage(path, jar) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: cookieHeader(jar) },
    redirect: "manual",
  });
  const body = res.status === 200 ? await res.text() : "";
  const location = res.headers.get("location");
  const hasError =
    body.includes("Runtime Error") ||
    body.includes("Insufficient permissions") ||
    body.includes("You do not have permission");
  const hasReportsTitle =
    body.includes("Content & activity summary") || body.includes("Read-only reports");
  const hasBannersTitle = body.includes("Banners") && body.includes("carousel");
  return { status: res.status, location, hasError, hasReportsTitle, hasBannersTitle };
}

function classify(expected, fetched, path) {
  const { status, location, hasError, hasReportsTitle, hasBannersTitle } = fetched;

  if (!expected) {
    if (hasError) return { ok: false, note: "Runtime error (should block)" };
    if (status >= 300 && status < 400) {
      if (location?.includes("/admin/login")) return { ok: false, note: "Redirected to login" };
      if (location?.endsWith("/admin") || location?.includes("/admin?")) {
        return { ok: true, note: "Redirected to dashboard" };
      }
      return { ok: true, note: `Redirect → ${location}` };
    }
    if (status === 200) return { ok: false, note: "Rendered page (should block)" };
    return { ok: false, note: `HTTP ${status}` };
  }

  if (hasError) return { ok: false, note: "Runtime error" };
  if (status === 200) {
    if (path === "/admin/reports" && !hasReportsTitle) {
      return { ok: false, note: "Reports page missing expected heading" };
    }
    if (path === "/admin/banners" && !hasBannersTitle) {
      return { ok: false, note: "Banners page missing expected content" };
    }
    return { ok: true, note: "OK (200)" };
  }
  if (status >= 300 && status < 400) {
    if (location?.includes("/admin/login")) return { ok: false, note: "Redirected to login" };
    return { ok: false, note: `Unexpected redirect → ${location}` };
  }
  return { ok: false, note: `HTTP ${status}` };
}

async function checkTenderEnum() {
  if (!SERVICE_KEY) return { ok: false, note: "No service key" };
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc("ccshau_exec_sql", { query: "select 1" }).maybeSingle();
  if (error) {
    const { error: insertError } = await admin.from("ccshau_tenders").select("status").limit(1);
    if (insertError?.message?.includes("pending_review")) {
      return { ok: false, note: insertError.message };
    }
    const probe = await admin
      .from("ccshau_tenders")
      .select("id")
      .eq("status", "pending_review")
      .limit(1);
    if (probe.error) {
      return { ok: false, note: `pending_review enum: ${probe.error.message}` };
    }
    return { ok: true, note: "pending_review status accepted in query" };
  }
  return { ok: true, note: "DB reachable" };
}

async function main() {
  console.log(`RBAC round-3 test @ ${BASE_URL}\n`);

  const health = await fetch(`${BASE_URL}/api/health`);
  console.log(`Health: HTTP ${health.status}`);

  console.log("\n--- Login checks ---");
  for (const user of USERS) {
    const result = await login(user.email);
    console.log(`${result.ok ? "PASS" : "FAIL"} login ${user.role} (${user.email})${result.error ? ` — ${result.error}` : ""}`);
  }

  console.log("\n--- Page access matrix ---");
  const results = [];
  for (const user of USERS) {
    const loginResult = await login(user.email);
    if (!loginResult.ok) continue;

    for (const page of PAGES) {
      const expected = expectedAccess(user.role, page.path);
      const fetched = await fetchPage(page.path, loginResult.jar);
      const verdict = classify(expected, fetched, page.path);
      results.push({
        role: user.role,
        page: page.label,
        path: page.path,
        expected: expected ? "ALLOW" : "DENY",
        status: verdict.ok ? "PASS" : "FAIL",
        note: verdict.note,
        http: fetched.status,
      });
    }
  }

  const fails = results.filter((r) => r.status === "FAIL");
  for (const r of results) {
    const mark = r.status === "PASS" ? "✓" : "✗";
    console.log(
      `${mark} [${r.role}] ${r.page} (${r.expected}) — ${r.note}${r.http ? ` [${r.http}]` : ""}`,
    );
  }

  console.log(`\nPage access: ${results.length - fails.length}/${results.length} passed`);
  if (fails.length) {
    console.log("\nFailures:");
    for (const f of fails) console.log(`  - [${f.role}] ${f.page}: ${f.note}`);
  }

  console.log("\n--- DB: tender pending_review ---");
  const enumCheck = await checkTenderEnum();
  console.log(`${enumCheck.ok ? "PASS" : "FAIL"} ${enumCheck.note}`);

  const loginFails = USERS.filter(async () => false);
  const totalFails = fails.length + (loginFails.length > 0 ? 1 : 0);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
