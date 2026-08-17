/**
 * Phase 10 — Unpublish empty duplicate microsite roots (0 active staff).
 * Does not touch live KVKs, centres, DSW, or Directorate of Farms.
 *
 * Usage:
 *   node fix-phase10-empty-duplicate-shells.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");

const UNPUBLISH_SLUGS = [
  "ic-college-of-home-science",
  "basic-sciences-humanities",
];

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

  const { data: pages, error } = await sb
    .from("ccshau_pages")
    .select("id, slug, title_en, status, layout_template")
    .in("slug", UNPUBLISH_SLUGS)
    .eq("page_type", "college");
  if (error) throw new Error(error.message);

  const results = [];
  for (const page of pages ?? []) {
    const { count: staffCount } = await sb
      .from("ccshau_page_staff")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .in(
        "page_id",
        (
          await sb.from("ccshau_pages").select("id").eq("college_root_id", page.id)
        ).data?.map((p) => p.id) ?? [],
      );
    results.push({
      ...page,
      activeStaff: staffCount ?? 0,
      action: CONFIRM ? "unpublish" : "would_unpublish",
    });
  }

  console.log(JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", results }, null, 2));

  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to unpublish.");
    return;
  }

  for (const page of results) {
    if ((page.activeStaff ?? 0) > 0) {
      throw new Error(`${page.slug} still has active staff — aborting.`);
    }
    const { error: updErr } = await sb
      .from("ccshau_pages")
      .update({ status: "draft" })
      .eq("id", page.id)
      .eq("status", "published");
    if (updErr) throw new Error(updErr.message);
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "phase10-unpublished-duplicates.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), unpublished: results }, null, 2),
  );
  console.log("Unpublished empty duplicate shells.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
