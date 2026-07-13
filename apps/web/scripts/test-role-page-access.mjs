/**
 * Role × page access smoke test against local dev server.
 * Run: node scripts/test-role-page-access.mjs
 */
import { createServerClient } from "@supabase/ssr";
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
const PASSWORD = "Admin@123";

const USERS = [
  { role: "super_admin", email: "test.superadmin@ccshau.test" },
  { role: "dept_admin", email: "test.deptadmin@ccshau.test" },
  { role: "editor", email: "test.editor@ccshau.test" },
  { role: "viewer", email: "test.viewer@ccshau.test" },
  { role: "college_admin", email: "test.collegeadmin@ccshau.test" },
  { role: "college_editor", email: "test.collegeeditor@ccshau.test" },
  { role: "college_viewer", email: "test.collegeviewer@ccshau.test" },
];

const PAGES = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/pages", label: "Pages" },
  { path: "/admin/news", label: "News" },
  { path: "/admin/circulars", label: "Circulars" },
  { path: "/admin/tenders", label: "Tenders" },
  { path: "/admin/downloads", label: "Downloads" },
  { path: "/admin/feedback", label: "Feedback" },
  { path: "/admin/menus", label: "Menus" },
  { path: "/admin/related-links", label: "Related links" },
  { path: "/admin/redirects", label: "URL redirects" },
  { path: "/admin/media", label: "Media" },
  { path: "/admin/banners", label: "Banners" },
  { path: "/admin/homepage", label: "Homepage" },
  { path: "/admin/audit", label: "Audit log" },
  { path: "/admin/settings", label: "Settings" },
  { path: "/admin/register", label: "Microsite setup" },
  { path: "/admin/pg-seminar-registrations", label: "PG registrations" },
  { path: "/admin/users", label: "Users & roles" },
];

function matchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

const SITE_STRUCTURE = [
  "/admin/banners",
  "/admin/homepage",
  "/admin/menus",
  "/admin/related-links",
];

const SUPER_ADMIN_ONLY = [
  "/admin/audit",
  "/admin/users",
  "/admin/pg-seminar-registrations",
  "/admin/register",
];

const SETTINGS = ["/admin/settings", "/admin/redirects"];

const PATH_CMS_MODULE = {
  "/admin/pages": "pages",
  "/admin/news": "news",
  "/admin/circulars": "circulars",
  "/admin/tenders": "tenders",
  "/admin/downloads": "downloads",
  "/admin/media": "media",
  "/admin/feedback": "feedback",
};

/** Allowed CMS modules per test account (matches seeded department_modules). */
const USER_CMS_MODULES = {
  "test.deptadmin@ccshau.test": ["pages", "news", "circulars", "feedback"],
  "test.editor@ccshau.test": ["pages", "news", "downloads", "feedback"],
  "test.viewer@ccshau.test": ["pages", "news", "downloads", "feedback"],
};

function expectedAccess(role, path, email) {
  const collegeOnly = ["college_admin", "college_editor", "college_viewer"].includes(role);

  if (collegeOnly) {
    if (path === "/admin" || path.startsWith("/admin/register") || path.startsWith("/admin/pages")) {
      return true;
    }
    return false;
  }

  if (role === "super_admin") return true;

  for (const prefix of SUPER_ADMIN_ONLY) {
    if (matchesPrefix(path, prefix)) return false;
  }

  if (SETTINGS.some((p) => matchesPrefix(path, p))) {
    return role === "dept_admin";
  }

  if (role === "viewer") {
    const viewerPaths = [
      "/admin/pages",
      "/admin/news",
      "/admin/circulars",
      "/admin/tenders",
      "/admin/downloads",
      "/admin/feedback",
      "/admin/media",
    ];
    if (path === "/admin") return true;
    if (path === "/admin/reports") return true;
    if (SITE_STRUCTURE.some((p) => matchesPrefix(path, p))) return false;
    if (!hasModuleAccess(email, path)) return false;
    return viewerPaths.some((p) => path === p || path.startsWith(`${p}/`));
  }

  if (role === "dept_admin") {
    if (path === "/admin/reports") return false;
    if (SITE_STRUCTURE.some((p) => matchesPrefix(path, p))) return false;
    if (!hasModuleAccess(email, path)) return false;
    return true;
  }

  if (role === "editor") {
    if (path === "/admin/reports") return false;
    if (SETTINGS.some((p) => matchesPrefix(path, p))) return false;
    if (SITE_STRUCTURE.some((p) => matchesPrefix(path, p))) return false;
    if (!hasModuleAccess(email, path)) return false;
    return true;
  }

  return false;
}

function hasModuleAccess(email, path) {
  const allowed = USER_CMS_MODULES[email];
  if (!allowed) return true;
  const cmsModule = PATH_CMS_MODULE[path];
  if (!cmsModule) return true;
  return allowed.includes(cmsModule);
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

  let body = "";
  if (res.status === 200) {
    body = await res.text();
  }

  const location = res.headers.get("location");
  const runtimeError =
    body.includes("Runtime Error") ||
    body.includes("Insufficient permissions") ||
    body.includes("You do not have permission");

  let pagesCount = null;
  if (path === "/admin/pages" && body) {
    const m = body.match(/(\d+)\s+of\s+(\d+)\s+pages/);
    if (m) pagesCount = Number(m[2]);
    else if (body.includes("No pages yet")) pagesCount = 0;
  }

  return { status: res.status, location, runtimeError, pagesCount, bodySnippet: body.slice(0, 500) };
}

function classifyResult(expected, fetchResult) {
  const { status, location, runtimeError, pagesCount } = fetchResult;

  if (!expected) {
    if (runtimeError) return { ok: false, note: "Runtime error (should be blocked)" };
    if (status >= 300 && status < 400) {
      const dest = location ?? "";
      if (dest.includes("/admin/login")) return { ok: false, note: "Redirected to login" };
      if (dest.endsWith("/admin") || dest.includes("/admin?")) {
        return { ok: true, note: "Redirected to dashboard" };
      }
      return { ok: true, note: `Redirect ${location}` };
    }
    if (status === 200) return { ok: false, note: "Page rendered (should redirect)" };
    return { ok: false, note: `Unexpected status ${status}` };
  }

  if (runtimeError) return { ok: false, note: "Runtime error" };
  if (status === 200) {
    if (pagesCount === 0) return { ok: false, note: "Pages list empty" };
    if (pagesCount != null) return { ok: true, note: `${pagesCount} pages listed` };
    return { ok: true, note: "OK (200)" };
  }
  if (status >= 300 && status < 400) {
    if (location?.includes("/admin/login")) return { ok: false, note: "Redirected to login" };
    if (location === "/admin" || location?.endsWith("/admin")) {
      return { ok: false, note: "Redirected away (unexpected for allowed page)" };
    }
  }
  return { ok: false, note: `Status ${status}${location ? ` → ${location}` : ""}` };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  console.log(`Testing ${BASE_URL}\n`);
  const results = [];

  for (const user of USERS) {
    const loginResult = await login(user.email);
    if (!loginResult.ok) {
      for (const page of PAGES) {
        results.push({
          role: user.role,
          user: user.email,
          page: page.label,
          path: page.path,
          expected: expectedAccess(user.role, page.path, user.email) ? "ALLOW" : "DENY",
          status: "FAIL",
          note: `Login failed: ${loginResult.error}`,
        });
      }
      continue;
    }

    for (const page of PAGES) {
      const expected = expectedAccess(user.role, page.path, user.email);
      const fetched = await fetchPage(page.path, loginResult.jar);
      const verdict = classifyResult(expected, fetched);
      results.push({
        role: user.role,
        user: user.email,
        page: page.label,
        path: page.path,
        expected: expected ? "ALLOW" : "DENY",
        status: verdict.ok ? "PASS" : "FAIL",
        note: verdict.note,
        http: fetched.status,
      });
    }

    const { supabase } = createCookieClient();
    await supabase.auth.signOut();
  }

  const fails = results.filter((r) => r.status === "FAIL");
  console.log("ROLE | USER | PAGE | EXPECTED | RESULT | NOTE");
  console.log("-".repeat(100));
  for (const r of results) {
    console.log(
      `${r.role} | ${r.user} | ${r.page} | ${r.expected} | ${r.status} | ${r.note}${r.http ? ` (HTTP ${r.http})` : ""}`,
    );
  }

  console.log(`\nSummary: ${results.length - fails.length}/${results.length} passed, ${fails.length} failed`);
  if (fails.length) {
    console.log("\nFailures:");
    for (const f of fails) {
      console.log(`  - [${f.role}] ${f.page}: ${f.note}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
