/**
 * Probe legacy international-linkage + local Supabase page.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const liveHtml = await (
  await fetch("https://hau.ac.in/page/international-linkage")
).text();

const cards = [];
// Card blocks: date + title + optional link/image
const cardRe =
  /<(?:div|article|li)[^>]*class="[^"]*(?:news|card|mou|item|col-)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|li)>/gi;
let m;
const seen = new Set();

// Broader scrape: look for PDF/image links near titles
const pdfLinks = [
  ...liveHtml.matchAll(
    /href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  ),
].map((x) => ({ href: x[1], label: decode(x[2].replace(/<[^>]+>/g, " ")) }));

const imgLinks = [
  ...liveHtml.matchAll(
    /src=["'](https?:\/\/(?:www\.)?hau\.ac\.in\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi,
  ),
].map((x) => x[1]);

// Parse structured cards from common HAU listing markup
const blockRe =
  /<h4[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h4>/gi;
while ((m = blockRe.exec(liveHtml))) {
  const href = m[1];
  const title = decode(m[2].replace(/<[^>]+>/g, " "));
  const key = `${href}|${title}`;
  if (seen.has(key)) continue;
  seen.add(key);
  cards.push({ href, title });
}

// Also try date + heading pattern from search snippet
const dateTitleRe =
  /(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*\d{4})[\s\S]{0,200}?<(?:h[34]|a)[^>]*>([\s\S]*?Memorandum[\s\S]*?)<\/(?:h[34]|a)>/gi;
const dated = [];
while ((m = dateTitleRe.exec(liveHtml))) {
  dated.push({ date: decode(m[1]), title: decode(m[2].replace(/<[^>]+>/g, " ")) });
}

const pageData = await (
  await fetch("https://hau.ac.in/page-data/international-linkage/0")
).text();
let pageJson = null;
try {
  pageJson = pageData && pageData !== "null" ? JSON.parse(pageData) : null;
} catch {
  pageJson = null;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: local } = await sb
  .from("ccshau_pages")
  .select(
    "id,slug,title_en,status,page_type,layout_template,content_en,excerpt_en,featured_image_path,layout_config",
  )
  .eq("slug", "international-linkage")
  .maybeSingle();

const report = {
  liveLen: liveHtml.length,
  cards,
  dated,
  pdfLinks: pdfLinks.slice(0, 30),
  imgSample: imgLinks.slice(0, 20),
  pageData: pageJson
    ? {
        title: pageJson.page_title,
        contentLen: (pageJson.page_content || "").length,
        file: pageJson.file || null,
        preview: String(pageJson.page_content || "")
          .replace(/\s+/g, " ")
          .slice(0, 300),
      }
    : null,
  local: local
    ? {
        ...local,
        contentLen: (local.content_en || "").length,
        contentPreview: String(local.content_en || "")
          .replace(/\s+/g, " ")
          .slice(0, 200),
      }
    : null,
};

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(
  join(REPORT_DIR, "probe-international-linkage.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
