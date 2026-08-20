/**
 * Migrate https://hau.ac.in/page/major-initiative
 * onto /pages/major-initiatives as a CMS card grid.
 *
 * Usage:
 *   node apply-major-initiatives.mjs --dry-run
 *   node apply-major-initiatives.mjs --confirm
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
const CACHE_DIR = join(REPORT_DIR, "major-initiatives-cache");
const PAGE_SLUG = "major-initiatives";
const PAGE_ID = "c6af751b-f67b-4618-bfab-5f4e16af2777";
const LIVE_URL = "https://hau.ac.in/page/major-initiative";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run") || !CONFIRM;

const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

/** Known full titles (live HTML truncates with …) */
const TITLE_OVERRIDES = {
  "sports-facilities": "Sports Facilities",
  "experiential-learning-programme": "Experiential Learning Programme",
  "deendayal-upadhyay-centre-of-excellence-for-organic-farming":
    "Deendayal Upadhyay Centre Of Excellence For Organic Farming",
  "agri-tourism-center": "Agri-tourism center",
};

const HINDI_TITLES = {
  "sports-facilities": "खेल सुविधाएँ",
  "experiential-learning-programme": "अनुभवात्मक अधिगम कार्यक्रम",
  "deendayal-upadhyay-centre-of-excellence-for-organic-farming":
    "दीनदयाल उपाध्याय उत्कृष्टता केंद्र (जैविक खेती)",
  "agri-tourism-center": "एग्री-टूरिज्म केंद्र",
};

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

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".JPG": "image/jpeg",
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

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collegeSlugFromHref(href) {
  try {
    const u = new URL(href, "https://hau.ac.in");
    const m = u.pathname.match(/^\/college\/([^/]+)/i);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

function parseInitiativeCards(html) {
  const cards = [];
  // Each card is a col-md-6 with ini-content
  const parts = html.split(/<div class="col-md-6"[^>]*>/i).slice(1);
  for (const part of parts) {
    const href =
      part.match(
        /ini-content[\s\S]*?<a[^>]*href="(https?:\/\/hau\.ac\.in\/college\/[^"]+)"/i,
      )?.[1] ||
      part.match(/href="(https?:\/\/hau\.ac\.in\/college\/[^"]+)"/i)?.[1];
    const img =
      part.match(/<img[^>]*src="([^"]+)"/i)?.[1] ||
      part.match(/src="(https?:\/\/hau\.ac\.in\/public\/images\/college\/banner\/[^"]+)"/i)?.[1];
    const titleRaw = part.match(/<h5>([\s\S]*?)<\/h5>/i)?.[1];
    const excerptRaw =
      part.match(/<h5>[\s\S]*?<\/h5>\s*<p>([\s\S]*?)<\/p>/i)?.[1] ||
      part.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    if (!href || !titleRaw) continue;
    const slug = collegeSlugFromHref(href);
    if (!slug) continue;
    // Prefer sports-facilities over accidental registrar-office pairing
    cards.push({
      legacyHref: href,
      slug,
      localHref: `/college/${slug}`,
      img: img?.startsWith("http") ? img : img ? `https://hau.ac.in${img}` : null,
      title: TITLE_OVERRIDES[slug] || stripHtml(titleRaw).replace(/\.{2,}$/, "").trim(),
      titleHi: HINDI_TITLES[slug] || null,
      excerpt: stripHtml(excerptRaw),
    });
  }

  // Deduplicate by slug, keep first good image
  const bySlug = new Map();
  for (const c of cards) {
    if (!bySlug.has(c.slug)) bySlug.set(c.slug, c);
  }
  // Force known order from live page
  const order = [
    "sports-facilities",
    "experiential-learning-programme",
    "deendayal-upadhyay-centre-of-excellence-for-organic-farming",
    "agri-tourism-center",
  ];
  return order
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .map((c, i) => ({ ...c, sort_order: i + 1 }));
}

async function ensureAzureImage(containerClient, imageUrl, slug) {
  if (!imageUrl) return null;
  const fileName = sanitizeFileName(basename(new URL(imageUrl).pathname));
  const blobPath = `pages/major-initiatives/${slug}/${fileName}`;
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
    const r = await fetch(imageUrl);
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

function buildPageHtml(cards) {
  const items = cards
    .map((c) => {
      const img = c.azureImg || c.img;
      return [
        `<article class="major-initiative-card">`,
        `<a href="${c.localHref}" class="major-initiative-card__link">`,
        img
          ? `<img src="${img}" alt="${c.title}" class="major-initiative-card__image" loading="lazy" />`
          : "",
        `<div class="major-initiative-card__body">`,
        `<h2 class="major-initiative-card__title">${c.title}</h2>`,
        c.excerpt ? `<p class="major-initiative-card__excerpt">${c.excerpt}</p>` : "",
        `</div>`,
        `</a>`,
        `</article>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    `<section class="major-initiatives-grid" aria-label="Major Initiatives">`,
    items,
    `</section>`,
  ].join("\n");
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
  let cards = parseInitiativeCards(liveHtml);
  if (cards.length < 4) {
    // Fallback to known live structure if parser misses sports image pairing
    const fallback = [
      {
        slug: "sports-facilities",
        localHref: "/college/sports-facilities",
        legacyHref: "https://hau.ac.in/college/sports-facilities",
        img: liveHtml.match(
          /sports-facilities[\s\S]{0,400}src="([^"]+)"|src="([^"]+)"[\s\S]{0,400}Sports Facilities/i,
        ),
        title: "Sports Facilities",
        titleHi: HINDI_TITLES["sports-facilities"],
        excerpt: "Sports and games play a very important roles in...",
        sort_order: 1,
      },
    ];
    // Prefer explicit scrape of banner images near titles
    const explicit = [];
    const explicitRe =
      /href="(https:\/\/hau\.ac\.in\/college\/(sports-facilities|experiential-learning-programme|deendayal-upadhyay-centre-of-excellence-for-organic-farming|agri-tourism-center))"[^>]*>\s*<h5>([\s\S]*?)<\/h5>\s*<p>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = explicitRe.exec(liveHtml)) !== null) {
      const slug = m[2];
      // Find nearest college banner image before this href in the same card
      const before = liveHtml.slice(Math.max(0, m.index - 800), m.index);
      const img =
        before.match(/src="(https:\/\/hau\.ac\.in\/public\/images\/college\/banner\/[^"]+)"/i)?.[1] ||
        before.match(/src="(\/public\/images\/college\/banner\/[^"]+)"/i)?.[1];
      explicit.push({
        slug,
        localHref: `/college/${slug}`,
        legacyHref: m[1],
        img: img?.startsWith("http") ? img : img ? `https://hau.ac.in${img}` : null,
        title: TITLE_OVERRIDES[slug] || stripHtml(m[3]),
        titleHi: HINDI_TITLES[slug] || null,
        excerpt: stripHtml(m[4]),
        sort_order: explicit.length + 1,
      });
    }
    if (explicit.length >= cards.length) cards = explicit;
    void fallback;
  }

  if (cards.length < 1) throw new Error("No initiative cards parsed from live page");

  // Fix sports if wrong slug slipped in
  cards = cards.map((c) => {
    if (c.title.toLowerCase().includes("sports") && c.slug !== "sports-facilities") {
      return {
        ...c,
        slug: "sports-facilities",
        localHref: "/college/sports-facilities",
        legacyHref: "https://hau.ac.in/college/sports-facilities",
        title: "Sports Facilities",
        titleHi: HINDI_TITLES["sports-facilities"],
      };
    }
    return c;
  });

  console.log(DRY_RUN ? "dry-run" : "apply", "major-initiatives");
  for (const c of cards) {
    console.log(`- ${c.title} -> ${c.localHref} | img=${Boolean(c.img)}`);
  }

  let containerClient = null;
  if (CONFIRM) {
    containerClient = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
    for (const c of cards) {
      if (!c.img) continue;
      c.azureImg = await ensureAzureImage(containerClient, c.img, c.slug);
      console.log("  azure", c.slug, c.azureImg);
    }
  }

  const contentEn = buildPageHtml(cards);
  const featured =
    cards[0]?.azureImg ||
    cards[0]?.img ||
    null;

  if (CONFIRM) {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await sb
      .from("ccshau_pages")
      .update({
        title_en: "Major Initiatives",
        title_hi: "प्रमुख पहल",
        excerpt_en: "Major university initiatives at CCS HAU Hisar.",
        excerpt_hi: "सीसीएस एचएयू हिसार की प्रमुख विश्वविद्यालय पहलें।",
        content_en: contentEn,
        content_hi: null,
        page_type: "standard",
        layout_template: "standard",
        layout_config: {
          hero: true,
          mainContent: true,
          headOfficer: false,
          contacts: false,
          staff: false,
          gallery: false,
          newsTicker: false,
          leftSidebar: false,
          rightSidebar: false,
          farmersCta: false,
          collegeTopMenu: false,
        },
        featured_image_path: featured,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", PAGE_ID);
    if (error) throw new Error(error.message);
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-major-initiatives.json");
  writeFileSync(
    out,
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        pageId: PAGE_ID,
        slug: PAGE_SLUG,
        cards: cards.map((c) => ({
          title: c.title,
          slug: c.slug,
          localHref: c.localHref,
          img: c.azureImg || c.img,
        })),
        contentLen: contentEn.length,
      },
      null,
      2,
    ),
  );
  console.log("Report:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
