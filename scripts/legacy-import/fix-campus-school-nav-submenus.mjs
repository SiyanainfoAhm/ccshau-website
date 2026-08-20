/**
 * Fix Campus School nav dropdowns: subsections were imported with
 * showInDepartmentsMenu=false, which hides them from college nav.
 *
 * Usage: node fix-campus-school-nav-submenus.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");
const ROOT_ID = "a28d4da5-1229-4bb1-9c82-f5646335a488";

const SECTION_SLUGS = new Set([
  "cs-about-us",
  "cs-messages",
  "cs-school-management",
  "cs-school-info",
]);

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
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: sections, error: secErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, layout_config")
  .eq("parent_id", ROOT_ID)
  .in("slug", [...SECTION_SLUGS]);
if (secErr) throw new Error(secErr.message);

const sectionIds = (sections || []).map((s) => s.id);
const { data: children, error: childErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, parent_id, layout_config")
  .in("parent_id", sectionIds);
if (childErr) throw new Error(childErr.message);

console.log(
  "Will enable submenu for",
  (children || []).map((c) => c.slug).join(", "),
);

if (!CONFIRM) {
  console.log("Re-run with --confirm to apply");
  process.exit(0);
}

let updated = 0;
for (const child of children || []) {
  const next = {
    ...(child.layout_config && typeof child.layout_config === "object"
      ? child.layout_config
      : {}),
    showInDepartmentsMenu: true,
    collegeTopMenu: true,
  };
  const { error } = await sb
    .from("ccshau_pages")
    .update({ layout_config: next })
    .eq("id", child.id);
  if (error) throw new Error(`${child.slug}: ${error.message}`);
  updated += 1;
}

// Also unpublish stray media-gallery child so it doesn't clutter if ever allowlisted
await sb
  .from("ccshau_pages")
  .update({ status: "draft" })
  .eq("slug", "media-gallery")
  .eq("parent_id", ROOT_ID);

console.log(JSON.stringify({ ok: true, updated }, null, 2));
