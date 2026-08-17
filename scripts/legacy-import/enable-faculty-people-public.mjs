/**
 * Append college root ids to faculty_people_public_college_ids.
 *
 * Usage:
 *   node enable-faculty-people-public.mjs --slug=dsw --slug=ic-college-of-community-science
 *   node enable-faculty-people-public.mjs --slug=dsw --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

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

const slugs = process.argv
  .filter((a) => a.startsWith("--slug="))
  .map((a) => a.slice("--slug=".length));

if (!slugs.length) {
  console.error("Pass at least one --slug=...");
  process.exit(1);
}

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: roots, error: rootErr } = await sb
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .in("slug", slugs)
    .eq("page_type", "college");
  if (rootErr) throw new Error(rootErr.message);

  const found = new Set((roots ?? []).map((r) => r.slug));
  for (const slug of slugs) {
    if (!found.has(slug)) throw new Error(`College root not found: ${slug}`);
  }

  const { data: settings, error: settingsErr } = await sb
    .from("ccshau_site_settings")
    .select("id, faculty_people_public_college_ids")
    .limit(1)
    .maybeSingle();
  if (settingsErr) throw new Error(settingsErr.message);
  if (!settings) throw new Error("site_settings row missing");

  const current = settings.faculty_people_public_college_ids ?? [];
  const addIds = (roots ?? []).map((r) => r.id);
  const next = [...new Set([...current, ...addIds])];

  console.log(
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        add: roots,
        before: current,
        after: next,
      },
      null,
      2,
    ),
  );

  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  const { error: updErr } = await sb
    .from("ccshau_site_settings")
    .update({ faculty_people_public_college_ids: next })
    .eq("id", settings.id);
  if (updErr) throw new Error(updErr.message);

  console.log("Public faculty-people flag enabled.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
