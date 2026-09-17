#!/usr/bin/env node
/**
 * Fix DEF-001..004:
 * - Upload Farmers Portal HAU files/photos + Tubewell APK to Azure
 * - Rewrite portal HTML to Azure blob URLs (no hau.ac.in storage/apk links)
 * - Upload pending tender documents and patch ccshau_tenders.document_paths
 *
 *   node scripts/legacy-import/fix-def-farmers-tenders-azure.mjs
 *   node scripts/legacy-import/fix-def-farmers-tenders-azure.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "reports/fix-def-azure-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const ACCOUNT =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() ||
  process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() ||
  "ccshau";
const AZURE_PUBLIC = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}`;

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
const { BlobServiceClient, StorageSharedKeyCredential } = requireFromWeb("@azure/storage-blob");
const { createClient } = requireFromWeb("@supabase/supabase-js");

function contentType(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    apk: "application/vnd.android.package-archive",
  };
  return map[ext] || "application/octet-stream";
}

function getBlobService() {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (cs) return BlobServiceClient.fromConnectionString(cs);
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (accountName && accountKey) {
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(accountName, accountKey),
    );
  }
  throw new Error("Azure Storage credentials missing.");
}

async function fetchBinary(url, cacheKey) {
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, cacheKey.replace(/[\\/]/g, "_"));
  if (existsSync(cachePath)) {
    const buf = await readFile(cachePath);
    if (buf.length > 200) return { buf, from: cachePath };
  }
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: "https://hau.ac.in/",
    },
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("text/html") || buf.length < 200) {
    throw new Error(`not binary ${url} type=${ct} len=${buf.length}`);
  }
  await writeFile(cachePath, buf);
  return { buf, from: url };
}

async function ensureBlob(container, blobPath, url, cacheKey) {
  const blob = container.getBlockBlobClient(blobPath);
  if (await blob.exists()) {
    return { status: "exists", url: `${AZURE_PUBLIC}/${blobPath}`, blobPath };
  }
  const { buf, from } = await fetchBinary(url, cacheKey || basename(blobPath));
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentType(blobPath) },
  });
  return { status: "uploaded", url: `${AZURE_PUBLIC}/${blobPath}`, blobPath, bytes: buf.length, from };
}

function extractHauUploadFiles(contentTs) {
  const re = /hau\.ac\.in\/storage\/app\/uploads\/([A-Za-z0-9._-]+)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(contentTs))) set.add(m[1]);
  return [...set].sort();
}

async function fixFarmersPortal(container) {
  const contentPath = join(ROOT, "apps/web/src/lib/data/farmers-portal-content.ts");
  let src = readFileSync(contentPath, "utf8");
  const files = extractHauUploadFiles(src);
  const report = { assets: [], apk: null, rewritten: 0 };

  console.log(`Farmers portal assets: ${files.length}`);
  const urlMap = new Map();

  for (const fileName of files) {
    const hauUrl = `https://hau.ac.in/storage/app/uploads/${fileName}`;
    const blobPath = `farmers-portal/assets/${fileName}`;
    if (!APPLY) {
      console.log("  would upload", blobPath);
      urlMap.set(hauUrl, `${AZURE_PUBLIC}/${blobPath}`);
      // also map www variant
      urlMap.set(`https://www.hau.ac.in/storage/app/uploads/${fileName}`, `${AZURE_PUBLIC}/${blobPath}`);
      continue;
    }
    const res = await ensureBlob(container, blobPath, hauUrl, `fp_${fileName}`);
    console.log(`  ${res.status}`, blobPath, res.bytes || "");
    report.assets.push(res);
    urlMap.set(hauUrl, res.url);
    urlMap.set(`https://www.hau.ac.in/storage/app/uploads/${fileName}`, res.url);
  }

  // APK
  const apkHau = "https://hau.ac.in/apk/TubewellDischargeSWE.apk";
  const apkBlob = "farmers-portal/apk/TubewellDischargeSWE.apk";
  const apkAzure = `${AZURE_PUBLIC}/${apkBlob}`;
  if (!APPLY) {
    console.log("  would upload", apkBlob);
  } else {
    try {
      const res = await ensureBlob(container, apkBlob, apkHau, "TubewellDischargeSWE.apk");
      console.log(`  apk ${res.status}`, apkBlob, res.bytes || "");
      report.apk = res;
    } catch (e) {
      console.warn("  apk upload failed:", e.message);
      report.apk = { status: "failed", error: e.message };
    }
  }
  urlMap.set(apkHau, apkAzure);
  urlMap.set("https://www.hau.ac.in/apk/TubewellDischargeSWE.apk", apkAzure);

  // Rewrite content to Azure URLs
  let next = src;
  for (const [from, to] of urlMap) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      report.rewritten += 1;
    }
  }
  // Also rewrite any remaining hau storage that slipped
  next = next.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([A-Za-z0-9._-]+)/g,
    (_, file) => `${AZURE_PUBLIC}/farmers-portal/assets/${file}`,
  );
  next = next.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/apk\/TubewellDischargeSWE\.apk/g,
    apkAzure,
  );

  if (APPLY && next !== src) {
    writeFileSync(contentPath, next, "utf8");
    console.log("updated", contentPath);
  } else if (!APPLY) {
    console.log("dry-run: would rewrite farmers-portal-content.ts Azure URLs");
  }

  return report;
}

async function fixTenders(container) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase URL/service role missing");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ccshau_tenders")
      .select("id, slug, document_paths")
      .not("document_paths", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data) {
      if ((row.document_paths || []).some((a) => String(a?.path || "").startsWith("legacy-pending/"))) {
        rows.push(row);
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Pending tenders: ${rows.length}`);
  const report = { uploaded: 0, exists: 0, missing: 0, failed: 0, samples: [] };
  const uploadsRoot =
    process.env.LEGACY_UPLOADS_ROOT?.trim() ||
    "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";

  for (const row of rows) {
    const nextDocs = [];
    let changed = false;
    for (const item of row.document_paths || []) {
      const pathStr = String(item?.path || "");
      if (!pathStr.startsWith("legacy-pending/")) {
        nextDocs.push(item);
        continue;
      }
      const parts = pathStr.split("/");
      // legacy-pending/tenders/{legacyId}/{file}
      const legacyId = parts[2];
      const fileName = parts.slice(3).join("/");
      const blobPath = `tenders/${row.id}/${fileName}`;
      const stored = `${CONTAINER}/${blobPath}`;
      const localCandidates = [
        join(uploadsRoot, "notification-documents", legacyId, fileName),
        join(uploadsRoot, "news-documents", legacyId, fileName),
        join(CACHE, `tender_${legacyId}_${fileName}`),
      ];
      const hauUrl = `https://hau.ac.in/public/notification-documents/${legacyId}/${fileName}`;

      try {
        if (!APPLY) {
          console.log("  would upload", blobPath, "from", hauUrl);
          nextDocs.push({ ...item, path: stored });
          changed = true;
          continue;
        }
        const blob = container.getBlockBlobClient(blobPath);
        if (await blob.exists()) {
          report.exists += 1;
          nextDocs.push({ ...item, path: stored });
          changed = true;
          continue;
        }
        let buf = null;
        let from = null;
        for (const local of localCandidates) {
          if (existsSync(local)) {
            buf = await readFile(local);
            from = local;
            break;
          }
        }
        if (!buf) {
          try {
            const fetched = await fetchBinary(hauUrl, `tender_${legacyId}_${fileName}`);
            buf = fetched.buf;
            from = fetched.from;
          } catch (e) {
            report.missing += 1;
            report.samples.push({ id: row.id, path: pathStr, error: e.message });
            nextDocs.push(item);
            continue;
          }
        }
        await blob.uploadData(buf, {
          blobHTTPHeaders: { blobContentType: contentType(fileName) },
        });
        console.log("  uploaded", blobPath, from, buf.length);
        report.uploaded += 1;
        nextDocs.push({ ...item, path: stored });
        changed = true;
      } catch (e) {
        report.failed += 1;
        report.samples.push({ id: row.id, path: pathStr, error: e.message });
        nextDocs.push(item);
      }
    }

    if (APPLY && changed) {
      const { error } = await supabase
        .from("ccshau_tenders")
        .update({ document_paths: nextDocs, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) {
        report.failed += 1;
        report.samples.push({ id: row.id, error: error.message });
      }
    }
  }

  return report;
}

async function main() {
  console.log({ mode: APPLY ? "APPLY" : "dry-run", container: CONTAINER, azurePublic: AZURE_PUBLIC });
  const client = getBlobService();
  const container = client.getContainerClient(CONTAINER);

  const farmers = await fixFarmersPortal(container);
  const tenders = await fixTenders(container);

  const out = { farmers, tenders, at: new Date().toISOString() };
  mkdirSync(join(__dirname, "reports"), { recursive: true });
  writeFileSync(join(__dirname, "reports/fix-def-farmers-tenders-azure.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ farmersSummary: { assets: farmers.assets?.length, apk: farmers.apk?.status, rewritten: farmers.rewritten }, tenders }, null, 2));
  if (!APPLY) console.log("Pass --apply to upload and rewrite.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
