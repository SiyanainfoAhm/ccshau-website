#!/usr/bin/env node
/**
 * Migrate ccshau_page_gallery_items image_url / thumbnail_url
 * from hau.ac.in/storage/app/uploads → Azure legacy-storage.
 *
 *   node scripts/ops/migrate-gallery-hau-images.mjs
 *   node scripts/ops/migrate-gallery-hau-images.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/gallery-image-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const HAU_RE =
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
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    }[e] || "application/octet-stream"
  );
}

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function isHauUpload(url) {
  return Boolean(url?.trim() && HAU_RE.test(url.trim()));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAll(supabase) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ccshau_page_gallery_items")
      .select("id, page_id, title_en, image_url, thumbnail_url")
      .or(
        "image_url.like.%hau.ac.in/storage/app/uploads%,thumbnail_url.like.%hau.ac.in/storage/app/uploads%",
      )
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function ensureAzure(containerClient, cache, hauUrl) {
  const m = hauUrl.trim().match(HAU_RE);
  if (!m) throw new Error(`Not HAU storage URL: ${hauUrl}`);
  const relative = m[1];
  if (cache.has(relative)) return cache.get(relative);

  const blobPath = `legacy-storage/${relative}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);

  if (await blob.exists()) {
    const result = { stored, publicUrl, reused: true };
    cache.set(relative, result);
    return result;
  }

  mkdirSync(CACHE, { recursive: true });
  const fileName = basename(relative).replace(/[\\/]/g, "_");
  const cachePath = join(CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = readFileSync(cachePath);
  } else {
    const r = await fetch(`https://hau.ac.in/storage/app/uploads/${relative}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/*,*/*",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error(`too small (${buf.length})`);
    await writeFile(cachePath, buf);
  }

  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  const result = { stored, publicUrl, reused: false, bytes: buf.length };
  cache.set(relative, result);
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
  console.log(`gallery items with HAU storage URLs: ${rows.length}`);
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  if (!rows.length) return;

  const unique = new Set();
  for (const r of rows) {
    if (isHauUpload(r.image_url)) unique.add(r.image_url.trim().match(HAU_RE)[1]);
    if (isHauUpload(r.thumbnail_url)) unique.add(r.thumbnail_url.trim().match(HAU_RE)[1]);
  }
  console.log(`unique files: ${unique.size}`);

  if (!APPLY) {
    for (const rel of [...unique].slice(0, 10)) {
      console.log(`  WOULD ${rel}`);
    }
    console.log("Pass --apply to upload + update.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const fileCache = new Map();
  let updated = 0;
  let failed = 0;
  let uploaded = 0;
  let reused = 0;

  await mapPool(rows, 4, async (row, idx) => {
    try {
      const patch = {};
      for (const field of ["image_url", "thumbnail_url"]) {
        const val = row[field];
        if (!isHauUpload(val)) continue;
        const rel = val.trim().match(HAU_RE)[1];
        const seen = fileCache.has(rel);
        const res = await ensureAzure(container, fileCache, val);
        if (!seen) {
          if (res.reused) reused++;
          else uploaded++;
        }
        patch[field] = res.publicUrl;
      }
      if (!Object.keys(patch).length) return;
      patch.updated_at = new Date().toISOString();
      const { error } = await supabase.from("ccshau_page_gallery_items").update(patch).eq("id", row.id);
      if (error) throw new Error(error.message);
      updated++;
      if ((idx + 1) % 25 === 0 || idx === rows.length - 1) {
        console.log(
          `  progress ${idx + 1}/${rows.length} updated=${updated} fail=${failed} up=${uploaded} reuse=${reused}`,
        );
      }
      await sleep(30);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${row.id} ${row.title_en ?? ""}: ${e.message}`);
    }
  });

  const remaining = await fetchAll(supabase);
  console.log("\nSummary:");
  console.log(`  rows updated: ${updated}`);
  console.log(`  failed: ${failed}`);
  console.log(`  files uploaded: ${uploaded}`);
  console.log(`  files already on Azure: ${reused}`);
  console.log(`  remaining HAU gallery URLs: ${remaining.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
