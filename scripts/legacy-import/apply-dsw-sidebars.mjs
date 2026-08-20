/**
 * Remove academic-department sidebar tabs that were seeded onto DSW sections.
 * Live DSW menus do not include Thrust Area, Course Structure, etc.
 *
 * Usage:
 *   node apply-dsw-sidebars.mjs --dry-run
 *   node apply-dsw-sidebars.mjs --confirm
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

const EXTRA_LABELS = new Set([
  "thrust area",
  "teaching and research",
  "awards and honors",
  "infrastructure",
  "alumni of the department",
  "retiree of the department",
  "course structure",
]);

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

function normalize(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

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

  const { data: pages, error: pageErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .like("slug", "dsw-%")
    .neq("slug", "dsw-department");
  if (pageErr) throw new Error(pageErr.message);

  const pageIds = (pages || []).map((p) => p.id);
  const { data: items, error: itemErr } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, page_id, label_en, is_active")
    .in("page_id", pageIds)
    .eq("side", "left");
  if (itemErr) throw new Error(itemErr.message);

  const byId = new Map((pages || []).map((p) => [p.id, p]));
  const extras = (items || []).filter((row) => EXTRA_LABELS.has(normalize(row.label_en)));
  const hodRows = (items || []).filter(
    (row) => normalize(row.label_en) === "head of department",
  );

  console.log(CONFIRM ? "apply" : "dry-run", "dsw sidebars");
  console.log("deactivate extras", extras.length);
  console.log("rename Head of Department -> Head of Section", hodRows.length);
  const sample = extras
    .filter((row) => byId.get(row.page_id)?.slug === "dsw-accommodation")
    .map((row) => row.label_en);
  console.log("accommodation extras", sample);

  if (CONFIRM) {
    if (extras.length) {
      const { error } = await supabase
        .from("ccshau_page_sidebar_items")
        .update({ is_active: false })
        .in(
          "id",
          extras.map((row) => row.id),
        );
      if (error) throw new Error(error.message);
    }
    for (const row of hodRows) {
      const { error } = await supabase
        .from("ccshau_page_sidebar_items")
        .update({
          label_en: "Head of Section",
          label_hi: "अनुभाग प्रमुख",
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-dsw-sidebars.json");
  writeFileSync(
    out,
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        deactivated: extras.map((row) => ({
          id: row.id,
          slug: byId.get(row.page_id)?.slug,
          label: row.label_en,
        })),
        renamedHod: hodRows.length,
      },
      null,
      2,
    ),
  );
  console.log("Report:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
