/**
 * Fix CFST <-> Agri Engg page mixups from audit.
 *
 * - Unpublish wrong duplicate dept portals under CFST (proper coaet-* pages already exist)
 * - Unpublish duplicate CFST page under COAET
 * - Parent CFST "Departments" section under CFST college root
 *
 * Usage:
 *   node fix-mislinked-college-roots.mjs --dry-run
 *   node fix-mislinked-college-roots.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run") || !CONFIRM;

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

async function pageBySlug(slug) {
  const { data, error } = await sb
    .from("ccshau_pages")
    .select(
      "id, slug, title_en, parent_id, college_root_id, layout_template, status",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function countLeftContent(pageId) {
  const { data, error } = await sb
    .from("ccshau_page_sidebar_items")
    .select("label_en, content_en, is_active")
    .eq("page_id", pageId)
    .eq("side", "left")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  const items = data || [];
  return {
    activeLeft: items.length,
    withContent: items.filter((i) => (i.content_en || "").trim()).length,
  };
}

const CFST = await pageBySlug("centre-of-food-science-technology");
const COAET = await pageBySlug("college-of-agricultural-engineering-and-technology");
if (!CFST || !COAET) throw new Error("Missing CFST or COAET root");

console.log("CFST root", CFST.id);
console.log("COAET root", COAET.id);

/** Wrong duplicates — keep coaet-* / cfst-* canonical pages published */
const UNPUBLISH = [
  {
    slug: "basic-engineering",
    keepSlug: "coaet-basic-engineering",
    note: "Duplicate under CFST; canonical is coaet-basic-engineering",
  },
  {
    slug: "farm-machinery-power-engineering",
    keepSlug: "coaet-farm-machinery-power-engineering",
    note: "Duplicate under CFST; canonical is coaet-farm-machinery-power-engineering",
  },
  {
    slug: "coaet-centre-of-food-science-technology",
    keepSlug: "cfst-centre-of-food-science-and-technology",
    note: "Duplicate CFST dept under Agri Engg; canonical is under CFST",
  },
];

const summary = {
  mode: DRY_RUN ? "dry-run" : "apply",
  unpublish: [],
  sectionFix: null,
  keepChecks: [],
  cfstDeptCheck: null,
};

for (const item of UNPUBLISH) {
  const page = await pageBySlug(item.slug);
  const keep = await pageBySlug(item.keepSlug);
  const entry = {
    slug: item.slug,
    keepSlug: item.keepSlug,
    note: item.note,
    found: Boolean(page),
    keepFound: Boolean(keep),
    keepStatus: keep?.status ?? null,
    beforeStatus: page?.status ?? null,
  };

  if (keep) {
    entry.keepContent = await countLeftContent(keep.id);
    summary.keepChecks.push({
      slug: keep.slug,
      status: keep.status,
      college_root_id: keep.college_root_id,
      ...entry.keepContent,
    });
  }

  if (!page) {
    entry.status = "missing";
    summary.unpublish.push(entry);
    console.log("missing:", item.slug);
    continue;
  }

  if (page.status === "archived") {
    entry.status = "already-archived";
    summary.unpublish.push(entry);
    console.log("already-archived:", item.slug);
    continue;
  }

  if (!DRY_RUN) {
    const { error } = await sb
      .from("ccshau_pages")
      .update({ status: "archived" })
      .eq("id", page.id);
    if (error) throw new Error(`${item.slug}: ${error.message}`);
    entry.status = "archived";
  } else {
    entry.status = "would-archive";
  }
  summary.unpublish.push(entry);
  console.log(`${entry.status}: ${item.slug} (keep ${item.keepSlug})`);
}

// Parent CFST Departments section under college root if orphaned
const { data: cfstSection, error: secErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, parent_id, college_root_id, status")
  .eq("slug", "science-technology-department")
  .eq("college_root_id", CFST.id)
  .maybeSingle();
if (secErr) throw new Error(secErr.message);

if (cfstSection) {
  const needsParent = cfstSection.parent_id !== CFST.id;
  const patch = {
    parent_id: CFST.id,
    college_root_id: CFST.id,
  };
  summary.sectionFix = {
    slug: cfstSection.slug,
    fromParent: cfstSection.parent_id,
    toParent: CFST.id,
    needed: needsParent,
  };
  if (needsParent) {
    if (!DRY_RUN) {
      const { error } = await sb
        .from("ccshau_pages")
        .update(patch)
        .eq("id", cfstSection.id);
      if (error) throw new Error(`section: ${error.message}`);
      summary.sectionFix.status = "updated";
    } else {
      summary.sectionFix.status = "would-update";
    }
    console.log(`${summary.sectionFix.status}: ${cfstSection.slug} parent → CFST root`);
  } else {
    summary.sectionFix.status = "ok";
    console.log("section parent OK:", cfstSection.slug);
  }
}

const cfstDept = await pageBySlug("cfst-centre-of-food-science-and-technology");
if (cfstDept) {
  summary.cfstDeptCheck = {
    slug: cfstDept.slug,
    status: cfstDept.status,
    college_root_id: cfstDept.college_root_id,
    parent_id: cfstDept.parent_id,
    ...(await countLeftContent(cfstDept.id)),
  };
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-mislinked-college-roots-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("Report:", out);
