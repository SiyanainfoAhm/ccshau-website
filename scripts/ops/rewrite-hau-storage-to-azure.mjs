#!/usr/bin/env node
/**
 * Rewrite legacy hau.ac.in storage URLs → Azure blob for a college's pages.
 *
 * Usage:
 *   node scripts/ops/rewrite-hau-storage-to-azure.mjs --college=krishi-vigyan-kendra-yamunanagar
 *   node scripts/ops/rewrite-hau-storage-to-azure.mjs --college=krishi-vigyan-kendra-yamunanagar --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const collegeSlug = process.argv.find((a) => a.startsWith("--college="))?.split("=")[1];
if (!collegeSlug) {
  console.error("Pass --college=<slug>");
  process.exit(1);
}

const AZURE = "https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage";

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

function rewrite(html) {
  if (!html) return { html, count: 0 };
  let count = 0;
  const out = html.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^"'?\s>#]+)/gi,
    (_m, file) => {
      count++;
      return `${AZURE}/${file}`;
    },
  );
  return { html: out, count };
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", collegeSlug).maybeSingle();
if (!college) throw new Error(`Not found: ${collegeSlug}`);

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, content_en, content_hi")
  .eq("college_root_id", college.id)
  .eq("status", "published");

let pagesTouched = 0;
let urlCount = 0;

for (const page of pages ?? []) {
  const en = rewrite(page.content_en);
  const hi = rewrite(page.content_hi);
  if (!en.count && !hi.count) continue;
  pagesTouched++;
  urlCount += en.count + hi.count;
  console.log(`  ${page.slug}: en=${en.count} hi=${hi.count}`);
  if (APPLY) {
    const patch = {};
    if (en.count) patch.content_en = en.html;
    if (hi.count) patch.content_hi = hi.html;
    const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
  }

  // Keep local curated HI in sync when present
  const hiFile = join(ROOT, "Documents", `hindi-${collegeSlug}`, `${page.slug}-hi.html`);
  if (existsSync(hiFile) && hi.count) {
    const local = rewrite(readFileSync(hiFile, "utf8"));
    if (local.count && APPLY) writeFileSync(hiFile, local.html, "utf8");
  }
}

console.log(
  `${collegeSlug}: pages=${pagesTouched} urls=${urlCount} | ${APPLY ? "APPLY" : "dry-run"}`,
);
if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
