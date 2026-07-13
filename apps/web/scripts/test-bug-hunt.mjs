/**
 * Extended bug-hunt smoke tests for department scope and access control.
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

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "Admin@123";
const results = [];

function record(name, ok, note = "") {
  results.push({ name, ok, note });
  console.log(`${ok ? "PASS" : "BUG"} ${name}${note ? ` — ${note}` : ""}`);
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

async function get(jar, path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") },
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

async function main() {
  console.log(`Bug-hunt tests @ ${BASE}\n`);

  // 1. Module denied routes must redirect, not 500
  const purchase = await login("test.dept.purchase-tender@ccshau.test");
  if (purchase.ok) {
    for (const path of ["/admin/pages", "/admin/news", "/admin/media"]) {
      const res = await get(purchase.jar, path);
      const ok = res.status >= 300 && res.status < 400 && !res.body.includes("Runtime Error");
      record(`Purchase/Tender denied ${path}`, ok, `HTTP ${res.status}`);
    }
  }

  // 2. Agriculture strict pages — only own dept pages in table (no college slugs)
  const ag = await login("test.dept.agriculture-department@ccshau.test");
  if (ag.ok) {
    const pages = await get(ag.jar, "/admin/pages");
    const hasCollegeSlug = pages.body.includes("college-of-agriculture-hisar");
    const hasTable = pages.body.includes("Search by title");
    record(
      "Agriculture pages list strict scope",
      pages.status === 200 && hasTable && !hasCollegeSlug,
      hasCollegeSlug ? "college page visible in list" : `HTTP ${pages.status}`,
    );
  }

  // 3. Admin section cannot access tenders module
  const adminSection = await login("test.dept.admin-section@ccshau.test");
  if (adminSection.ok) {
    const tenders = await get(adminSection.jar, "/admin/tenders");
    record(
      "Admin section denied tenders",
      tenders.status >= 300 && tenders.status < 400,
      `HTTP ${tenders.status}`,
    );
    const circulars = await get(adminSection.jar, "/admin/circulars");
    record("Admin section allowed circulars", circulars.status === 200, `HTTP ${circulars.status}`);
  }

  // 4. University admin can access site structure
  const uni = await login("test.universityadmin@ccshau.test");
  if (uni.ok) {
    const banners = await get(uni.jar, "/admin/banners");
    record("University admin → banners", banners.status === 200, `HTTP ${banners.status}`);
    const users = await get(uni.jar, "/admin/users");
    record("University admin denied users", users.status >= 300 && users.status < 400);
  }

  // 5. Viewer cannot create routes
  const viewer = await login("test.viewer@ccshau.test");
  if (viewer.ok) {
    const newPage = await get(viewer.jar, "/admin/pages/new");
    record("Viewer denied new page", newPage.status >= 300 && newPage.status < 400);
  }

  // 6. Department modules settings super-admin only
  if (uni.ok) {
    const mod = await get(uni.jar, "/admin/settings/department-modules");
    record(
      "University admin denied dept modules UI",
      mod.status >= 300 && mod.status < 400,
      `HTTP ${mod.status}`,
    );
  }

  // 7. Runtime errors on key admin pages
  const superA = await login("test.superadmin@ccshau.test");
  if (superA.ok) {
    for (const path of ["/admin/feedback", "/admin/downloads", "/admin/circulars", "/admin/reports"]) {
      const res = await get(superA.jar, path);
      record(`No runtime error ${path}`, res.status === 200 && !res.body.includes("Runtime Error"));
    }
  }

  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed, ${fails.length} bugs`);
  if (fails.length) {
    console.log("\nBugs found:");
    for (const f of fails) console.log(`  - ${f.name}: ${f.note}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
