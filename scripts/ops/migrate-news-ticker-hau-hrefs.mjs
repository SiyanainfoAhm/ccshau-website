#!/usr/bin/env node
/**
 * Migrate ccshau_page_news_ticker_items.href (hau.ac.in files) → Azure.
 * Also migrates file_path when it is a HAU URL.
 *
 *   node scripts/ops/migrate-news-ticker-hau-hrefs.mjs
 *   node scripts/ops/migrate-news-ticker-hau-hrefs.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/news-ticker-file-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const HAU_HOST_RE = /^https?:\/\/(?:www\.)?hau\.ac\.in\//i;
const HAU_UPLOADS_RE =
  /^https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/(.+)$/i;

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

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }[e] || "application/octet-stream"
  );
}

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function isHauUrl(u) {
  return Boolean(u?.trim() && HAU_HOST_RE.test(u.trim()));
}

function blobPathForHauUrl(hauUrl) {
  const u = hauUrl.trim();
  const upload = u.match(HAU_UPLOADS_RE);
  if (upload) return `legacy-storage/${upload[1]}`;
  const url = new URL(u);
  const path = url.pathname.replace(/^\/+/, "");
  if (!path) {
    const hash = createHash("sha1").update(u).digest("hex").slice(0, 16);
    return `legacy-storage/hau-misc/${hash}`;
  }
  return `legacy-storage/${path}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAll(supabase) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ccshau_page_news_ticker_items")
      .select("id, page_id, title_en, href, file_path")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows.filter((r) => isHauUrl(r.href) || isHauUrl(r.file_path));
}

async function ensureAzure(containerClient, cache, hauUrl) {
  const key = hauUrl.trim();
  if (cache.has(key)) return cache.get(key);

  const blobPath = blobPathForHauUrl(key);
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);

  if (await blob.exists()) {
    const result = { stored, publicUrl, reused: true };
    cache.set(key, result);
    return result;
  }

  mkdirSync(CACHE, { recursive: true });
  const fileName = basename(new URL(key).pathname) || "file.bin";
  const cacheFile = join(
    CACHE,
    `${createHash("sha1").update(key).digest("hex").slice(0, 12)}-${fileName.replace(/[\\/]/g, "_")}`,
  );
  let buf;
  if (existsSync(cacheFile)) {
    buf = readFileSync(cacheFile);
  } else {
    const r = await fetch(key, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,image/*,*/*",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error(`too small (${buf.length})`);
    await writeFile(cacheFile, buf);
  }

  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  const result = { stored, publicUrl, reused: false, bytes: buf.length };
  cache.set(key, result);
  return result;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()));
  return results;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const rows = await fetchAll(supabase);
  const uniqueUrls = new Set();
  for (const r of rows) {
    if (isHauUrl(r.href)) uniqueUrls.add(r.href.trim());
    if (isHauUrl(r.file_path)) uniqueUrls.add(r.file_path.trim());
  }

  console.log(`news ticker rows with HAU urls: ${rows.length}`);
  console.log(`unique HAU files: ${uniqueUrls.size}`);
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  for (const u of [...uniqueUrls].slice(0, 8)) console.log(`  ${u}`);
  if (uniqueUrls.size > 8) console.log(`  … +${uniqueUrls.size - 8} more`);

  if (!rows.length) return;
  if (!APPLY) {
    console.log("Pass --apply to upload + update href/file_path.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const fileCache = new Map();
  let updated = 0;
  let failed = 0;
  let uploaded = 0;
  let reused = 0;

  await mapPool(rows, 3, async (row, idx) => {
    try {
      const patch = {};
      for (const field of ["href", "file_path"]) {
        const val = row[field];
        if (!isHauUrl(val)) continue;
        const seen = fileCache.has(val.trim());
        const res = await ensureAzure(container, fileCache, val);
        if (!seen) {
          if (res.reused) reused++;
          else uploaded++;
        }
        if (field === "href") {
          // Public UI prefers href; store Azure absolute URL
          patch.href = res.publicUrl;
          // Also keep storage path for admin/download helpers
          if (!row.file_path || isHauUrl(row.file_path)) {
            patch.file_path = res.stored;
          }
        } else {
          patch.file_path = res.stored;
        }
      }
      if (!Object.keys(patch).length) return;
      patch.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from("ccshau_page_news_ticker_items")
        .update(patch)
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      updated++;
      if ((idx + 1) % 15 === 0 || idx === rows.length - 1) {
        console.log(
          `  progress ${idx + 1}/${rows.length} updated=${updated} fail=${failed} up=${uploaded} reuse=${reused}`,
        );
      }
      await sleep(40);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${row.id} ${row.title_en ?? ""}: ${e.message}`);
      console.log(`       ${row.href ?? row.file_path}`);
    }
  });

  const remaining = await fetchAll(supabase);
  console.log("\nSummary:");
  console.log(`  rows updated: ${updated}`);
  console.log(`  failed: ${failed}`);
  console.log(`  files uploaded: ${uploaded}`);
  console.log(`  files already on Azure: ${reused}`);
  console.log(`  remaining HAU ticker urls: ${remaining.length}`);
  for (const r of remaining.slice(0, 20)) {
    console.log(`  leftover ${r.title_en}: ${r.href ?? r.file_path}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
