#!/usr/bin/env node
/**
 * Import live HAU notifications (News, Recruitment, Tenders) into Supabase.
 * Source: https://hau.ac.in homepage NJTM columns + full listing pages.
 *
 *   node scripts/legacy-import/import-legacy-notifications.mjs
 *   node scripts/legacy-import/import-legacy-notifications.mjs --apply
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "reports/notification-doc-cache");
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
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

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseDdMmYyyy(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function publishedFromFileName(fileName) {
  const base = basename(fileName || "").replace(/\.[^.]+$/, "");
  if (!/^\d{10}$/.test(base)) return null;
  const d = new Date(Number(base) * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function fetchHtml(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://hau.ac.in/",
    },
  });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

/** Homepage News / Recruitment / Tenders columns (with dates). */
function parseHomeColumns(html) {
  const out = { news: [], recruitment: [], tenders: [] };
  const specs = [
    { key: "news", heading: "News" },
    { key: "recruitment", heading: "Recruitment" },
    { key: "tenders", heading: "Tenders\\/Auctions" },
  ];
  for (const { key, heading } of specs) {
    const re = new RegExp(
      `<h4[^>]*>\\s*${heading}\\s*<\\/h4>[\\s\\S]*?<ul class="news">([\\s\\S]*?)<\\/ul>`,
      "i",
    );
    const m = html.match(re);
    if (!m) continue;
    const liRe = /<li[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = liRe.exec(m[1]))) {
      const href = lm[1].replace(/&amp;/g, "&");
      const dateM = lm[2].match(/notification_date[^>]*>\s*([^<]+)/i);
      const title = decode(lm[2].replace(/<span class="notification_date"[\s\S]*?<\/span>/i, ""));
      if (!title) continue;
      const docM = href.match(/notification-documents\/(\d+)\/([^/?#]+)/i);
      out[key].push({
        bucket: key,
        title,
        href,
        date: dateM ? dateM[1].trim() : null,
        legacyId: docM ? Number(docM[1]) : null,
        fileName: docM ? docM[2] : null,
        externalOnly: !docM,
      });
    }
  }
  return out;
}

/**
 * Full listing pages render many cards; visible ones use display:block.
 * Jobs page has a `<!--- jobs--->` marker before recruitment cards.
 */
function parseListingPage(html, bucket) {
  const markers = {
    recruitment: /<!---\s*jobs\s*--->/i,
    tenders: /<!--\s*tender\s*-->/i,
    news: /<span>\s*Latest-news\s*<\/span>|<span>\s*News\s*<\/span>|departmental/i,
  };
  const startM = html.search(markers[bucket] || /single-event-item/);
  const start = startM >= 0 ? startM : 0;
  const chunk = html.slice(start);
  const items = [];
  const cardRe =
    /<div class="col-md-4"[^>]*style="[^"]*display:\s*block[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = cardRe.exec(chunk))) {
    const href = m[1].replace(/&amp;/g, "&");
    const title = decode(m[2]);
    if (!title || /read more|arii|facebook|twitter/i.test(title)) continue;
    const docM = href.match(/notification-documents\/(\d+)\/([^/?#]+)/i);
    items.push({
      bucket,
      title,
      href,
      date: null,
      legacyId: docM ? Number(docM[1]) : null,
      fileName: docM ? docM[2] : null,
      externalOnly: !docM,
    });
  }
  return items;
}

function mergeItems(lists) {
  const byKey = new Map();
  for (const list of lists) {
    for (const item of list) {
      const key = item.legacyId
        ? `id:${item.legacyId}`
        : `href:${item.href}|${item.title}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { ...item });
        continue;
      }
      // Prefer dated homepage rows
      if (!prev.date && item.date) prev.date = item.date;
      if (item.title && item.title.length > prev.title.length) prev.title = item.title;
      if (!prev.fileName && item.fileName) {
        prev.fileName = item.fileName;
        prev.href = item.href;
        prev.legacyId = item.legacyId;
        prev.externalOnly = item.externalOnly;
      }
    }
  }
  return [...byKey.values()];
}

async function loadDocBuffer(legacyId, fileName) {
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, `${legacyId}_${fileName}`);
  if (existsSync(cachePath)) return { buf: await readFile(cachePath), from: cachePath };
  const url = `https://hau.ac.in/public/notification-documents/${legacyId}/${fileName}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: "https://hau.ac.in/",
    },
  });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 50) throw new Error(`file too small ${url}`);
  await writeFile(cachePath, buf);
  return { buf, from: url };
}

function contentType(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}

async function main() {
  console.log({ mode: APPLY ? "APPLY" : "dry-run" });

  const homeHtml = await fetchHtml("https://hau.ac.in/");
  const home = parseHomeColumns(homeHtml);
  // Fix tenders heading which includes a leading space in some markup
  if (home.tenders.length === 0) {
    const m = homeHtml.match(
      /<h4[^>]*>\s*Tenders\/Auctions\s*<\/h4>[\s\S]*?<ul class="news">([\s\S]*?)<\/ul>/i,
    );
    if (m) {
      const liRe = /<li[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let lm;
      while ((lm = liRe.exec(m[1]))) {
        const href = lm[1].replace(/&amp;/g, "&");
        const dateM = lm[2].match(/notification_date[^>]*>\s*([^<]+)/i);
        const title = decode(
          lm[2].replace(/<span class="notification_date"[\s\S]*?<\/span>/i, ""),
        );
        const docM = href.match(/notification-documents\/(\d+)\/([^/?#]+)/i);
        if (!title) continue;
        home.tenders.push({
          bucket: "tenders",
          title,
          href,
          date: dateM ? dateM[1].trim() : null,
          legacyId: docM ? Number(docM[1]) : null,
          fileName: docM ? docM[2] : null,
          externalOnly: !docM,
        });
      }
    }
  }

  const [jobsHtml, tendersHtml, newsHtml] = await Promise.all([
    fetchHtml("https://hau.ac.in/jobs"),
    fetchHtml("https://hau.ac.in/tenders"),
    fetchHtml("https://hau.ac.in/departmental-news"),
  ]);

  const newsItems = mergeItems([
    home.news.map((x) => ({ ...x, bucket: "news" })),
    parseListingPage(newsHtml, "news"),
  ]);
  const recruitmentItems = mergeItems([
    home.recruitment.map((x) => ({ ...x, bucket: "recruitment" })),
    parseListingPage(jobsHtml, "recruitment"),
  ]);
  const tenderItems = mergeItems([
    home.tenders.map((x) => ({ ...x, bucket: "tenders" })),
    parseListingPage(tendersHtml, "tenders"),
  ]);

  const summary = {
    homeCounts: {
      news: home.news.length,
      recruitment: home.recruitment.length,
      tenders: home.tenders.length,
    },
    mergedCounts: {
      news: newsItems.length,
      recruitment: recruitmentItems.length,
      tenders: tenderItems.length,
    },
    sample: {
      news: newsItems.slice(0, 3),
      recruitment: recruitmentItems.slice(0, 3),
      tenders: tenderItems.slice(0, 3),
    },
  };
  mkdirSync(join(__dirname, "reports"), { recursive: true });
  writeFileSync(
    join(__dirname, "reports/notifications-import-plan.json"),
    JSON.stringify({ summary, newsItems, recruitmentItems, tenderItems }, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) {
    console.log("Pass --apply to upsert into Supabase and upload files to Azure.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);

  // Do not blanket-remap historic Jobs rows — that pollutes Recruitment sorting.
  // Only items imported below with bucket=recruitment get category=recruitment.
  async function upsertNews(item) {
    const slug = item.legacyId
      ? `legacy-notif-${item.legacyId}`
      : `legacy-ext-${slugify(item.title)}`.slice(0, 180);
    const publishedAt =
      parseDdMmYyyy(item.date) ||
      publishedFromFileName(item.fileName) ||
      new Date().toISOString();

    const { data: existing } = await supabase
      .from("ccshau_news")
      .select("id, attachment_paths")
      .eq("slug", slug)
      .maybeSingle();

    const id = existing?.id ?? randomUUID();
    let attachment_paths = existing?.attachment_paths ?? [];

    let body_en = item.externalOnly
      ? `<p><a href="${item.href.replace(/"/g, "")}" target="_blank" rel="noopener noreferrer">Open link</a></p>`
      : null;

    if (item.legacyId && item.fileName) {
      const blobPath = `news/${id}/${item.fileName}`;
      const storedPath = `${CONTAINER}/${blobPath}`;
      const blob = container.getBlockBlobClient(blobPath);
      try {
        if (!(await blob.exists())) {
          const { buf } = await loadDocBuffer(item.legacyId, item.fileName);
          await blob.uploadData(buf, {
            blobHTTPHeaders: { blobContentType: contentType(item.fileName) },
          });
        }
        attachment_paths = [{ path: storedPath, name: item.fileName }];
      } catch {
        // Legacy file missing — keep title/date and link out to HAU.
        body_en = `<p><a href="${item.href.replace(/"/g, "")}" target="_blank" rel="noopener noreferrer">View on HAU</a></p>`;
      }
    }

    const payload = {
      slug,
      title_en: item.title,
      title_hi: null,
      body_en,
      notice_type: item.bucket === "recruitment" ? "notice" : "news",
      category: item.bucket === "recruitment" ? "recruitment" : "general",
      status: "published",
      published_at: publishedAt,
      is_featured: false,
      is_pinned: false,
      attachment_paths,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase.from("ccshau_news").update(payload).eq("id", existing.id);
      if (error) throw error;
      return "updated";
    }
    const { error } = await supabase.from("ccshau_news").insert({ id, ...payload });
    if (error) throw error;
    return "inserted";
  }

  async function upsertTender(item) {
    if (!item.legacyId) return "skipped";
    const slug = `legacy-tender-${item.legacyId}`;
    const publishedAt =
      parseDdMmYyyy(item.date) ||
      publishedFromFileName(item.fileName) ||
      new Date().toISOString();

    const { data: existing } = await supabase
      .from("ccshau_tenders")
      .select("id, document_paths")
      .eq("slug", slug)
      .maybeSingle();

    const id = existing?.id ?? randomUUID();
    let document_paths = existing?.document_paths ?? [];

    let description_en = null;
    if (item.fileName) {
      const blobPath = `tenders/${id}/${item.fileName}`;
      const storedPath = `${CONTAINER}/${blobPath}`;
      const blob = container.getBlockBlobClient(blobPath);
      try {
        if (!(await blob.exists())) {
          const { buf } = await loadDocBuffer(item.legacyId, item.fileName);
          await blob.uploadData(buf, {
            blobHTTPHeaders: { blobContentType: contentType(item.fileName) },
          });
        }
        document_paths = [{ path: storedPath, name: item.fileName }];
      } catch {
        description_en = `View on HAU: ${item.href}`;
      }
    }

    const payload = {
      slug,
      title_en: item.title,
      title_hi: null,
      description_en,
      category: "other",
      status: "open",
      published_at: publishedAt,
      tender_number: `HAU-${item.legacyId}`,
      document_paths,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase.from("ccshau_tenders").update(payload).eq("id", existing.id);
      if (error) throw error;
      return "updated";
    }
    const { error } = await supabase.from("ccshau_tenders").insert({ id, ...payload });
    if (error) throw error;
    return "inserted";
  }

  const stats = {
    news: { inserted: 0, updated: 0, failed: 0 },
    recruitment: { inserted: 0, updated: 0, failed: 0 },
    tenders: { inserted: 0, updated: 0, failed: 0, skipped: 0 },
    errors: [],
  };

  // Undo earlier Jobs→recruitment remap for rows we did not import as recruitment.
  const recruitmentSlugs = new Set(
    recruitmentItems
      .filter((i) => i.legacyId)
      .map((i) => `legacy-notif-${i.legacyId}`),
  );
  const { data: badRecruitment } = await supabase
    .from("ccshau_news")
    .select("id, slug")
    .eq("category", "recruitment")
    .eq("status", "published");
  for (const row of badRecruitment ?? []) {
    if (recruitmentSlugs.has(row.slug)) continue;
    await supabase.from("ccshau_news").update({ category: "general" }).eq("id", row.id);
  }

  // Prefer document-backed recruitment rows; skip noisy external portal links.
  const homeRecruitmentTitles = new Set(home.recruitment.map((i) => i.title.toLowerCase()));
  const filteredRecruitment = recruitmentItems.filter(
    (i) => i.legacyId || homeRecruitmentTitles.has(i.title.toLowerCase()),
  );

  for (const item of newsItems) {
    try {
      const r = await upsertNews({ ...item, bucket: "news" });
      stats.news[r] += 1;
    } catch (e) {
      stats.news.failed += 1;
      stats.errors.push(`news ${item.legacyId}: ${e.message}`);
      console.warn("news fail", item.legacyId, e.message);
    }
  }
  for (const item of filteredRecruitment) {
    try {
      const r = await upsertNews({ ...item, bucket: "recruitment" });
      stats.recruitment[r] += 1;
    } catch (e) {
      stats.recruitment.failed += 1;
      stats.errors.push(`recruitment ${item.legacyId}: ${e.message}`);
      console.warn("recruitment fail", item.legacyId, e.message);
    }
  }
  for (const item of tenderItems) {
    try {
      const r = await upsertTender(item);
      stats.tenders[r] = (stats.tenders[r] || 0) + 1;
    } catch (e) {
      stats.tenders.failed = (stats.tenders.failed || 0) + 1;
      stats.errors.push(`tender ${item.legacyId}: ${e.message}`);
      console.warn("tender fail", item.legacyId, e.message);
    }
  }

  writeFileSync(join(__dirname, "reports/notifications-import-result.json"), JSON.stringify(stats, null, 2));
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
