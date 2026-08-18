/**
 * Label HRM college nav as DHRM, order sub-pages like hau.ac.in/college/hrm,
 * and turn on the college top menu.
 *
 * Usage:
 *   node apply-hrm-nav.mjs --dry-run
 *   node apply-hrm-nav.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

const COLLEGE_ID = "c70a4b1d-d236-4ca2-bd4b-e290584fa9ce";
const DEPARTMENT_ID = "8e877f08-5417-4489-8367-9f36c13457f5";
const GALLERY_ID = "c081579c-46bd-4ad3-afd2-cc7211b57175";

const SUBSECTION_ORDER = [
  ["hrm-directorate", 1],
  ["hrm-academy-of-agricultural-research-education-management", 2],
  ["hrm-ipr-cell-bpd-unit", 3],
  ["hrm-manpower-assessment-cell", 4],
  ["hrm-planning-and-evaluation-section", 5],
];

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

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, layout_config")
    .eq("id", COLLEGE_ID)
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college) throw new Error("Missing HRM college page");

  const layoutConfig = {
    ...(college.layout_config && typeof college.layout_config === "object"
      ? college.layout_config
      : {}),
    collegeTopMenu: true,
    headOfficer: true,
    contacts: true,
    mainContent: true,
  };

  const updates = [
    {
      id: DEPARTMENT_ID,
      title_en: "DHRM",
      title_hi: "डीएचआरएम",
      sort_order: 1,
    },
    { id: GALLERY_ID, sort_order: 2 },
    { id: COLLEGE_ID, layout_config: layoutConfig },
  ];

  const { data: subsections, error: subErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, sort_order")
    .in(
      "slug",
      SUBSECTION_ORDER.map(([slug]) => slug),
    );
  if (subErr) throw new Error(subErr.message);
  const bySlug = new Map((subsections || []).map((row) => [row.slug, row]));
  for (const [slug, sortOrder] of SUBSECTION_ORDER) {
    const row = bySlug.get(slug);
    if (!row) throw new Error(`Missing DHRM sub-page ${slug}`);
    updates.push({ id: row.id, sort_order: sortOrder });
  }

  console.log(CONFIRM ? "apply" : "dry-run", "hrm nav");
  console.log("DHRM section title Departments -> DHRM");
  console.log("collegeTopMenu", college.layout_config?.collegeTopMenu, "->", true);
  console.log(
    "subsection order",
    SUBSECTION_ORDER.map(([slug, order]) => `${order}. ${slug}`),
  );

  if (CONFIRM) {
    for (const payload of updates) {
      const { id, ...patch } = payload;
      const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", id);
      if (error) throw new Error(`${id}: ${error.message}`);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-hrm-nav.json");
  writeFileSync(
    out,
    JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", layoutConfig, updates }, null, 2),
  );
  console.log("Report:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
