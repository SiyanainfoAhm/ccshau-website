/**
 * Link Krishi Vigyan Kendras into DEE → Extension services dropdown.
 *
 * The legacy CMS page (cms/1930) was imported as orphan `krishi-vigyan-kendra`
 * under the DEE college root but never attached to `dee-department`.
 *
 * Usage:
 *   node fix-dee-kvk-menu.mjs --dry-run
 *   node fix-dee-kvk-menu.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRM = process.argv.includes("--confirm");

const DEE_ROOT_ID = "11d2f896-bfbe-443d-a978-17c067a85505";
const DEE_DEPT_SECTION_ID = "c898d727-efe5-4b2e-bd2a-29e473d9f18c";
const KVK_PAGE_ID = "a0bccba8-11f0-415e-8703-f04bb193a07e";

const LAYOUT_CONFIG = {
  hero: true,
  headOfficer: false,
  contacts: false,
  staff: false,
  gallery: false,
  newsTicker: false,
  studentCorner: false,
  mainContent: true,
  leftSidebar: true,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

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

function loadSupabaseJs() {
  return createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
}

async function main() {
  if (!DRY_RUN && !CONFIRM) {
    console.error("Pass --dry-run or --confirm");
    process.exit(1);
  }

  const { createClient } = loadSupabaseJs();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data: before } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, parent_id, sort_order, layout_template")
    .eq("id", KVK_PAGE_ID)
    .maybeSingle();

  const { data: siblings } = await supabase
    .from("ccshau_pages")
    .select("slug, title_en, sort_order")
    .eq("parent_id", DEE_DEPT_SECTION_ID)
    .eq("status", "published")
    .order("sort_order")
    .order("title_en");

  const payload = {
    parent_id: DEE_DEPT_SECTION_ID,
    slug: "dee-krishi-vigyan-kendras",
    title_en: "Krishi Vigyan Kendras",
    title_hi: "कृषि विज्ञान केंद्र",
    layout_template: "office_portal",
    layout_config: LAYOUT_CONFIG,
    sort_order: 100,
    status: "published",
    office_cta_enabled: true,
    college_root_id: DEE_ROOT_ID,
  };

  const report = {
    dryRun: DRY_RUN,
    before,
    siblingsBefore: siblings ?? [],
    payload,
    appliedAt: new Date().toISOString(),
  };

  if (DRY_RUN) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const { data: updated, error } = await supabase
    .from("ccshau_pages")
    .update(payload)
    .eq("id", KVK_PAGE_ID)
    .select("id, slug, title_en, parent_id, sort_order")
    .single();

  if (error) throw new Error(error.message);

  const { data: siblingsAfter } = await supabase
    .from("ccshau_pages")
    .select("slug, title_en, sort_order")
    .eq("parent_id", DEE_DEPT_SECTION_ID)
    .eq("status", "published")
    .order("sort_order")
    .order("title_en");

  report.after = updated;
  report.siblingsAfter = siblingsAfter ?? [];

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, "fix-dee-kvk-menu.json"), JSON.stringify(report, null, 2));
  console.log("✓ Linked Krishi Vigyan Kendras under dee-department");
  console.log(JSON.stringify(updated, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
