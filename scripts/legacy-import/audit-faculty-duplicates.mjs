/**
 * Phase 0 — Faculty duplicate audit (read-only).
 *
 * Usage:
 *   node audit-faculty-duplicates.mjs
 *   node audit-faculty-duplicates.mjs --college=college-of-agriculture-hisar
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaffPageIds } from "./faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

const COLLEGE_SLUG = argValue("--college") || "college-of-agriculture-hisar";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

function loadFromWeb(name) {
  return createRequire(join(ROOT, "apps/web/package.json"))(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", COLLEGE_SLUG)
    .eq("page_type", "college")
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

  const { pageIds, pageById, includesRootStaff } = await resolveStaffPageIds(
    supabase,
    college.id,
    { publishedOnly: true },
  );

  let staffRows = [];
  if (pageIds.length) {
    const { data: staff, error: staffErr } = await supabase
      .from("ccshau_page_staff")
      .select(
        "id, page_id, name_en, designation_en, email, staff_slug, member_type, is_active, detail_content_en",
      )
      .in("page_id", pageIds);
    if (staffErr) throw new Error(staffErr.message);
    staffRows = staff || [];
  }

  const active = staffRows.filter((r) => r.is_active !== false);

  const withinPageBySlug = [];
  const withinPageByEmail = [];
  const withinPageByName = [];
  const multiHod = [];
  const nullSlug = [];

  const byPage = new Map();
  for (const row of active) {
    const list = byPage.get(row.page_id) || [];
    list.push(row);
    byPage.set(row.page_id, list);
    if (!row.staff_slug) {
      nullSlug.push({
        page: pageById.get(row.page_id)?.title_en,
        pageSlug: pageById.get(row.page_id)?.slug,
        name: row.name_en,
        id: row.id,
      });
    }
  }

  for (const [pageId, rows] of byPage) {
    const page = pageById.get(pageId);
    const slugMap = new Map();
    const emailMap = new Map();
    const nameMap = new Map();
    let hodCount = 0;
    for (const row of rows) {
      if (row.member_type === "hod") hodCount += 1;
      if (row.staff_slug) {
        const key = row.staff_slug;
        if (!slugMap.has(key)) slugMap.set(key, []);
        slugMap.get(key).push(row);
      }
      const email = normalizeEmail(row.email);
      if (email) {
        if (!emailMap.has(email)) emailMap.set(email, []);
        emailMap.get(email).push(row);
      }
      const nameKey = normalizeName(row.name_en);
      if (nameKey) {
        if (!nameMap.has(nameKey)) nameMap.set(nameKey, []);
        nameMap.get(nameKey).push(row);
      }
    }
    if (hodCount > 1) {
      multiHod.push({
        page: page?.title_en,
        pageSlug: page?.slug,
        hodCount,
        names: rows.filter((r) => r.member_type === "hod").map((r) => r.name_en),
      });
    }
    for (const [slug, group] of slugMap) {
      if (group.length > 1) {
        withinPageBySlug.push({
          page: page?.title_en,
          pageSlug: page?.slug,
          staffSlug: slug,
          count: group.length,
          names: group.map((g) => g.name_en),
          ids: group.map((g) => g.id),
        });
      }
    }
    for (const [email, group] of emailMap) {
      if (group.length > 1) {
        withinPageByEmail.push({
          page: page?.title_en,
          pageSlug: page?.slug,
          email,
          count: group.length,
          names: group.map((g) => g.name_en),
          ids: group.map((g) => g.id),
        });
      }
    }
    for (const [nameKey, group] of nameMap) {
      if (group.length > 1) {
        withinPageByName.push({
          page: page?.title_en,
          pageSlug: page?.slug,
          nameKey,
          count: group.length,
          names: group.map((g) => g.name_en),
          designations: group.map((g) => g.designation_en),
          ids: group.map((g) => g.id),
          note: "name-only — review manually, do not auto-merge",
        });
      }
    }
  }

  const crossPageLegacy = new Map();
  for (const row of active) {
    const m = String(row.staff_slug || "").match(/^legacy-user-(\d+)$/i);
    if (!m) continue;
    const key = m[1];
    if (!crossPageLegacy.has(key)) crossPageLegacy.set(key, []);
    crossPageLegacy.get(key).push({
      id: row.id,
      name: row.name_en,
      designation: row.designation_en,
      page: pageById.get(row.page_id)?.title_en,
      pageSlug: pageById.get(row.page_id)?.slug,
      staffSlug: row.staff_slug,
    });
  }
  const dualAppointments = [...crossPageLegacy.entries()]
    .filter(([, group]) => new Set(group.map((g) => g.pageSlug)).size > 1)
    .map(([legacyId, group]) => ({
      legacyUserId: legacyId,
      pageCount: new Set(group.map((g) => g.pageSlug)).size,
      name: group[0]?.name,
      placements: group,
      note: "likely valid dual appointment — keep unless marked duplicate",
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    college: { id: college.id, slug: college.slug, title: college.title_en },
    totals: {
      departmentPages: pageIds.length,
      includesRootStaff,
      staffRows: staffRows.length,
      activeStaffRows: active.length,
      nullSlugActive: nullSlug.length,
      withinPageSlugDupes: withinPageBySlug.length,
      withinPageEmailDupes: withinPageByEmail.length,
      withinPageNameDupes: withinPageByName.length,
      multiHodPages: multiHod.length,
      dualAppointmentPeople: dualAppointments.length,
    },
    withinPageBySlug,
    withinPageByEmail,
    withinPageByName,
    multiHod,
    nullSlug,
    dualAppointments,
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, `faculty-audit-${COLLEGE_SLUG}.json`);
  writeFileSync(out, JSON.stringify(report, null, 2));

  console.log(`College: ${college.title_en} (${college.slug})`);
  console.log(`Departments: ${pageIds.length}; active staff: ${active.length}`);
  if (includesRootStaff) console.log("(includes root page staff)");
  console.log(`Within-page slug dupes: ${withinPageBySlug.length}`);
  console.log(`Within-page email dupes: ${withinPageByEmail.length}`);
  console.log(`Within-page name dupes (review only): ${withinPageByName.length}`);
  console.log(`Multi-HOD pages: ${multiHod.length}`);
  console.log(`Null-slug active rows: ${nullSlug.length}`);
  console.log(`Dual-appointment (legacy-user): ${dualAppointments.length}`);
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
