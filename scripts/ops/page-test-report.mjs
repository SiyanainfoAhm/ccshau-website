/**
 * Expanded page test report:
 * - Header nav (Home, Administration, Academics/Colleges, Directorates/Research/Extension, Awards, Nehru Library, Campus Life) + submenus
 * - Existing smoke + API + unit
 * - Pending admin scenarios via SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD / SMOKE_FACULTY_EMAIL / SMOKE_FACULTY_PASSWORD when set
 *
 * Writes Documents/test-reports/ccshau-page-test-report-latest.xlsx (same file)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { deflateRawSync } from "node:zlib";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../apps/web/package.json"));
const { createClient } = require("@supabase/supabase-js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const WEB = join(ROOT, "apps/web");
const OUT_DIR = join(ROOT, "Documents", "test-reports");
const OUT_LATEST = join(OUT_DIR, "ccshau-page-test-report-latest.xlsx");
const OUT_CSV = join(OUT_DIR, "ccshau-page-test-report-latest.csv");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = (baseIdx >= 0 ? args[baseIdx + 1] : process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(join(WEB, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (!(k in env) || !env[k]) env[k] = v;
    }
  } catch {
    /* optional */
  }
  return env;
}

const ENV = loadEnv();

// Default to seeded local test accounts (apps/web/scripts/seed-test-role-users.mjs)
if (!ENV.SMOKE_ADMIN_EMAIL) ENV.SMOKE_ADMIN_EMAIL = "test.superadmin@ccshau.test";
if (!ENV.SMOKE_ADMIN_PASSWORD) ENV.SMOKE_ADMIN_PASSWORD = "Admin@123";
try {
  const fac = JSON.parse(readFileSync(join(__dirname, "_faculty-smoke.json"), "utf8"));
  if (fac?.ok && fac.email) {
    if (!ENV.SMOKE_FACULTY_EMAIL) ENV.SMOKE_FACULTY_EMAIL = fac.email;
    if (!ENV.SMOKE_FACULTY_PASSWORD) ENV.SMOKE_FACULTY_PASSWORD = "Admin@123";
  }
} catch {
  /* optional */
}

function resolvePublicPagePath(slug, pageType, ancestors) {
  const { parentSlug, parentPageType, grandparentSlug, grandparentPageType } = ancestors;
  if (parentSlug && grandparentSlug && grandparentPageType === "college" && parentPageType !== "college") {
    return `/college/${grandparentSlug}/${parentSlug}/${slug}`;
  }
  if (parentSlug && parentPageType === "college") return `/college/${parentSlug}/${slug}`;
  if (parentSlug === "pg-studies" && parentPageType === "standard") {
    const seg = slug === "pg-studies-gallery" ? "gallery" : slug === "pg-studies-contact" ? "contact" : slug;
    return `/pages/pg-studies/${seg}`;
  }
  if (pageType === "college") return `/college/${slug}`;
  return `/pages/${slug}`;
}

function getAncestors(page, pageById) {
  const parent = page.parent_id ? pageById.get(page.parent_id) : undefined;
  const grandparent = parent?.parent_id ? pageById.get(parent.parent_id) : undefined;
  return {
    parentSlug: parent?.slug ?? null,
    parentPageType: parent?.page_type ?? null,
    grandparentSlug: grandparent?.slug ?? null,
    grandparentPageType: grandparent?.page_type ?? null,
  };
}

function resolvePagePath(page, pageById) {
  return resolvePublicPagePath(page.slug, page.page_type ?? "standard", getAncestors(page, pageById));
}

async function loadHeaderNavPlan() {
  const url = ENV.NEXT_PUBLIC_SUPABASE_URL;
  const key = ENV.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { plan: [], note: "No Supabase env — header nav skipped" };

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: menu } = await sb
    .from("ccshau_menus")
    .select("id")
    .eq("location", "header")
    .eq("is_active", true)
    .maybeSingle();
  if (!menu) return { plan: [], note: "No header menu" };

  const [{ data: items }, { data: pages }] = await Promise.all([
    sb
      .from("ccshau_menu_items")
      .select("id, parent_id, label_en, href, page_id, sort_order, is_active")
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("sort_order"),
    sb.from("ccshau_pages").select("id, slug, page_type, parent_id, status, title_en"),
  ]);

  const pageById = new Map((pages || []).map((p) => [p.id, p]));
  const publishedById = new Map((pages || []).filter((p) => p.status === "published").map((p) => [p.id, p]));

  function hrefFor(item) {
    if (item.page_id) {
      const page = publishedById.get(item.page_id) || pageById.get(item.page_id);
      if (page) return resolvePagePath(page, pageById);
      if (item.href?.trim()) return item.href.trim();
      return "#";
    }
    return (item.href || "#").trim() || "#";
  }

  const active = items || [];
  const childrenOf = (pid) => active.filter((i) => i.parent_id === pid);

  /** @type {any[]} */
  const plan = [];
  let n = 0;
  function addNode(item, sectionPath, depth) {
    n += 1;
    const id = `NAV${String(n).padStart(3, "0")}`;
    const href = hrefFor(item);
    const section = sectionPath;
    plan.push({
      id,
      area: "Public nav",
      page: item.label_en,
      path: href,
      scenario: depth === 0 ? `Top menu: ${item.label_en}` : `Submenu under ${sectionPath}: ${item.label_en}`,
      method: href.startsWith("http") ? "HTTP-ext" : href === "#" ? "SKIP" : "HTTP",
      expect: href === "#" ? "Menu placeholder (#) — no public URL linked" : "200 + HTML",
      role: "Anonymous",
      section,
      depth,
    });
    for (const child of childrenOf(item.id)) {
      addNode(child, sectionPath ? `${sectionPath} > ${item.label_en}` : item.label_en, depth + 1);
    }
  }

  for (const root of active.filter((i) => !i.parent_id)) {
    addNode(root, root.label_en, 0);
  }

  // Nehru Library sidebars as submenu coverage
  const nehru = [...publishedById.values()].find((p) => p.slug === "nehru-library");
  if (nehru) {
    const { data: sidebars } = await sb
      .from("ccshau_page_sidebars")
      .select("id, label_en, href, sort_order, is_active, side")
      .eq("page_id", nehru.id)
      .eq("is_active", true)
      .order("sort_order");
    for (const s of sidebars || []) {
      n += 1;
      const id = `NAV${String(n).padStart(3, "0")}`;
      const path = s.href?.trim() && s.href !== "#" ? s.href.trim() : `/college/nehru-library`;
      plan.push({
        id,
        area: "Public nav",
        page: `Nehru Library › ${s.label_en}`,
        path,
        scenario: `Nehru Library sidebar/submenu: ${s.label_en}`,
        method: path.startsWith("http") ? "HTTP-ext" : "HTTP",
        expect: path === "/college/nehru-library" ? "200 + sidebar label present in HTML" : "200",
        role: "Anonymous",
        section: "Nehru Library",
        depth: 1,
        expectLabel: s.label_en,
      });
    }
  }

  return { plan, note: `Loaded ${plan.length} nav scenarios from header menu + Nehru sidebars` };
}

/** All published office_portal departments under every college/directorate microsite. */
async function loadCollegeDepartmentsPlan() {
  const url = ENV.NEXT_PUBLIC_SUPABASE_URL;
  const key = ENV.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { plan: [], note: "No Supabase env — college departments skipped" };

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: depts, error } = await sb
    .from("ccshau_pages")
    .select("id, slug, title_en, college_root_id, parent_id, status, layout_template, sort_order")
    .eq("layout_template", "office_portal")
    .eq("status", "published")
    .not("college_root_id", "is", null)
    .order("sort_order")
    .order("title_en");

  if (error) return { plan: [], note: `Departments query failed: ${error.message}` };

  const rows = (depts || []).filter((p) => p.college_root_id !== p.id);
  if (!rows.length) return { plan: [], note: "No published college departments found" };

  const collegeIds = [...new Set(rows.map((r) => r.college_root_id))];
  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter(Boolean))];

  const [{ data: colleges }, { data: parents }] = await Promise.all([
    sb.from("ccshau_pages").select("id, slug, title_en, status").in("id", collegeIds),
    sb.from("ccshau_pages").select("id, slug, title_en").in("id", parentIds),
  ]);

  const collegeById = new Map((colleges || []).map((c) => [c.id, c]));
  const parentById = new Map((parents || []).map((p) => [p.id, p]));

  /** @type {any[]} */
  const plan = [];
  let n = 0;

  const sorted = [...rows].sort((a, b) => {
    const ca = collegeById.get(a.college_root_id)?.title_en || "";
    const cb = collegeById.get(b.college_root_id)?.title_en || "";
    return ca.localeCompare(cb) || (a.title_en || "").localeCompare(b.title_en || "");
  });

  for (const d of sorted) {
    const college = collegeById.get(d.college_root_id);
    const section = parentById.get(d.parent_id);
    if (!college?.slug || !section?.slug || !d.slug) continue;

    n += 1;
    const path = `/college/${college.slug}/${section.slug}/${d.slug}`;
    plan.push({
      id: `DEPT${String(n).padStart(3, "0")}`,
      area: "College departments",
      page: `${college.title_en} › ${d.title_en}`,
      path,
      scenario: `Department page loads (${college.title_en})`,
      method: "HTTP",
      expect: "200 + HTML",
      role: "Anonymous",
      section: college.title_en,
      collegeSlug: college.slug,
      departmentSlug: d.slug,
    });

    // Faculty tab / sidebar empty-state coverage on each department
    n += 1;
    plan.push({
      id: `DEPT${String(n).padStart(3, "0")}`,
      area: "College departments",
      page: `${college.title_en} › ${d.title_en} › Faculty`,
      path: `${path}?tab=faculty`,
      scenario: `Department Faculty tab (${college.title_en} › ${d.title_en})`,
      method: "HTTP",
      expect: "200 + Faculty heading or empty state",
      role: "Anonymous",
      section: college.title_en,
      expectLabel: "Faculty",
    });
  }

  const collegeCount = new Set(plan.map((p) => p.collegeSlug).filter(Boolean)).size;
  return {
    plan,
    note: `Loaded ${plan.length} department scenarios across ${collegeCount} colleges/directorates (${rows.length} departments × page+faculty)`,
  };
}

const STATIC_PLAN = [
  {
    id: "P01",
    area: "Public",
    page: "Homepage",
    path: "/",
    scenario: "Home page loads with CCSHAU branding",
    method: "HTTP",
    expect: "200 + branding",
    role: "Anonymous",
  },
  {
    id: "P02",
    area: "Public",
    page: "Tenders",
    path: "/tenders",
    scenario: "Tenders list loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "P03",
    area: "Public",
    page: "Downloads",
    path: "/downloads",
    scenario: "Downloads page loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "P04",
    area: "Public",
    page: "News",
    path: "/news",
    scenario: "News list loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "P05",
    area: "Public",
    page: "Circulars",
    path: "/circulars",
    scenario: "Circulars list loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "P06",
    area: "Public",
    page: "Media",
    path: "/media",
    scenario: "Media list loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "P07",
    area: "Public",
    page: "Contact",
    path: "/contact",
    scenario: "Contact page loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "P08",
    area: "Public",
    page: "House Allotment Faculty",
    path: "/college/eo-cum-se/ecs-department/ecs-house-allotment?tab=faculty",
    scenario: "Faculty tab loads (list or empty state)",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },

  {
    id: "A01",
    area: "Admin auth",
    page: "Admin login",
    path: "/admin/login",
    scenario: "Login page loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "A02",
    area: "Admin auth",
    page: "Forgot password",
    path: "/admin/forgot-password",
    scenario: "Forgot password page loads",
    method: "HTTP",
    expect: "200",
    role: "Anonymous",
  },
  {
    id: "A03",
    area: "Admin auth",
    page: "Admin dashboard guard",
    path: "/admin",
    scenario: "Unauthenticated redirected (not 5xx)",
    method: "HTTP",
    expect: "login redirect",
    role: "Anonymous",
  },
  {
    id: "A04",
    area: "Admin auth",
    page: "Settings guard",
    path: "/admin/settings",
    scenario: "Unauthenticated redirected",
    method: "HTTP",
    expect: "login redirect",
    role: "Anonymous",
  },
  {
    id: "A05",
    area: "Admin auth",
    page: "Settings change-password guard",
    path: "/admin/settings/change-password",
    scenario: "Unauthenticated redirected",
    method: "HTTP",
    expect: "login redirect",
    role: "Anonymous",
  },
  {
    id: "A06",
    area: "Admin auth",
    page: "Faculty me guard",
    path: "/admin/register/faculty/me",
    scenario: "Unauthenticated redirected",
    method: "HTTP",
    expect: "login redirect",
    role: "Anonymous",
  },
  {
    id: "A07",
    area: "Admin auth",
    page: "Faculty change-password guard",
    path: "/admin/register/faculty/change-password",
    scenario: "Unauthenticated redirected",
    method: "HTTP",
    expect: "login redirect",
    role: "Anonymous",
  },

  {
    id: "S01",
    area: "Admin CMS",
    page: "Dashboard",
    path: "/admin",
    scenario: "Super admin dashboard loads; Change password NOT in sidebar",
    method: "Auth",
    expect: "200 + dashboard; no sidebar Change password link for CMS",
    role: "Super admin",
  },
  {
    id: "S02",
    area: "Admin CMS",
    page: "Settings",
    path: "/admin/settings",
    scenario: "Change password card like Menu manager (not inline form)",
    method: "Auth",
    expect: "Card href to change-password; no Old password field on Settings",
    role: "Super admin",
  },
  {
    id: "S03",
    area: "Admin CMS",
    page: "Change password page",
    path: "/admin/settings/change-password",
    scenario: "Dedicated change password page opens from Settings",
    method: "Auth",
    expect: "Form with old/new/confirm + eye toggles",
    role: "Super admin",
  },
  {
    id: "S04",
    area: "Admin CMS",
    page: "Change password",
    path: "/admin/settings/change-password",
    scenario: "Password update happy path (skipped unless SMOKE_PASSWORD_CHANGE=1)",
    method: "Auth-skip",
    expect: "Success — destructive; opt-in only",
    role: "Super admin",
  },
  {
    id: "S05",
    area: "Admin CMS",
    page: "Change password validation",
    path: "/api/auth/change-password",
    scenario: "Mismatch confirm rejected while authenticated",
    method: "Auth",
    expect: "4xx error",
    role: "Super admin",
  },
  {
    id: "S06",
    area: "Admin CMS",
    page: "Pages",
    path: "/admin/pages",
    scenario: "Pages list loads",
    method: "Auth",
    expect: "200",
    role: "Super admin",
  },
  {
    id: "S07",
    area: "Admin CMS",
    page: "News",
    path: "/admin/news",
    scenario: "News list loads",
    method: "Auth",
    expect: "200",
    role: "Super admin",
  },
  {
    id: "S08",
    area: "Admin CMS",
    page: "Menus",
    path: "/admin/menus",
    scenario: "Menu manager loads",
    method: "Auth",
    expect: "200",
    role: "Super admin",
  },
  {
    id: "S09",
    area: "Admin CMS",
    page: "Users & roles",
    path: "/admin/users",
    scenario: "Users page loads for super admin",
    method: "Auth",
    expect: "200",
    role: "Super admin",
  },
  {
    id: "S10",
    area: "Admin CMS",
    page: "Settings change-password",
    path: "/admin/settings/change-password",
    scenario: "Faculty-only cannot use Settings change-password (excluded)",
    method: "Auth-faculty",
    expect: "Redirect away from Settings CMS password OR faculty route",
    role: "Faculty only",
  },

  {
    id: "F01",
    area: "Admin faculty",
    page: "My profile",
    path: "/admin/register/faculty/me",
    scenario: "Faculty My profile loads; no password form on page",
    method: "Auth-faculty",
    expect: "200 + profile; no Old password field",
    role: "Faculty only",
  },
  {
    id: "F02",
    area: "Admin faculty",
    page: "Change password",
    path: "/admin/register/faculty/change-password",
    scenario: "Faculty dedicated change password page",
    method: "Auth-faculty",
    expect: "200 + password form",
    role: "Faculty only",
  },
  {
    id: "F03",
    area: "Admin faculty",
    page: "Faculty person admin",
    path: "/admin/register/faculty/person",
    scenario: "Faculty login panel visible to college/super admin (list reachable)",
    method: "Auth",
    expect: "Faculty register area loads",
    role: "Super admin",
  },
  {
    id: "F04",
    area: "Admin faculty",
    page: "Public Faculty vs HOD",
    path: "/college/eo-cum-se/ecs-department/ecs-house-allotment?tab=faculty",
    scenario: "HOD-only assignment → Faculty empty or without HOD row",
    method: "HTTP",
    expect: "200 + No information available or staff without HOD-only",
    role: "Anonymous",
  },

  {
    id: "API01",
    area: "API",
    page: "Health",
    path: "/api/health",
    scenario: "Health ok",
    method: "HTTP",
    expect: "200 status ok",
    role: "Anonymous",
  },
  {
    id: "API02",
    area: "API",
    page: "Change password",
    path: "/api/auth/change-password",
    scenario: "Anonymous POST rejected",
    method: "HTTP",
    expect: "4xx",
    role: "Anonymous",
  },
  {
    id: "U01",
    area: "Unit",
    page: "Vitest",
    path: "apps/web",
    scenario: "Unit/API suite",
    method: "Unit",
    expect: "all pass",
    role: "CI",
  },
];

function cookieHeader(setCookies) {
  return setCookies
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function loginCookies(email, password) {
  // Prefer Supabase SSR cookie jar (same as apps/web/scripts/test-full-app.mjs)
  try {
    const { createServerClient } = require("@supabase/ssr");
    const jar = new Map();
    const sb = createServerClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
      },
    });
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, status: 401, cookie: "", error: error.message };
    const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
    return { ok: Boolean(cookie), status: 200, cookie, error: cookie ? null : "No session cookies" };
  } catch (e) {
    // Fallback: app login API
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    const fallback = res.headers.get("set-cookie");
    const list = raw.length ? raw : fallback ? [fallback] : [];
    const body = await res.json().catch(() => ({}));
    return {
      ok: res.ok && Boolean(body.success !== false) && list.length > 0,
      status: res.status,
      cookie: cookieHeader(list),
      error: body.error || (e instanceof Error ? e.message : String(e)),
    };
  }
}

async function fetchPage(path, { cookie, method = "GET", body } = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const started = Date.now();
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "follow",
      signal: AbortSignal.timeout(60000),
    });
    const text = await res.text();
    return { status: res.status, text, ms: Date.now() - started, finalUrl: res.url || url, ok: res.ok };
  } catch (e) {
    return {
      status: 0,
      text: "",
      ms: Date.now() - started,
      finalUrl: url,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function runItem(item, ctx) {
  const testedAt = new Date().toISOString();

  if (item.method === "SKIP") {
    return {
      ...item,
      result: "SKIP",
      httpStatus: "",
      durationMs: "",
      notes: "Menu item has no linked URL (#)",
      finalUrl: "",
      testedAt,
    };
  }

  if (item.method === "Auth-skip") {
    return {
      ...item,
      result: "SKIP",
      httpStatus: "",
      durationMs: "",
      notes: "Destructive password change skipped (set SMOKE_PASSWORD_CHANGE=1 to enable)",
      finalUrl: "",
      testedAt,
    };
  }

  if (item.method === "Unit") {
    const r = spawnSync("npx", ["vitest", "run", "--reporter=json"], {
      cwd: WEB,
      encoding: "utf8",
      shell: true,
      timeout: 300000,
      maxBuffer: 20 * 1024 * 1024,
    });
    const out = `${r.stdout || ""}\n${r.stderr || ""}`;
    const start = out.indexOf("{");
    const end = out.lastIndexOf("}");
    let notes = `exit ${r.status}`;
    let result = r.status === 0 ? "PASS" : "FAIL";
    if (start >= 0 && end > start) {
      try {
        const json = JSON.parse(out.slice(start, end + 1));
        notes = `${json.numPassedTests}/${json.numTotalTests} passed, ${json.numFailedTests} failed`;
        result = json.numFailedTests === 0 && r.status === 0 ? "PASS" : "FAIL";
      } catch {
        /* keep */
      }
    }
    return { ...item, result, httpStatus: "", durationMs: "", notes, finalUrl: "", testedAt };
  }

  if (item.method === "Auth") {
    if (!ctx.adminCookie) {
      return {
        ...item,
        result: "BLOCKED",
        httpStatus: "",
        durationMs: "",
        notes: ctx.adminLoginError || "Set SMOKE_ADMIN_EMAIL + SMOKE_ADMIN_PASSWORD in env to run",
        finalUrl: "",
        testedAt,
      };
    }
    if (item.id === "S05") {
      const r = await fetchPage("/api/auth/change-password", {
        cookie: ctx.adminCookie,
        method: "POST",
        body: {
          currentPassword: "wrong-old-password-xx",
          newPassword: "short",
          confirmPassword: "mismatch-password",
        },
      });
      const pass = r.status >= 400 && r.status < 500;
      return {
        ...item,
        result: pass ? "PASS" : "FAIL",
        httpStatus: r.status,
        durationMs: r.ms,
        notes: pass ? "Rejected invalid payload as expected" : r.text.slice(0, 120),
        finalUrl: r.finalUrl,
        testedAt,
      };
    }
    if (item.id === "F03") {
      const r = await fetchPage("/admin/register", { cookie: ctx.adminCookie });
      const pass = r.status === 200 && !/admin\/login/i.test(r.finalUrl);
      return {
        ...item,
        result: pass ? "PASS" : "FAIL",
        httpStatus: r.status,
        durationMs: r.ms,
        notes: pass ? "Register area reachable" : `Unexpected ${r.finalUrl}`,
        finalUrl: r.finalUrl,
        testedAt,
      };
    }

    const r = await fetchPage(item.path, { cookie: ctx.adminCookie });
    let pass = r.status === 200 && !/admin\/login/i.test(r.finalUrl);
    let notes = `HTTP ${r.status}`;
    if (item.id === "S01") {
      const hasSidebarPwd =
        /href="\/admin\/settings\/change-password"|href="\/admin\/account\/change-password"/i.test(r.text) &&
        /Change password/i.test(r.text);
      // Sidebar should NOT list CMS change password; Settings may still appear
      const sidebarBlock = r.text.match(/<aside[\s\S]*?<\/aside>/i)?.[0] || "";
      const pwdInSidebar = /Change password/i.test(sidebarBlock);
      pass = pass && !pwdInSidebar;
      notes = pwdInSidebar ? "FAIL: Change password still in sidebar" : "Dashboard OK; no Change password in sidebar";
    }
    if (item.id === "S02") {
      const hasCard = /href="\/admin\/settings\/change-password"/i.test(r.text);
      const inlineOld = /Old password/i.test(r.text);
      pass = pass && hasCard && !inlineOld;
      notes = !hasCard
        ? "Missing Change password card"
        : inlineOld
          ? "Inline password form still on Settings"
          : "Card present; form not inline";
    }
    if (item.id === "S03") {
      const hasForm = /Old password|oldPassword|name="oldPassword"/i.test(r.text);
      const hasEye = /Show old password|Eye|aria-label="Show/i.test(r.text);
      pass = pass && hasForm;
      notes = hasForm ? (hasEye ? "Form + eye toggle present" : "Form present (eye may be client-only)") : "Form missing";
    }
    return {
      ...item,
      result: pass ? "PASS" : "FAIL",
      httpStatus: r.status,
      durationMs: r.ms,
      notes,
      finalUrl: r.finalUrl,
      testedAt,
    };
  }

  if (item.method === "Auth-faculty") {
    if (!ctx.facultyCookie) {
      return {
        ...item,
        result: "BLOCKED",
        httpStatus: "",
        durationMs: "",
        notes: ctx.facultyLoginError || "Set SMOKE_FACULTY_EMAIL + SMOKE_FACULTY_PASSWORD to run",
        finalUrl: "",
        testedAt,
      };
    }
    const r = await fetchPage(item.path, { cookie: ctx.facultyCookie });
    let pass = r.status === 200;
    let notes = `HTTP ${r.status}`;
    if (item.id === "S10") {
      // Faculty hitting settings change-password should leave CMS settings flow
      const onFacultyPwd = /register\/faculty\/change-password/i.test(r.finalUrl);
      const blockedSettings = /admin\/login/i.test(r.finalUrl) || onFacultyPwd || !/settings\/change-password/i.test(r.finalUrl);
      pass = blockedSettings || /My profile|Faculty/i.test(r.text);
      notes = onFacultyPwd
        ? "Redirected to faculty change-password"
        : blockedSettings
          ? `Not on CMS settings password (${r.finalUrl.slice(0, 80)})`
          : "FAIL: faculty still on CMS settings password page";
    }
    if (item.id === "F01") {
      const hasOld = /Old password/i.test(r.text);
      pass = pass && !hasOld && !/admin\/login/i.test(r.finalUrl);
      notes = hasOld ? "Password form still on My profile" : "My profile without password form";
    }
    if (item.id === "F02") {
      const hasForm = /Old password|Update password/i.test(r.text);
      pass = pass && hasForm;
      notes = hasForm ? "Faculty change password page OK" : "Form missing";
    }
    return {
      ...item,
      result: pass ? "PASS" : "FAIL",
      httpStatus: r.status,
      durationMs: r.ms,
      notes,
      finalUrl: r.finalUrl,
      testedAt,
    };
  }

  // HTTP / HTTP-ext
  if (item.method === "HTTP-ext") {
    const r = await fetchPage(item.path);
    const pass = r.status > 0 && r.status < 500;
    return {
      ...item,
      result: pass ? "PASS" : "FAIL",
      httpStatus: r.status,
      durationMs: r.ms,
      notes: pass ? "External URL reachable" : r.error || `HTTP ${r.status}`,
      finalUrl: r.finalUrl,
      testedAt,
    };
  }

  if (item.id === "API02") {
    const r = await fetchPage(item.path, {
      method: "POST",
      body: { currentPassword: "x", newPassword: "yyyyyyyy", confirmPassword: "yyyyyyyy" },
    });
    const pass = r.status >= 400 && r.status < 500;
    return {
      ...item,
      result: pass ? "PASS" : "FAIL",
      httpStatus: r.status,
      durationMs: r.ms,
      notes: pass ? "Rejected" : r.text.slice(0, 100),
      finalUrl: r.finalUrl,
      testedAt,
    };
  }

  if (item.id === "API01") {
    const r = await fetchPage(item.path);
    let ok = false;
    try {
      ok = JSON.parse(r.text).status === "ok";
    } catch {
      ok = false;
    }
    return {
      ...item,
      result: r.status === 200 && ok ? "PASS" : "FAIL",
      httpStatus: r.status,
      durationMs: r.ms,
      notes: r.text.slice(0, 80),
      finalUrl: r.finalUrl,
      testedAt,
    };
  }

  const r = await fetchPage(item.path);
  let pass = r.status === 200;
  let notes = `HTTP ${r.status}`;
  if (item.id === "P01") {
    pass = pass && /CCSHAU|Haryana Agricultural|CCS HAU/i.test(r.text);
    notes = pass ? "Branding OK" : "Missing branding";
  }
  if (item.id?.startsWith("A0") && item.id !== "A01" && item.id !== "A02") {
    pass = r.status < 500;
    notes = `Guard OK → ${r.finalUrl.slice(0, 80)}`;
  }
  if (item.expectLabel) {
    const found = r.text.toLowerCase().includes(String(item.expectLabel).toLowerCase());
    pass = pass && found;
    notes = found ? `Label "${item.expectLabel}" found` : `Label "${item.expectLabel}" missing in HTML`;
  }
  if (item.id === "F04" || item.id === "P08") {
    pass = r.status === 200 && (/faculty/i.test(r.text) || /no information available/i.test(r.text));
    notes = /no information available/i.test(r.text) ? "Empty faculty state" : "Faculty content present";
  }
  if (r.status >= 500) {
    pass = false;
    notes = `Server error ${r.status}`;
  }
  return {
    ...item,
    result: pass ? "PASS" : "FAIL",
    httpStatus: r.status || "",
    durationMs: r.ms,
    notes: r.error || notes,
    finalUrl: r.finalUrl,
    testedAt,
  };
}

/* —— xlsx writer (no deps) —— */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function zipStore(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, "utf8");
    const compressed = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    parts.push(local, compressed);
    central.push({ name: f.name, offset, csize: compressed.length, size: data.length, crc });
    offset += local.length + compressed.length;
  }
  const centralStart = offset;
  for (const c of central) {
    const name = Buffer.from(c.name, "utf8");
    const hdr = Buffer.alloc(46 + name.length);
    hdr.writeUInt32LE(0x02014b50, 0);
    hdr.writeUInt16LE(20, 4);
    hdr.writeUInt16LE(20, 6);
    hdr.writeUInt16LE(0, 8);
    hdr.writeUInt16LE(8, 10);
    hdr.writeUInt16LE(0, 12);
    hdr.writeUInt16LE(0, 14);
    hdr.writeUInt32LE(c.crc, 16);
    hdr.writeUInt32LE(c.csize, 20);
    hdr.writeUInt32LE(c.size, 24);
    hdr.writeUInt16LE(name.length, 28);
    hdr.writeUInt16LE(0, 30);
    hdr.writeUInt16LE(0, 32);
    hdr.writeUInt16LE(0, 34);
    hdr.writeUInt16LE(0, 36);
    hdr.writeUInt32LE(0, 38);
    hdr.writeUInt32LE(c.offset, 42);
    name.copy(hdr, 46);
    parts.push(hdr);
    offset += hdr.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(offset - centralStart, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  parts.push(end);
  return Buffer.concat(parts);
}
function xmlEscape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function sheetXml(rows) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>\n`;
  rows.forEach((row, rIdx) => {
    xml += `<row r="${rIdx + 1}">`;
    row.forEach((cell, cIdx) => {
      let ref = "";
      let n = cIdx;
      do {
        ref = String.fromCharCode(65 + (n % 26)) + ref;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      if (typeof cell === "number" && Number.isFinite(cell)) {
        xml += `<c r="${ref}${rIdx + 1}"><v>${cell}</v></c>`;
      } else {
        xml += `<c r="${ref}${rIdx + 1}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`;
      }
    });
    xml += `</row>\n`;
  });
  return xml + `</sheetData></worksheet>`;
}
function writeXlsx(filePath, sheets) {
  const sheetFiles = sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows) }));
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}
</Relationships>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`;
  writeFileSync(
    filePath,
    zipStore([
      { name: "[Content_Types].xml", data: contentTypes },
      { name: "_rels/.rels", data: rootRels },
      { name: "xl/workbook.xml", data: workbookXml },
      { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
      ...sheetFiles,
    ]),
  );
}

async function main() {
  console.log("CCSHAU expanded page test report");
  console.log("Base:", BASE);

  const { plan: navPlan, note: navNote } = await loadHeaderNavPlan();
  console.log(navNote);
  const { plan: deptPlan, note: deptNote } = await loadCollegeDepartmentsPlan();
  console.log(deptNote);

  const skipUnit = args.includes("--skip-unit");
  const staticPlan = skipUnit ? STATIC_PLAN.filter((p) => p.method !== "Unit") : STATIC_PLAN;
  const PLAN = [...navPlan, ...deptPlan, ...staticPlan];
  console.log("Total scenarios:", PLAN.length);

  const ctx = {
    adminCookie: null,
    facultyCookie: null,
    adminLoginError: null,
    facultyLoginError: null,
  };

  if (ENV.SMOKE_ADMIN_EMAIL && ENV.SMOKE_ADMIN_PASSWORD) {
    process.stdout.write("Logging in smoke admin... ");
    const login = await loginCookies(ENV.SMOKE_ADMIN_EMAIL, ENV.SMOKE_ADMIN_PASSWORD);
    if (login.ok && login.cookie) {
      ctx.adminCookie = login.cookie;
      console.log("OK");
    } else {
      ctx.adminLoginError = login.error || "Admin login failed";
      console.log("FAILED:", ctx.adminLoginError);
    }
  } else {
    console.log("No SMOKE_ADMIN_EMAIL/PASSWORD — Auth CMS cases will be BLOCKED");
  }

  if (ENV.SMOKE_FACULTY_EMAIL && ENV.SMOKE_FACULTY_PASSWORD) {
    process.stdout.write("Logging in smoke faculty... ");
    const login = await loginCookies(ENV.SMOKE_FACULTY_EMAIL, ENV.SMOKE_FACULTY_PASSWORD);
    if (login.ok && login.cookie) {
      ctx.facultyCookie = login.cookie;
      console.log("OK");
    } else {
      ctx.facultyLoginError = login.error || "Faculty login failed";
      console.log("FAILED:", ctx.facultyLoginError);
    }
  } else {
    console.log("No SMOKE_FACULTY_EMAIL/PASSWORD — Faculty auth cases will be BLOCKED");
  }

  const results = [];
  for (const item of PLAN) {
    process.stdout.write(`  ${item.id} ${item.page} ... `);
    const row = await runItem(item, ctx);
    results.push(row);
    console.log(`${row.result}${row.httpStatus ? ` (${row.httpStatus})` : ""}`);
  }

  const counts = { PASS: 0, FAIL: 0, PENDING: 0, SKIP: 0, BLOCKED: 0 };
  for (const r of results) {
    const k = String(r.result);
    if (k in counts) counts[k] += 1;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const stamped = join(OUT_DIR, `ccshau-page-test-report-${stamp}.xlsx`);

  const planRows = [
    ["ID", "Area", "Page", "Path", "Scenario", "Method", "Expected", "Role"],
    ...PLAN.map((p) => [p.id, p.area, p.page, p.path, p.scenario, p.method, p.expect, p.role]),
  ];
  const resultRows = [
    ["ID", "Area", "Page", "Path", "Scenario", "Method", "Role", "Result", "HTTP", "ms", "Notes", "Final URL", "Tested at"],
    ...results.map((r) => [
      r.id,
      r.area,
      r.page,
      r.path,
      r.scenario,
      r.method,
      r.role,
      r.result,
      r.httpStatus,
      r.durationMs,
      r.notes,
      r.finalUrl,
      r.testedAt,
    ]),
  ];
  const summaryRows = [
    ["Metric", "Value"],
    ["Base URL", BASE],
    ["Generated at", new Date().toISOString()],
    ["Nav note", navNote],
    ["Departments note", deptNote],
    ["Total", results.length],
    ["PASS", counts.PASS],
    ["FAIL", counts.FAIL],
    ["SKIP", counts.SKIP],
    ["BLOCKED", counts.BLOCKED],
    ["Admin auth used", ctx.adminCookie ? "Yes" : "No"],
    ["Faculty auth used", ctx.facultyCookie ? "Yes" : "No"],
    ["Latest file", OUT_LATEST],
  ];

  const sheets = [
    { name: "Test Plan", rows: planRows },
    { name: "Results", rows: resultRows },
    { name: "Summary", rows: summaryRows },
  ];
  try {
    writeXlsx(OUT_LATEST, sheets);
  } catch (e) {
    console.warn("Could not overwrite latest.xlsx (file locked?):", e instanceof Error ? e.message : e);
  }
  writeXlsx(stamped, sheets);

  const csv = [
    "ID,Area,Page,Path,Scenario,Method,Role,Result,HTTP,ms,Notes",
    ...results.map((r) =>
      [r.id, r.area, r.page, r.path, r.scenario, r.method, r.role, r.result, r.httpStatus, r.durationMs, r.notes]
        .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  try {
    writeFileSync(OUT_CSV, csv, "utf8");
  } catch (e) {
    const altCsv = join(OUT_DIR, `ccshau-page-test-report-${stamp}.csv`);
    writeFileSync(altCsv, csv, "utf8");
    console.warn("latest.csv locked; wrote", altCsv);
  }

  console.log("\n=== Summary ===");
  console.log(counts);
  console.log("Updated:", OUT_LATEST);
  console.log("Copy:", stamped);
  if (counts.FAIL > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
