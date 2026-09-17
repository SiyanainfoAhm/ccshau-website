/**
 * Point Academics → Admissions menu to https://admissions.hau.ac.in/
 * and report whether /pages/admissions is referenced elsewhere.
 * Usage: node fix-admissions-menu-external.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT = join(dirname(fileURLToPath(import.meta.url)), "reports");
const CONFIRM = process.argv.includes("--confirm");
const EXTERNAL = "https://admissions.hau.ac.in/";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function isAdmissionsLabel(label) {
  const s = String(label || "").trim().toLowerCase();
  return s === "admissions" || s === "admission";
}

async function main() {
  const report = {
    menuUpdates: [],
    page: null,
    references: {
      menuItems: [],
      relatedLinks: [],
      sidebarItems: [],
      pageLinks: [],
      homepageCtas: [],
    },
  };

  // --- Menus: find Admissions items ---
  const { data: menus, error: mErr } = await sb
    .from("ccshau_menu_items")
    .select("id,label_en,label_hi,href,page_id,parent_id,open_in_new_tab,menu_id")
    .or("label_en.ilike.admissions,label_en.ilike.admission,href.ilike.%admissions%");
  if (mErr) throw new Error(mErr.message);

  for (const item of menus || []) {
    const exact = isAdmissionsLabel(item.label_en);
    report.references.menuItems.push(item);
    if (!exact) continue;

    const patch = {
      href: EXTERNAL,
      page_id: null,
      open_in_new_tab: true,
      updated_at: new Date().toISOString(),
    };
    report.menuUpdates.push({ id: item.id, before: item, patch });
    if (CONFIRM) {
      const { error } = await sb
        .from("ccshau_menu_items")
        .update(patch)
        .eq("id", item.id);
      if (error) throw new Error(`menu ${item.id}: ${error.message}`);
    }
  }

  // --- Page slug admissions ---
  const { data: page, error: pErr } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,status,parent_id,page_type")
    .eq("slug", "admissions")
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  report.page = page;

  if (page?.id) {
    const pageId = page.id;

    const { data: byPageId } = await sb
      .from("ccshau_menu_items")
      .select("id,label_en,href,page_id")
      .eq("page_id", pageId);
    report.references.menuItems.push(...(byPageId || []));

    const { data: links } = await sb
      .from("ccshau_related_links")
      .select("id,title,link,category")
      .or(`link.ilike.%/pages/admissions%,link.ilike.%/admissions%`);
    report.references.relatedLinks = links || [];

    const { data: sidebars } = await sb
      .from("ccshau_page_sidebar_items")
      .select("id,label_en,href,linked_page_id,page_id")
      .or(
        `href.ilike.%/pages/admissions%,href.ilike.%admissions%,linked_page_id.eq.${pageId}`,
      );
    report.references.sidebarItems = sidebars || [];

    // Content HTML that links to the page
    const { data: contentHits } = await sb
      .from("ccshau_pages")
      .select("id,slug,title_en")
      .or(
        "content_en.ilike.%/pages/admissions%,content_en.ilike.%href=\"/admissions\"%",
      )
      .neq("id", pageId)
      .limit(50);
    report.references.pageLinks = contentHits || [];
  }

  // Unique menu refs
  const seen = new Set();
  report.references.menuItems = report.references.menuItems.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  const stillPointingToLocal = report.references.menuItems.filter(
    (m) =>
      m.page_id === page?.id ||
      /\/pages\/admissions\/?$/i.test(m.href || "") ||
      m.href === "/admissions",
  );

  const otherRefs =
    (report.references.relatedLinks?.length || 0) +
    (report.references.sidebarItems?.length || 0) +
    (report.references.pageLinks?.length || 0) +
    stillPointingToLocal.filter((m) => !isAdmissionsLabel(m.label_en)).length;

  let deletedPage = false;
  const onlyAdmissionsMenuRefs =
    stillPointingToLocal.length > 0 &&
    stillPointingToLocal.every((m) => isAdmissionsLabel(m.label_en)) &&
    (report.references.relatedLinks?.length || 0) === 0 &&
    (report.references.sidebarItems?.length || 0) === 0 &&
    (report.references.pageLinks?.length || 0) === 0;

  if (CONFIRM && page?.id && onlyAdmissionsMenuRefs) {
    // Local page only used by Admissions menu item(s) we just retargeted → unpublish.
    const { error } = await sb
      .from("ccshau_pages")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);
    if (error) throw new Error(`page archive: ${error.message}`);
    deletedPage = "drafted";
  }

  report.deletedPage = deletedPage;
  report.otherRefsCount = otherRefs;
  report.stillPointingToLocal = stillPointingToLocal;
  report.onlyAdmissionsMenuRefs = onlyAdmissionsMenuRefs;

  mkdirSync(REPORT, { recursive: true });
  writeFileSync(
    join(REPORT, "fix-admissions-menu-external.json"),
    JSON.stringify(report, null, 2),
  );

  console.log(
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        menuUpdates: report.menuUpdates.length,
        page: page ? { id: page.id, slug: page.slug, status: page.status } : null,
        menuRefs: report.references.menuItems.length,
        relatedLinks: report.references.relatedLinks.length,
        sidebars: report.references.sidebarItems.length,
        contentPages: report.references.pageLinks.length,
        stillPointingToLocal: stillPointingToLocal.length,
        deletedPage,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
