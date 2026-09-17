/**
 * Migrate https://hau.ac.in/page/international-linkage
 * onto /pages/international-linkage (card grid + keep MoU table).
 *
 * Usage:
 *   node apply-international-linkage.mjs --dry-run
 *   node apply-international-linkage.mjs --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CACHE_DIR = join(REPORT_DIR, "international-linkage-cache");
const PAGE_SLUG = "international-linkage";
const PAGE_ID = "e8fc1246-2a91-4669-91c7-7fed3646341f";
const LIVE_URL = "https://hau.ac.in/page/international-linkage";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = !CONFIRM;

const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");
const sanitizeHtml = requireFromWeb("sanitize-html");

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    }[e] || "application/octet-stream"
  );
}

function sanitizeFileName(name) {
  return String(name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

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

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseListingCards(html) {
  const section =
    html.match(
      /<section[^>]*class="[^"]*flagships[^"]*tieups[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    )?.[1] || html;
  const blocks = section.split(/<div class="col-xs-12 col-sm-3">/i).slice(1);
  const cards = [];
  const seen = new Set();
  for (const block of blocks) {
    const href = block.match(
      /href="(https?:\/\/hau\.ac\.in\/international-tieup\/([^"/]+))"/i,
    );
    if (!href) continue;
    const slug = href[2];
    if (seen.has(slug)) continue;
    seen.add(slug);
    const img = block.match(
      /src="(https?:\/\/hau\.ac\.in\/storage\/app\/uploads\/tieups\/[^"]+)"/i,
    )?.[1];
    const date = block.match(
      /Datetitle[^>]*>([^<]+)</i,
    )?.[1];
    const title = block.match(
      /card-title[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    )?.[1];
    const excerpt = block.match(
      /card-content[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
    )?.[1];
    cards.push({
      slug,
      legacyHref: href[1],
      img,
      date: decode(date),
      title: decode(title).replace(/\.{2,}$/, "").trim(),
      excerpt: decode(excerpt),
    });
  }
  return cards;
}

async function enrichFromDetail(card) {
  const html = await (await fetch(card.legacyHref)).text();
  const fullTitle = decode(
    html.match(
      /<h3[^>]*>\s*(Memorandum[\s\S]*?)<\/h3>/i,
    )?.[1] ||
      html.match(
        /International Linkage<\/h2>\s*<h3[^>]*>([\s\S]*?)<\/h3>/i,
      )?.[1] ||
      "",
  );
  const detailImg = html.match(
    /src="(https?:\/\/hau\.ac\.in\/storage\/app\/uploads\/tieups\/[^"]+)"/i,
  )?.[1];
  const afterTitle = html.match(
    /<h3[^>]*>\s*Memorandum[\s\S]*?<\/h3>\s*(?:<p[^>]*>\s*)?(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)/i,
  )?.[1];
  const detailExcerpt = decode(afterTitle || "");
  return {
    ...card,
    title: fullTitle || card.title,
    excerpt:
      detailExcerpt && !/choudhary|चौधरी/i.test(detailExcerpt)
        ? detailExcerpt
        : card.excerpt || "For Cooperation in Agricultural Research and Education",
    img: detailImg || card.img,
  };
}

async function ensureAzureImage(containerClient, imageUrl, slug) {
  if (!imageUrl) return null;
  const fileName = sanitizeFileName(basename(new URL(imageUrl).pathname));
  const blobPath = `pages/international-linkage/${slug}/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) return publicUrl;

  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${slug}-${fileName}`);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const r = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`image ${imageUrl}: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 100) throw new Error(`image too small ${imageUrl}`);
    await writeFile(cachePath, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
  });
  return publicUrl;
}

const PARTNER_BY_SLUG = {
  "mous-hisar-washington": "Washington State University, USA",
  "mous-hisar-tokyo": "Tokyo University of Agriculture, Japan",
  "mous-hisar-scoutland": "The James Hutton Institute, Scotland, UK",
  "mous-hisar-nepal": "Agriculture and Forestry University, Nepal",
};

function shortCardTitle(fullTitle, slug) {
  if (slug && PARTNER_BY_SLUG[slug]) return PARTNER_BY_SLUG[slug];
  const andMatch = String(fullTitle || "").match(
    /\band\s+(.+?)(?:,\s*(?:USA|Japan|UK|Nepal))?$/i,
  );
  if (andMatch?.[1]) return andMatch[1].trim();
  return String(fullTitle || "Memorandum of Understanding").trim();
}

function formatCardDate(date) {
  // Keep legacy "16Feb, 2019" format from live HTML
  return String(date || "").replace(/\s+/g, " ").trim();
}

function buildCardsHtml(cards) {
  const items = cards
    .map((c) => {
      const img = c.azureImg || c.img;
      const title = shortCardTitle(c.title, c.slug);
      const date = formatCardDate(c.date);
      const href = `/pages/${encodeURIComponent(c.slug)}`;
      return [
        `<article class="intl-linkage-card" id="${escapeHtml(c.slug)}">`,
        `<a class="intl-linkage-card__link" href="${href}">`,
        `<div class="intl-linkage-card__media">`,
        img
          ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(c.title)}" class="intl-linkage-card__image" loading="lazy" />`
          : "",
        date
          ? `<span class="intl-linkage-card__date">${escapeHtml(date)}</span>`
          : "",
        `</div>`,
        `<div class="intl-linkage-card__body">`,
        `<h2 class="intl-linkage-card__title" title="${escapeHtml(c.title)}">${escapeHtml(title)}</h2>`,
        `<p class="intl-linkage-card__excerpt">${escapeHtml(
          c.excerpt || "For Cooperation in Agricultural Research and Education",
        )}</p>`,
        `</div>`,
        `</a>`,
        `</article>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    `<section class="intl-linkage-band" aria-label="International Linkage">`,
    `<div class="intl-linkage-grid">`,
    items,
    `</div>`,
    `</section>`,
  ].join("\n");
}

function buildDetailHtml(card) {
  const img = card.azureImg || card.img;
  const purpose =
    card.excerpt || "For Cooperation in Agricultural Research and Education";
  const date = formatCardDate(card.date);
  return sanitizeHtml(
    [
      `<section class="intl-linkage-detail">`,
      img
        ? `<figure class="intl-linkage-detail__media"><img src="${escapeHtml(img)}" alt="${escapeHtml(card.title)}" class="intl-linkage-detail__image" loading="lazy" /></figure>`
        : "",
      date
        ? `<p class="intl-linkage-detail__meta">${escapeHtml(date)}</p>`
        : "",
      `<p class="intl-linkage-detail__purpose">${escapeHtml(purpose)}</p>`,
      `<p class="intl-linkage-detail__back"><a href="/pages/international-linkage">← Back to International Linkage</a></p>`,
      `</section>`,
    ]
      .filter(Boolean)
      .join("\n"),
    {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h2",
        "span",
        "div",
        "section",
        "figure",
        "p",
        "a",
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["class", "id"],
        a: ["href", "class", "title"],
        img: ["src", "alt", "class", "loading"],
      },
      allowedSchemes: ["http", "https"],
    },
  );
}

function buildPageHtml(cards) {
  return sanitizeHtml(buildCardsHtml(cards), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "h3",
      "span",
      "div",
      "section",
      "article",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class", "style", "id", "aria-label", "title"],
      a: ["href", "target", "rel", "class", "title"],
      img: ["src", "alt", "title", "width", "height", "class", "loading"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

async function main() {
  if (!CONFIRM && !process.argv.includes("--dry-run")) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const liveHtml = await (await fetch(LIVE_URL)).text();
  let cards = parseListingCards(liveHtml);
  if (!cards.length) throw new Error("No international-linkage cards found on live page");

  cards = await Promise.all(cards.map((c) => enrichFromDetail(c)));
  console.log(
    "cards:",
    cards.map((c) => `${c.slug} | ${c.title.slice(0, 60)}`),
  );

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: page, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id,slug,content_en,layout_config,excerpt_en")
    .eq("id", PAGE_ID)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page) throw new Error(`Missing page ${PAGE_SLUG}`);

  console.log("listing-only (no MoU table) — matches legacy page");

  const container = CONFIRM
    ? BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER)
    : null;

  for (const c of cards) {
    if (CONFIRM) {
      c.azureImg = await ensureAzureImage(container, c.img, c.slug);
    } else {
      c.azureImg = c.img;
    }
    console.log((CONFIRM ? "map" : "plan"), c.slug, "->", c.azureImg);
  }

  const contentEn = buildPageHtml(cards);
  console.log("content length", contentEn.length);

  mkdirSync(REPORT_DIR, { recursive: true });
  const report = {
    mode: CONFIRM ? "apply" : "dry-run",
    cards: cards.map((c) => ({
      slug: c.slug,
      title: c.title,
      date: c.date,
      excerpt: c.excerpt,
      azureImg: c.azureImg,
      detailPath: `/pages/${c.slug}`,
    })),
    contentLen: contentEn.length,
    preservedMouTable: false,
  };
  writeFileSync(
    join(REPORT_DIR, "apply-international-linkage.json"),
    JSON.stringify(report, null, 2),
  );

  if (!CONFIRM) {
    console.log("dry-run only; pass --confirm to write");
    return;
  }

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      title_en: "International Linkage",
      title_hi: "अंतरराष्ट्रीय संपर्क",
      excerpt_en: null,
      excerpt_hi: null,
      content_en: contentEn,
      status: "published",
      page_type: "standard",
      layout_template: "standard",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", PAGE_ID);
  if (error) throw new Error(error.message);

  for (const [i, c] of cards.entries()) {
    const detailHtml = buildDetailHtml(c);
    const payload = {
      slug: c.slug,
      title_en: c.title,
      title_hi: null,
      excerpt_en: c.excerpt,
      excerpt_hi: null,
      content_en: detailHtml,
      parent_id: PAGE_ID,
      status: "published",
      page_type: "standard",
      layout_template: "standard",
      sort_order: i + 1,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await sb
      .from("ccshau_pages")
      .select("id")
      .eq("slug", c.slug)
      .maybeSingle();
    if (existing?.id) {
      const { error: upErr } = await sb
        .from("ccshau_pages")
        .update(payload)
        .eq("id", existing.id);
      if (upErr) throw new Error(`${c.slug}: ${upErr.message}`);
      console.log("detail updated", c.slug);
    } else {
      const { error: insErr } = await sb.from("ccshau_pages").insert(payload);
      if (insErr) throw new Error(`${c.slug}: ${insErr.message}`);
      console.log("detail created", c.slug);
    }
  }

  console.log("updated", PAGE_SLUG, PAGE_ID);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
