#!/usr/bin/env node
/**
 * Add College Magazine under College of Agriculture, Hisar.
 * Books are the Haryana Kheti covers: image opens the PDF, and the HTML
 * can be edited in Admin to change the cover image or PDF link.
 *
 *   node scripts/ops/add-hisar-college-magazine.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");
const SLUG = "hisar-college-magazine";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const eq = t.indexOf("=");
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

function booksOnly(html) {
  return String(html || "")
    .replace(/<h2\b[^>]*>[\s\S]*?<\/h2>\s*/i, "")
    .trim();
}

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: source, error: sourceError } = await supabase
  .from("ccshau_pages")
  .select("content_en, content_hi")
  .eq("slug", "haryanakheti")
  .single();
if (sourceError) throw sourceError;

const contentEn = booksOnly(source.content_en);
const contentHi = booksOnly(source.content_hi);
const bookCount = (contentEn.match(/<img\b/g) || []).length;
if (bookCount < 1 || !contentEn.includes("Open PDF") || !contentHi.includes("पीडीएफ खोलें")) {
  throw new Error("Haryana Kheti book cards were not found");
}

const { data: college, error: collegeError } = await supabase
  .from("ccshau_pages")
  .select("id")
  .eq("slug", "college-of-agriculture-hisar")
  .eq("status", "published")
  .single();
if (collegeError) throw collegeError;

const layout = {
  hero: false,
  heroContactButton: false,
  headOfficer: false,
  contacts: false,
  staff: false,
  gallery: false,
  newsTicker: false,
  studentCorner: false,
  mainContent: true,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  showInDepartmentsMenu: false,
  farmersCta: false,
};

const row = {
  slug: SLUG,
  title_en: "College Magazine",
  title_hi: "महाविद्यालय पत्रिका",
  excerpt_en: null,
  excerpt_hi: null,
  content_en: contentEn,
  content_hi: contentHi,
  parent_id: college.id,
  college_root_id: college.id,
  page_type: "standard",
  layout_template: "standard",
  layout_config: layout,
  status: "published",
  published_at: new Date().toISOString(),
  sort_order: 1,
};

console.log(JSON.stringify({ slug: SLUG, books: bookCount, mode: APPLY ? "APPLY" : "dry-run" }));
if (!APPLY) process.exit(0);

const { data: existing, error: existingError } = await supabase
  .from("ccshau_pages")
  .select("id")
  .eq("slug", SLUG)
  .maybeSingle();
if (existingError) throw existingError;

if (existing) {
  const { error } = await supabase
    .from("ccshau_pages")
    .update({
      title_en: row.title_en,
      title_hi: row.title_hi,
      content_en: row.content_en,
      content_hi: row.content_hi,
      parent_id: row.parent_id,
      college_root_id: row.college_root_id,
      layout_config: row.layout_config,
      sort_order: row.sort_order,
      status: "published",
    })
    .eq("id", existing.id);
  if (error) throw error;
  console.log("updated", existing.id);
} else {
  const { data, error } = await supabase.from("ccshau_pages").insert(row).select("id").single();
  if (error) throw error;
  console.log("created", data.id);
}
