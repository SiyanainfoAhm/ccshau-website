/**
 * Deep-probe international-linkage cards + detail pages.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, "reports");

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const liveHtml = await (
  await fetch("https://hau.ac.in/page/international-linkage")
).text();

// Extract cards from listing: image in tieups + link to international-tieup
const parts = liveHtml.split(/class="col-md-[^"]*"/i).slice(1);
const cards = [];
for (const part of parts) {
  const href = part.match(
    /href="(https?:\/\/hau\.ac\.in\/international-tieup\/[^"]+)"/i,
  )?.[1];
  const img = part.match(
    /src="(https?:\/\/hau\.ac\.in\/storage\/app\/uploads\/tieups\/[^"]+)"/i,
  )?.[1];
  const date =
    part.match(
      /(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*\d{4})/i,
    )?.[1] || null;
  const title = part.match(/<h4[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1];
  const excerpt = part.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!href) continue;
  cards.push({
    href,
    slug: href.split("/").pop(),
    img,
    date: date ? decode(date) : null,
    title: decode(title),
    excerpt: decode(excerpt),
  });
}

// Dedup by slug
const bySlug = new Map();
for (const c of cards) {
  if (!bySlug.has(c.slug)) bySlug.set(c.slug, c);
}
const unique = [...bySlug.values()];

for (const c of unique) {
  const html = await (await fetch(c.href)).text();
  const h1 =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
  const detailImg = html.match(
    /src="(https?:\/\/hau\.ac\.in\/storage\/app\/uploads\/tieups\/[^"]+)"/i,
  )?.[1];
  const bodyMatch = html.match(
    /<(?:div|section)[^>]*(?:content|detail|description|news-detail)[^>]*>([\s\S]{200,8000}?)<\/(?:div|section)>/i,
  );
  const pdfs = [
    ...html.matchAll(/href="(https?:\/\/hau\.ac\.in\/[^"]+\.pdf[^"]*)"/gi),
  ].map((m) => m[1]);
  c.fullTitle = decode(h1) || c.title;
  c.detailImg = detailImg || c.img;
  c.pdfs = [...new Set(pdfs)].slice(0, 10);
  c.detailSnippet = decode(bodyMatch?.[1] || "").slice(0, 400);
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "probe-international-linkage-cards.json");
writeFileSync(out, JSON.stringify({ count: unique.length, cards: unique }, null, 2));
console.log(JSON.stringify({ count: unique.length, cards: unique }, null, 2));
console.log("wrote", out);
