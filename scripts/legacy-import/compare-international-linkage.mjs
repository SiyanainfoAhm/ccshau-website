/**
 * Compare legacy vs local international-linkage content.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const liveHtml = await (
  await fetch("https://hau.ac.in/page/international-linkage")
).text();

const section =
  liveHtml.match(
    /<section[^>]*class="[^"]*flagships[^"]*tieups[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
  )?.[1] || "";

const liveCards = [];
for (const block of section.split(/<div class="col-xs-12 col-sm-3">/i).slice(1)) {
  const href = block.match(
    /href="(https?:\/\/hau\.ac\.in\/international-tieup\/([^"/]+))"/i,
  );
  if (!href) continue;
  liveCards.push({
    slug: href[2],
    href: href[1],
    img: block.match(
      /src="(https?:\/\/hau\.ac\.in\/storage\/app\/uploads\/tieups\/[^"]+)"/i,
    )?.[1],
    date: decode(block.match(/Datetitle[^>]*>([^<]+)</i)?.[1]),
    titleTrunc: decode(
      block.match(/card-title[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1],
    ),
    excerpt: decode(
      block.match(/card-content[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
    ),
  });
}

// dedupe
const by = new Map();
for (const c of liveCards) if (!by.has(c.slug)) by.set(c.slug, c);
const unique = [...by.values()];

for (const c of unique) {
  const d = await (await fetch(c.href)).text();
  c.fullTitle = decode(
    d.match(/<h3[^>]*>\s*(Memorandum[\s\S]*?)<\/h3>/i)?.[1],
  );
  c.detailExcerpt = decode(
    d.match(
      /<h3[^>]*>\s*Memorandum[\s\S]*?<\/h3>\s*(?:<p[^>]*>\s*)?(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)/i,
    )?.[1],
  );
}

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: local } = await sb
  .from("ccshau_pages")
  .select("id,slug,content_en,excerpt_en,title_en")
  .eq("slug", "international-linkage")
  .maybeSingle();

const html = local?.content_en || "";
const localSlugs = [...html.matchAll(/id="(mous-[^"]+)"/g)].map((m) => m[1]);
const hasTable = /<table/i.test(html);
const hasBand = /intl-linkage-band/i.test(html);
const titleMatches = [
  ...html.matchAll(/intl-linkage-card__title[^>]*>([^<]+)/g),
].map((m) => decode(m[1]));
const orgMentions = [
  "Washington State University",
  "Tokyo University of Agriculture",
  "James Hutton Institute",
  "Agriculture and Forestry University",
  "Western Sydney",
  "Massey",
  "Poland",
  "Tanzania",
  "Czech",
  "Warsaw",
].map((k) => ({ key: k, inLocal: html.includes(k), inLiveListing: unique.some((c) => (c.fullTitle || "").includes(k) || (c.slug || "").includes(k.toLowerCase().slice(0, 4))) }));

const report = {
  liveCardCount: unique.length,
  liveCards: unique,
  local: {
    id: local?.id,
    excerpt: local?.excerpt_en,
    contentLen: html.length,
    localSlugs,
    cardTitles: titleMatches,
    hasTable,
    hasBand,
    hasExtraMouTableOrgs: ["Western Sydney", "Massey", "Tanzania", "Czech"].filter(
      (k) => html.includes(k),
    ),
  },
  orgMentions,
  mismatchNotes: [
    hasTable
      ? "LOCAL has MoU HTML table not present on legacy listing page"
      : null,
    localSlugs.length !== unique.length
      ? `card count local=${localSlugs.length} live=${unique.length}`
      : null,
  ].filter(Boolean),
};

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(
  join(REPORT_DIR, "compare-international-linkage.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
