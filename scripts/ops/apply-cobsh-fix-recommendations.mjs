#!/usr/bin/env node
/**
 * COBSH follow-up: fix 5 content gaps + re-apply curated dept about + sidebar sync.
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-fix-recommendations.mjs
 *   node scripts/ops/apply-cobsh-fix-recommendations.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { hasDevanagari } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "college-basic-sciences-humanities";
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");
const COBSH_DIR = join(ROOT, "Documents/hindi-cobsh");

const GAP_SLUGS = [
  "advisory-committee",
  "mites-database",
  "software-developed",
  "thrust-arear",
  "thurst-areas-of-research",
];

const CBS_SLUGS = [
  "cbs-biochemistry",
  "cbs-botany-plant-physiology",
  "cbs-chemistry",
  "cbs-computer-section",
  "cbs-languages-haryanvi-culture",
  "cbs-mathematics-statistics",
  "cbs-microbiology",
  "cbs-physics",
  "cbs-sociology",
  "cbs-zoology",
];

const ALIAS_HI = {
  "about-us-4": "cbs-microbiology",
  "about-us-5": "cbs-sociology",
};

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
  auth: { persistSession: false },
});

function readHi(slug) {
  for (const dir of [COBSH_DIR, ABOUT_DIR]) {
    const p = join(dir, `${slug}-hi.html`);
    if (existsSync(p)) {
      const t = readFileSync(p, "utf8").trim();
      if (hasDevanagari(t)) return t;
    }
  }
  return null;
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("College not found");

const plans = [];

async function planUpdate(slug, html, source) {
  const { data: page } = await supabase
    .from("ccshau_pages")
    .select("id, slug, content_hi")
    .eq("college_root_id", college.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!page || !html) return;
  if (page.content_hi?.trim() === html.trim()) return;
  plans.push({ slug, source, len: html.length });
  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update({ content_hi: html }).eq("id", page.id);
    if (error) throw new Error(`${slug}: ${error.message}`);
  }
}

for (const slug of GAP_SLUGS) {
  await planUpdate(slug, readHi(slug), "gap-file");
}

for (const slug of CBS_SLUGS) {
  await planUpdate(slug, readHi(slug), "dept-about-file");
}

for (const [slug, src] of Object.entries(ALIAS_HI)) {
  await planUpdate(slug, readHi(src), `alias:${src}`);
}

console.log(`COBSH fix recommendations: ${plans.length} page(s) | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) console.log(`  ${p.slug} ← ${p.source} (${p.len} chars)`);

if (APPLY && plans.length) {
  console.log("\nSyncing sidebar content_hi…");
  const r = spawnSync(
    process.execPath,
    ["scripts/ops/apply-college-sidebar-content-hi.mjs", `--college=${COLLEGE_SLUG}`, "--apply"],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!APPLY && plans.length) console.log("\nDry-run only. Pass --apply to write.");
