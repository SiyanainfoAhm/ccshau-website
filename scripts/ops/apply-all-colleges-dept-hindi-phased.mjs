#!/usr/bin/env node
/**
 * Run phased department Hindi for ALL colleges/directorates, one microsite at a time.
 *
 * Usage:
 *   node scripts/ops/apply-all-colleges-dept-hindi-phased.mjs --apply
 *   node scripts/ops/apply-all-colleges-dept-hindi-phased.mjs --apply --phase=sidebar,titles
 *   node scripts/ops/apply-all-colleges-dept-hindi-phased.mjs --apply --phase=about
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { processCollegePhased } from "./apply-college-dept-hindi-phased.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const skipSet = new Set(
  (process.argv.find((a) => a.startsWith("--skip="))?.split("=")[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const onlySet = new Set(
  (process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const phaseArg = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1];
const phases =
  phaseArg === "all" || !phaseArg
    ? ["sidebar", "titles", "about", "faculty"]
    : phaseArg.split(",").map((p) => p.trim());

const INCLUDE_DONE = process.argv.includes("--include-done");
const DEFAULT_SKIP = new Set(
  INCLUDE_DONE
    ? []
    : [
        "college-of-agriculture-hisar",
        "college-of-fisheries-science",
        "college-basic-sciences-humanities",
        "college-of-agriculture-bawal",
      ],
);

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: all } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, college_root_id")
    .eq("page_type", "college")
    .eq("status", "published");
  let roots = (all ?? []).filter((p) => p.college_root_id === p.id).sort((a, b) => a.slug.localeCompare(b.slug));

  if (onlySet.size) roots = roots.filter((r) => onlySet.has(r.slug));
  else roots = roots.filter((r) => !DEFAULT_SKIP.has(r.slug) && !skipSet.has(r.slug));

  console.log(`Microsites: ${roots.length} | phases: ${phases.join(", ")} | ${APPLY ? "APPLY" : "dry-run"}`);

  const log = [];
  let totals = { sidebar: 0, titles: 0, about: 0, faculty: 0 };
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < roots.length; i++) {
    const r = roots[i];
    console.log(`\n[${i + 1}/${roots.length}]`);
    try {
      const stats = await processCollegePhased(supabase, r.slug, { apply: APPLY, phases });
      for (const k of Object.keys(totals)) totals[k] += stats[k];
      log.push({ slug: r.slug, status: "ok", stats });
      ok++;
    } catch (e) {
      console.error(`FAILED ${r.slug}:`, e.message);
      log.push({ slug: r.slug, status: "fail", error: e.message });
      fail++;
    }
  }

  writeFileSync(
    join(__dirname, "_all-colleges-dept-hindi-log.json"),
    JSON.stringify({ ok, fail, totals, log }, null, 2),
  );
  console.log(`\nDone. ok=${ok} fail=${fail}`);
  console.log(`Totals: sidebar=${totals.sidebar} titles=${totals.titles} about=${totals.about} faculty=${totals.faculty}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
