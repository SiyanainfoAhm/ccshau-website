#!/usr/bin/env node
/**
 * Migrate ccshau_faculty_people.image_path from hau.ac.in college-user URLs → Azure.
 *
 *   node scripts/ops/migrate-faculty-college-user-images.mjs
 *   node scripts/ops/migrate-faculty-college-user-images.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/college-user-image-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const HAU_PREFIX_RE =
  /^https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/(college-user\/[^?#\s]+)$/i;

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllMatching(supabase) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ccshau_faculty_people")
      .select("id, name_en, image_path")
      .like("image_path", "%hau.ac.in/storage/app/uploads/college-user/%")
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

async function downloadImage(hauUrl, fileName) {
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName.replace(/[\\/]/g, "_"));
  if (existsSync(cachePath)) {
    const buf = await readFile(cachePath);
    if (buf.length >= 200) return { buf, from: cachePath };
  }
  const r = await fetch(hauUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "image/*,*/*",
      Referer: "https://hau.ac.in/",
    },
  });
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 200) throw new Error(`too small (${buf.length})`);
  await writeFile(cachePath, buf);
  return { buf, from: hauUrl };
}

async function ensureOnAzure(containerClient, relativePath, hauUrl) {
  const blobPath = `legacy-storage/${relativePath}`; // e.g. legacy-storage/college-user/foo.jpeg
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) {
    return { stored, publicUrl, reused: true };
  }
  const fileName = basename(relativePath);
  const { buf, from } = await downloadImage(hauUrl, fileName);
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  return { stored, publicUrl, reused: false, from, bytes: buf.length };
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
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const rows = await fetchAllMatching(supabase);
  console.log(`faculty_people college-user HAU images: ${rows.length}`);
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  if (!rows.length) return;

  // Unique relative paths
  const byRel = new Map();
  for (const row of rows) {
    const m = (row.image_path ?? "").trim().match(HAU_PREFIX_RE);
    if (!m) {
      console.log(`  SKIP unparsed: ${row.id} ${row.image_path}`);
      continue;
    }
    const relative = m[1]; // college-user/...
    if (!byRel.has(relative)) byRel.set(relative, []);
    byRel.get(relative).push(row);
  }
  console.log(`unique files: ${byRel.size}`);

  if (!APPLY) {
    for (const [rel, group] of [...byRel.entries()].slice(0, 8)) {
      console.log(`  WOULD ${rel} → ${CONTAINER}/legacy-storage/${rel} (${group.length} rows)`);
    }
    console.log("Pass --apply to upload + update image_path.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const entries = [...byRel.entries()];
  let uploaded = 0;
  let reused = 0;
  let failed = 0;
  let updatedRows = 0;

  await mapPool(entries, 4, async ([rel, group], idx) => {
    const hauUrl = `https://hau.ac.in/storage/app/uploads/${rel}`;
    try {
      const result = await ensureOnAzure(container, rel, hauUrl);
      if (result.reused) reused++;
      else uploaded++;

      for (const row of group) {
        if (row.image_path === result.stored) continue;
        const { error } = await supabase
          .from("ccshau_faculty_people")
          .update({ image_path: result.stored })
          .eq("id", row.id);
        if (error) throw new Error(`${row.id}: ${error.message}`);
        updatedRows++;
      }
      if ((idx + 1) % 10 === 0 || idx === entries.length - 1) {
        console.log(`  progress ${idx + 1}/${entries.length} (up=${uploaded} reuse=${reused} fail=${failed} rows=${updatedRows})`);
      }
      await sleep(40);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${rel}: ${e.message}`);
    }
  });

  const { count } = await supabase
    .from("ccshau_faculty_people")
    .select("id", { count: "exact", head: true })
    .like("image_path", "%hau.ac.in/storage/app/uploads/college-user/%");

  console.log("\nSummary:");
  console.log(`  uploaded: ${uploaded}`);
  console.log(`  reused existing Azure: ${reused}`);
  console.log(`  failed files: ${failed}`);
  console.log(`  rows updated: ${updatedRows}`);
  console.log(`  remaining HAU college-user paths: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
