/**
 * Inventory microsite roots + staff-bearing pages for faculty-people migration.
 * Read-only. Prints done vs pending grouped by kind.
 *
 * Usage: node inventory-faculty-people-pending.mjs
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

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

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

const STATION_SLUGS = new Set([
  "regional-research-station-karnal",
  "cotton-research-station-sirsa",
  "regional-research-station-bawal",
  "regional-research-station-rohtak",
  "rice-research-station-kaul",
  "regional-research-station-bura",
  "research-farm-balsamand",
  "horticulture-research-farm-buria",
]);

async function fetchAll(supabase, table, columns, extra = (q) => q) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let query = extra(supabase.from(table).select(columns)).range(from, from + pageSize - 1);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return rows;
}

function classify(root, parentSlug) {
  if (STATION_SLUGS.has(root.slug)) return "research_station";
  if (parentSlug === "colleges") return "college";
  const slug = root.slug;
  const title = String(root.title_en || "").toLowerCase();
  if (slug.startsWith("directorate-") || title.includes("directorate")) return "directorate";
  if (title.includes("institute") || slug.includes("institute")) return "institute";
  if (title.includes("centre") || title.includes("center") || slug.includes("centre")) return "centre";
  if (title.includes("library") || slug.includes("library")) return "section";
  return "section";
}

function pad(n, w = 4) {
  return String(n).padStart(w, " ");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: settings, error: settingsErr } = await supabase
    .from("ccshau_site_settings")
    .select("faculty_people_public_college_ids")
    .limit(1)
    .maybeSingle();
  if (settingsErr) throw new Error(settingsErr.message);
  const doneIds = new Set(settings?.faculty_people_public_college_ids ?? []);

  const pages = await fetchAll(
    supabase,
    "ccshau_pages",
    "id, slug, title_en, parent_id, college_root_id, page_type, layout_template, status",
  );
  const byId = new Map(pages.map((p) => [p.id, p]));

  const roots = pages.filter(
    (p) => p.page_type === "college" && p.college_root_id === p.id,
  );

  const staff = await fetchAll(
    supabase,
    "ccshau_page_staff",
    "id, page_id, is_active",
  );
  const assignments = await fetchAll(
    supabase,
    "ccshau_faculty_assignments",
    "id, page_id, source_staff_id, is_active",
  );

  const staffByPage = new Map();
  for (const row of staff) {
    const bucket = staffByPage.get(row.page_id) ?? { active: 0, inactive: 0 };
    if (row.is_active) bucket.active += 1;
    else bucket.inactive += 1;
    staffByPage.set(row.page_id, bucket);
  }

  const linkedStaff = new Set(
    assignments.map((a) => a.source_staff_id).filter(Boolean),
  );
  const linkedByPage = new Map();
  for (const row of staff) {
    if (!row.is_active) continue;
    if (!linkedStaff.has(row.id)) continue;
    linkedByPage.set(row.page_id, (linkedByPage.get(row.page_id) ?? 0) + 1);
  }

  const childPagesByRoot = new Map();
  const portalPagesByRoot = new Map();
  for (const page of pages) {
    const rootId = page.college_root_id;
    if (!rootId) continue;
    const kids = childPagesByRoot.get(rootId) ?? [];
    kids.push(page);
    childPagesByRoot.set(rootId, kids);
    if (page.layout_template === "office_portal" && page.id !== rootId) {
      const portals = portalPagesByRoot.get(rootId) ?? [];
      portals.push(page);
      portalPagesByRoot.set(rootId, portals);
    }
  }

  const rows = roots.map((root) => {
    const parent = root.parent_id ? byId.get(root.parent_id) : null;
    const kind = classify(root, parent?.slug ?? null);
    const portals = portalPagesByRoot.get(root.id) ?? [];
    const descendants = childPagesByRoot.get(root.id) ?? [];
    const pageIds = new Set([root.id, ...descendants.map((p) => p.id)]);
    let active = 0;
    let inactive = 0;
    let linked = 0;
    const staffPages = [];
    for (const pageId of pageIds) {
      const counts = staffByPage.get(pageId);
      if (!counts) continue;
      active += counts.active;
      inactive += counts.inactive;
      linked += linkedByPage.get(pageId) ?? 0;
      const page = byId.get(pageId);
      if (counts.active + counts.inactive > 0) {
        staffPages.push({
          slug: page?.slug ?? pageId,
          title: page?.title_en ?? "",
          layout: page?.layout_template ?? "",
          active: counts.active,
          inactive: counts.inactive,
          linked: linkedByPage.get(pageId) ?? 0,
        });
      }
    }
    return {
      id: root.id,
      slug: root.slug,
      title: root.title_en,
      kind,
      parentSlug: parent?.slug ?? null,
      status: root.status,
      done: doneIds.has(root.id),
      deptPages: portals.length,
      childPages: descendants.filter((p) => p.id !== root.id).length,
      active,
      inactive,
      linked,
      unlinkedActive: Math.max(0, active - linked),
      staffPages: staffPages.sort((a, b) => b.active - a.active),
    };
  });

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.title.localeCompare(b.title);
  });

  const orphanStaffPages = [];
  for (const [pageId, counts] of staffByPage) {
    const page = byId.get(pageId);
    if (!page) {
      orphanStaffPages.push({
        slug: pageId,
        title: "(missing page)",
        root: null,
        ...counts,
      });
      continue;
    }
    const root = page.college_root_id ? byId.get(page.college_root_id) : null;
    const isRoot = root && root.page_type === "college" && root.college_root_id === root.id;
    if (!isRoot && counts.active + counts.inactive > 0) {
      orphanStaffPages.push({
        slug: page.slug,
        title: page.title_en,
        root: page.college_root_id,
        layout: page.layout_template,
        ...counts,
      });
    }
  }

  const groups = ["college", "directorate", "research_station", "institute", "centre", "section"];
  const pending = rows.filter((r) => !r.done);
  const done = rows.filter((r) => r.done);

  console.log("=== DONE (public faculty-people flag on) ===");
  for (const r of done) {
    console.log(
      `${r.kind.padEnd(18)} ${pad(r.active)} active / ${pad(r.linked)} linked / ${pad(r.deptPages)} depts  ${r.slug}  — ${r.title}`,
    );
  }

  console.log("\n=== PENDING MICROSITES ===");
  for (const kind of groups) {
    const list = pending.filter((r) => r.kind === kind);
    if (!list.length) continue;
    const staffTotal = list.reduce((s, r) => s + r.active, 0);
    console.log(`\n-- ${kind} (${list.length} units, ${staffTotal} active staff) --`);
    for (const r of list) {
      console.log(
        `${pad(r.active)} active | ${pad(r.linked)} linked | ${pad(r.unlinkedActive)} unlinked | ${pad(r.deptPages)} dept pages | ${pad(r.childPages)} child pages  ${r.slug}`,
      );
      console.log(`    ${r.title}${r.status !== "published" ? ` [${r.status}]` : ""}`);
    }
  }

  const pendingWithStaff = pending.filter((r) => r.active > 0);
  const pendingNoStaff = pending.filter((r) => r.active === 0);

  console.log("\n=== PENDING WITH ACTIVE STAFF (migration queue) ===");
  for (const r of pendingWithStaff.sort((a, b) => b.active - a.active)) {
    console.log(`${pad(r.active)}  ${r.kind.padEnd(18)} ${r.slug}  — ${r.title}`);
  }

  console.log("\n=== PENDING WITH ZERO ACTIVE STAFF ===");
  for (const r of pendingNoStaff) {
    console.log(`   0  ${r.kind.padEnd(18)} ${r.slug}  — ${r.title}`);
  }

  if (orphanStaffPages.length) {
    console.log("\n=== STAFF ON PAGES OUTSIDE A MICROSITE ROOT ===");
    for (const p of orphanStaffPages.sort((a, b) => b.active - a.active)) {
      console.log(
        `${pad(p.active)} active / ${pad(p.inactive)} inactive  ${p.slug}  — ${p.title}`,
      );
    }
  }

  console.log("\n=== TOTALS ===");
  console.log(`microsite roots: ${rows.length}`);
  console.log(`done: ${done.length} (${done.reduce((s, r) => s + r.active, 0)} active staff)`);
  console.log(`pending: ${pending.length} (${pending.reduce((s, r) => s + r.active, 0)} active staff)`);
  console.log(`pending with staff: ${pendingWithStaff.length}`);
  console.log(`pending zero staff: ${pendingNoStaff.length}`);
  console.log(`orphan staff pages: ${orphanStaffPages.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
