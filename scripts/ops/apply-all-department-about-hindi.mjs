#!/usr/bin/env node
/**
 * Apply Hindi content_hi for all department About pages from exported *-hi.html files.
 *
 * Usage:
 *   node scripts/ops/apply-all-department-about-hindi.mjs
 *   node scripts/ops/apply-all-department-about-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text ?? "");
}

async function main() {
  const hiFiles = readdirSync(ABOUT_DIR)
    .filter((f) => f.endsWith("-hi.html"))
    .sort();

  console.log(`Found ${hiFiles.length} Hindi about files`);

  const plans = [];
  for (const file of hiFiles) {
    const slug = file.replace(/-hi\.html$/, "");
    const contentHi = readFileSync(join(ABOUT_DIR, file), "utf8");
    if (!hasDevanagari(contentHi)) {
      console.warn(`  ⚠ Skip ${slug}: no Devanagari in hi file`);
      continue;
    }

    const { data: page, error } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, content_en, content_hi")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!page) {
      console.warn(`  ⚠ Page not found: ${slug}`);
      continue;
    }
    if (!page.content_en?.trim()) {
      console.warn(`  ⚠ No content_en: ${slug}`);
      continue;
    }

    plans.push({ id: page.id, slug, titleEn: page.title_en, contentHi, hiLen: contentHi.length });
  }

  console.log(`\nDepartments to update: ${plans.length}`);
  for (const p of plans) {
    console.log(`  - ${p.slug} (${p.titleEn}) → ${p.hiLen} chars`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  let updated = 0;
  for (const p of plans) {
    const { error: updErr } = await supabase
      .from("ccshau_pages")
      .update({ content_hi: p.contentHi })
      .eq("id", p.id);
    if (updErr) throw updErr;
    console.log(`  ✓ ${p.slug}`);
    updated++;
  }

  console.log(`\nUpdated ${updated} department about page(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
