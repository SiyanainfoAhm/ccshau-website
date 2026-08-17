/**
 * Phase 11 — Add every microsite root to faculty_people_public_college_ids.
 *
 * Usage:
 *   node enable-faculty-people-public-all.mjs
 *   node enable-faculty-people-public-all.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
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

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: pages, error: rootErr } = await sb
    .from("ccshau_pages")
    .select("id, slug, title_en, status, college_root_id")
    .eq("page_type", "college");
  if (rootErr) throw new Error(rootErr.message);

  const selfRoots = (pages ?? []).filter((p) => p.college_root_id === p.id);

  const { data: settings, error: settingsErr } = await sb
    .from("ccshau_site_settings")
    .select("id, faculty_people_public_college_ids")
    .limit(1)
    .maybeSingle();
  if (settingsErr) throw new Error(settingsErr.message);
  if (!settings) throw new Error("site_settings row missing");

  const current = settings.faculty_people_public_college_ids ?? [];
  const addIds = selfRoots.map((r) => r.id);
  const next = [...new Set([...current, ...addIds])];
  const added = addIds.filter((id) => !current.includes(id));
  const addedSlugs = selfRoots.filter((r) => added.includes(r.id)).map((r) => r.slug);

  const summary = {
    mode: CONFIRM ? "apply" : "dry-run",
    beforeCount: current.length,
    afterCount: next.length,
    addedCount: added.length,
    addedSlugs,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  const { error: updErr } = await sb
    .from("ccshau_site_settings")
    .update({ faculty_people_public_college_ids: next })
    .eq("id", settings.id);
  if (updErr) throw new Error(updErr.message);

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "phase11-public-flag-all.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), ...summary, dualWrite: "kept" }, null, 2),
  );
  console.log("Public faculty-people flag enabled for all microsite roots.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
