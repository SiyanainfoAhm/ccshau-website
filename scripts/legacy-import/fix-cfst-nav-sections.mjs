/**
 * Fix CFST college top nav: rename Departments slug + create Gallery section.
 *
 * Usage:
 *   node fix-cfst-nav-sections.mjs --dry-run
 *   node fix-cfst-nav-sections.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = !CONFIRM;

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const CFST_SLUG = "centre-of-food-science-technology";
const DEPT_OLD = "science-technology-department";
const DEPT_NEW = "cfst-department";
const GALLERY_SLUG = "cfst-gallery";

const { data: cfst, error: cfstErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, status")
  .eq("slug", CFST_SLUG)
  .maybeSingle();
if (cfstErr) throw new Error(cfstErr.message);
if (!cfst) throw new Error("CFST root missing");

const summary = {
  mode: DRY_RUN ? "dry-run" : "apply",
  cfstId: cfst.id,
  renameDept: null,
  createGallery: null,
  kidsAfter: null,
};

const { data: dept } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, parent_id, college_root_id, status")
  .eq("slug", DEPT_OLD)
  .maybeSingle();

const { data: deptAlready } = await sb
  .from("ccshau_pages")
  .select("id, slug, parent_id, status")
  .eq("slug", DEPT_NEW)
  .maybeSingle();

if (deptAlready) {
  summary.renameDept = { status: "already-renamed", slug: DEPT_NEW, id: deptAlready.id };
} else if (!dept) {
  summary.renameDept = { status: "missing-old-slug", slug: DEPT_OLD };
} else {
  summary.renameDept = {
    id: dept.id,
    from: dept.slug,
    to: DEPT_NEW,
    parent_id: dept.parent_id,
  };
  if (!DRY_RUN) {
    const { error } = await sb
      .from("ccshau_pages")
      .update({
        slug: DEPT_NEW,
        parent_id: cfst.id,
        college_root_id: cfst.id,
        status: "published",
      })
      .eq("id", dept.id);
    if (error) throw new Error(`rename dept: ${error.message}`);
    summary.renameDept.status = "updated";
  } else {
    summary.renameDept.status = "would-update";
  }
}

const { data: gallery } = await sb
  .from("ccshau_pages")
  .select("id, slug, parent_id, college_root_id, status")
  .eq("slug", GALLERY_SLUG)
  .maybeSingle();

if (gallery) {
  const needsRelink =
    gallery.parent_id !== cfst.id || gallery.college_root_id !== cfst.id;
  summary.createGallery = {
    status: needsRelink
      ? DRY_RUN
        ? "would-relink"
        : "relink"
      : "exists",
    id: gallery.id,
  };
  if (needsRelink && !DRY_RUN) {
    const { error } = await sb
      .from("ccshau_pages")
      .update({
        parent_id: cfst.id,
        college_root_id: cfst.id,
        status: "published",
        title_en: "Gallery",
        title_hi: "गैलरी",
        sort_order: 2,
      })
      .eq("id", gallery.id);
    if (error) throw new Error(`relink gallery: ${error.message}`);
  }
} else {
  summary.createGallery = {
    slug: GALLERY_SLUG,
    parent_id: cfst.id,
  };
  if (!DRY_RUN) {
    const { data: inserted, error } = await sb
      .from("ccshau_pages")
      .insert({
        slug: GALLERY_SLUG,
        title_en: "Gallery",
        title_hi: "गैलरी",
        excerpt_en: "Photo gallery.",
        page_type: "standard",
        layout_template: "standard",
        status: "published",
        published_at: new Date().toISOString(),
        parent_id: cfst.id,
        college_root_id: cfst.id,
        sort_order: 2,
        show_main_menu: true,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(`create gallery: ${error.message}`);
    summary.createGallery.status = "created";
    summary.createGallery.id = inserted.id;
  } else {
    summary.createGallery.status = "would-create";
  }
}

const { data: kids } = await sb
  .from("ccshau_pages")
  .select("slug, title_en, status, sort_order")
  .eq("parent_id", cfst.id)
  .eq("status", "published")
  .order("sort_order");
summary.kidsAfter = kids;

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-cfst-nav-sections-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("Report:", out);
