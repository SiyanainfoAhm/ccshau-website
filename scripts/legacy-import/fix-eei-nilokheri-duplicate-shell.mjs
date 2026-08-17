/**
 * Unpublish empty duplicate EEI Nilokheri microsite root.
 *
 * Usage:
 *   node fix-eei-nilokheri-duplicate-shell.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const DUP_SLUG = "extension-education-institute-nilokheri-1";

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
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id, slug, title_en, status, layout_template")
    .eq("slug", DUP_SLUG)
    .eq("page_type", "college")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error(`Duplicate root not found: ${DUP_SLUG}`);

  const { count: staffCount } = await sb
    .from("ccshau_page_staff")
    .select("id", { count: "exact", head: true })
    .eq("page_id", page.id)
    .eq("is_active", true);

  console.log(
    JSON.stringify(
      { mode: CONFIRM ? "apply" : "dry-run", page, activeStaffOnRoot: staffCount ?? 0 },
      null,
      2,
    ),
  );

  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to unpublish the duplicate root.");
    return;
  }

  if ((staffCount ?? 0) > 0) {
    throw new Error("Duplicate root has active staff — aborting.");
  }

  const { error: updErr } = await sb
    .from("ccshau_pages")
    .update({ status: "draft" })
    .eq("id", page.id)
    .eq("status", "published");
  if (updErr) throw new Error(updErr.message);

  console.log("Unpublished duplicate EEI Nilokheri shell.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
