#!/usr/bin/env node
/**
 * Phase 3 — Apply Hindi about/content for Regional Research Station Karnal.
 *
 * Usage:
 *   node scripts/ops/apply-rrs-karnal-phase3-about.mjs
 *   node scripts/ops/apply-rrs-karnal-phase3-about.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari, translateAboutHtmlPhrase } from "./department-hindi-shared.mjs";
import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG = "regional-research-station-karnal";
const HI_DIR = join(ROOT, "Documents/hindi-rrs-karnal");
const PAGE_TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI };

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

function isMixed(t) {
  return hasDevanagari(t) && /[A-Za-z]/.test(t ?? "");
}
function needsContent(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim() || !hasDevanagari(hi)) return true;
  if (isMixed(hi)) return true;
  return false;
}

function readHiFile(slug) {
  const hiFile = join(HI_DIR, `${slug}-hi.html`);
  if (!existsSync(hiFile)) return null;
  const text = readFileSync(hiFile, "utf8").trim();
  return hasDevanagari(text) ? text : null;
}

function translateLegacyPdfHtml(html, titleEn) {
  const m = html.match(
    /Legacy document <code>([^<]+)<\/code> — pending Phase 4 upload \(<code>([^<]+)<\/code>\)\./,
  );
  if (!m) return null;
  const body = html.replace(/<hr\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
  if (body.length > 400) return null;
  const titleMatch = html.match(/<strong>([^<]+)<\/strong>/);
  const titleHi = PAGE_TITLE_HI[titleEn?.trim()] ?? PAGE_TITLE_HI[titleMatch?.[1]?.trim()] ?? null;
  const titleBlock = titleHi
    ? `<p><strong>${titleHi}</strong></p>`
    : titleMatch
      ? `<p><strong>${titleMatch[1]}</strong></p>`
      : "";
  return `${titleBlock}<p>दस्तावेज़ <code>${m[1]}</code> शीघ्र उपलब्ध कराया जाएगा (<code>${m[2]}</code>)।</p>`;
}

function resolveContentHi(slug, contentEn, titleEn) {
  const curated = readHiFile(slug);
  if (curated) return { html: curated, source: "file" };
  const pdfHi = translateLegacyPdfHtml(contentEn, titleEn);
  if (pdfHi) return { html: pdfHi, source: "pdf-placeholder" };
  const phrase = translateAboutHtmlPhrase(contentEn);
  if (phrase && hasDevanagari(phrase)) return { html: phrase, source: "phrase" };
  return { html: null, source: "failed" };
}

const { data: college } = await supabase.from("ccshau_pages").select("id").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error("RRS Karnal not found");

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, content_en, content_hi")
  .eq("college_root_id", college.id)
  .eq("status", "published")
  .order("slug");

let updated = 0;
const sourceCounts = {};
const plans = [];

for (const page of pages ?? []) {
  if (!needsContent(page.content_en, page.content_hi)) continue;
  const { html, source } = resolveContentHi(page.slug, page.content_en, page.title_en);
  sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
  plans.push({ slug: page.slug, source, mixed_before: isMixed(page.content_hi) });
  if (!html) {
    console.warn(`  SKIP ${page.slug} — no Hindi resolved`);
    continue;
  }
  if (page.content_hi?.trim() === html.trim()) continue;
  if (APPLY) {
    const { error } = await supabase.from("ccshau_pages").update({ content_hi: html }).eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
    updated++;
  }
}

console.log(`Phase 3 RRS Karnal: ${plans.length} page(s) | Updated: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
console.log("Sources:", sourceCounts);
for (const p of plans) console.log(`  ${p.slug}${p.mixed_before ? " [was MIXED]" : ""} ← ${p.source}`);
if (!APPLY) console.log("\nDry-run only. Pass --apply to write.");
