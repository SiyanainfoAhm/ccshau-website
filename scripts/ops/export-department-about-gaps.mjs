import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (!/[\u0900-\u097F]/.test(hi)) return true;
  if (/\?{3,}/.test(hi)) return true;
  return false;
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const { data: college } = await supabase
  .from("ccshau_pages")
  .select("id")
  .eq("slug", "college-of-agriculture-hisar")
  .eq("page_type", "college")
  .single();

const { data: pages } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_en, title_hi, content_en, content_hi, page_type, layout_template")
  .eq("college_root_id", college.id)
  .eq("status", "published")
  .order("slug");

const deptPages = (pages ?? []).filter(
  (p) =>
    p.slug?.startsWith("hisar-") &&
    p.content_en?.trim() &&
    needsHi(p.content_en, p.content_hi),
);

const outDir = join(ROOT, "Documents/hindi-departments-about");
mkdirSync(outDir, { recursive: true });

const report = [];
for (const p of deptPages) {
  const plain = stripHtml(p.content_en);
  const preview = plain.slice(0, 200);
  report.push({
    id: p.id,
    slug: p.slug,
    title_en: p.title_en,
    title_hi: p.title_hi,
    en_chars: p.content_en.length,
    hi_chars: p.content_hi?.length ?? 0,
    preview,
  });
  writeFileSync(join(outDir, `${p.slug}-en.html`), p.content_en, "utf8");
}

writeFileSync(join(outDir, "pending.json"), JSON.stringify({ exported_at: new Date().toISOString(), count: report.length, departments: report }, null, 2));
console.log(`Departments needing content_hi: ${report.length}`);
for (const r of report) {
  console.log(`- ${r.slug} (${r.title_en}) en=${r.en_chars} hi=${r.hi_chars}`);
  console.log(`  ${r.preview.slice(0, 120)}...`);
}
