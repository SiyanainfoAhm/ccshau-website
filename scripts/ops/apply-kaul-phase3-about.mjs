#!/usr/bin/env node
/**
 * Phase 3 — Apply curated Hindi about HTML for Kaul pages.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const ABOUT_DIR = join(ROOT, "Documents/hindi-departments-about");

const SLUGS = [
  "kaul-agriculture-college",
  "college-of-agriculture-kaul",
  "kaul-department",
];

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

function hasLatin(t) {
  return /[A-Za-z]/.test(t ?? "");
}
function hasDevanagari(t) {
  return /[\u0900-\u097F]/.test(t ?? "");
}

const plans = [];
for (const slug of SLUGS) {
  const hiFile = join(ABOUT_DIR, `${slug}-hi.html`);
  if (!existsSync(hiFile)) {
    console.warn(`Missing: ${hiFile}`);
    continue;
  }
  const contentHi = readFileSync(hiFile, "utf8").trim();
  const { data: page } = await supabase
    .from("ccshau_pages")
    .select("id, slug, content_hi")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) continue;
  if (page.content_hi === contentHi) continue;
  plans.push({
    slug,
    id: page.id,
    mixed_before: hasDevanagari(page.content_hi) && hasLatin(page.content_hi),
    preview: contentHi.replace(/<[^>]+>/g, " ").slice(0, 80),
  });
  if (APPLY) {
    await supabase.from("ccshau_pages").update({ content_hi: contentHi }).eq("id", page.id);
  }
}

console.log(`Phase 3 about: ${plans.length} page(s) | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) {
  console.log(`  ${p.slug}${p.mixed_before ? " [was MIXED]" : ""}`);
  console.log(`    ${p.preview}...`);
}
