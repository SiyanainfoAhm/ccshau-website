#!/usr/bin/env node
/**
 * Sync ccshau_pages.content_hi → ccshau_page_sidebar_items.content_hi for any college.
 *
 * Usage:
 *   node scripts/ops/apply-college-sidebar-content-hi.mjs --college=college-of-fisheries-science
 *   node scripts/ops/apply-college-sidebar-content-hi.mjs --college=college-of-fisheries-science --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const COLLEGE_SLUG =
  process.argv.find((a) => a.startsWith("--college="))?.split("=")[1] ??
  "college-of-fisheries-science";

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

function normHtml(html) {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const { data: college } = await supabase.from("ccshau_pages").select("id, title_en").eq("slug", COLLEGE_SLUG).maybeSingle();
if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, title_hi, content_en, content_hi, layout_template")
  .eq("college_root_id", college.id)
  .eq("status", "published");

const pageById = new Map((pages ?? []).map((p) => [p.id, p]));
const pageByContent = new Map();
const pageByTitleEn = new Map();
for (const p of pages ?? []) {
  const key = normHtml(p.content_en);
  if (key) pageByContent.set(key, p);
  if (p.title_en?.trim()) pageByTitleEn.set(p.title_en.trim().toLowerCase(), p);
}

const { data: depts } = await supabase
  .from("ccshau_pages")
  .select("id, slug")
  .eq("college_root_id", college.id)
  .eq("layout_template", "office_portal");

const deptIds = (depts ?? []).map((d) => d.id);
if (!deptIds.length) {
  console.log("No office_portal dept pages found.");
  process.exit(0);
}

const { data: items } = await supabase
  .from("ccshau_page_sidebar_items")
  .select("id, page_id, label_en, label_hi, content_en, content_hi, linked_page_id")
  .in("page_id", deptIds)
  .eq("is_active", true);

let updated = 0;
const plans = [];

for (const item of items ?? []) {
  if (!item.content_en?.trim()) continue;
  const alreadyHi = hasDevanagari(item.content_hi);
  if (alreadyHi && normHtml(item.content_hi).length > normHtml(item.content_en).length * 0.5) continue;

  let hi = null;
  let source = "";

  const contentKey = normHtml(item.content_en);
  const matchedPage = pageByContent.get(contentKey);
  if (matchedPage?.content_hi?.trim() && hasDevanagari(matchedPage.content_hi)) {
    hi = matchedPage.content_hi.trim();
    source = `page:${matchedPage.slug}`;
  }

  if (!hi && item.linked_page_id) {
    const linked = pageById.get(item.linked_page_id);
    if (linked?.content_hi?.trim() && hasDevanagari(linked.content_hi)) {
      hi = linked.content_hi.trim();
      source = `linked:${linked.slug}`;
    }
  }

  if (!hi && item.label_en?.trim()) {
    const byLabel = pageByTitleEn.get(item.label_en.trim().toLowerCase());
    if (byLabel?.content_hi?.trim() && hasDevanagari(byLabel.content_hi)) {
      hi = byLabel.content_hi.trim();
      source = `title:${byLabel.slug}`;
    }
  }

  if (!hi && item.label_hi?.trim()) {
    const byLabelHi = (pages ?? []).find((p) => p.title_hi?.trim() === item.label_hi.trim());
    if (byLabelHi?.content_hi?.trim() && hasDevanagari(byLabelHi.content_hi)) {
      hi = byLabelHi.content_hi.trim();
      source = `label_hi:${byLabelHi.slug}`;
    }
  }

  if (!hi || !hasDevanagari(hi)) {
    console.warn(`  SKIP ${item.label_hi ?? item.label_en} — no Hindi`);
    continue;
  }

  if (item.content_hi?.trim() === hi.trim()) continue;

  plans.push({ label: item.label_hi ?? item.label_en, dept: pageById.get(item.page_id)?.slug, source, preview: hi.replace(/<[^>]+>/g, " ").slice(0, 70) });

  if (APPLY) {
    const { error } = await supabase.from("ccshau_page_sidebar_items").update({ content_hi: hi }).eq("id", item.id);
    if (error) throw new Error(error.message);
    updated++;
  }
}

console.log(`${college.title_en} sidebar content_hi: ${plans.length} update(s) | Applied: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) {
  console.log(`  [${p.dept}] ${p.label} ← ${p.source}`);
  console.log(`    ${p.preview}...`);
}
