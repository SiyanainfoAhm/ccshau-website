#!/usr/bin/env node
/**
 * Upload HAU storage/app/uploads assets referenced by Farmers Portal HTML
 * into Azure legacy-storage/ so rewriteLegacyHauHref links resolve.
 *
 *   node scripts/legacy-import/sync-farmers-portal-hau-uploads.mjs
 *   node scripts/legacy-import/sync-farmers-portal-hau-uploads.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "reports/farmers-portal-hau-uploads-cache");
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
const { BlobServiceClient, StorageSharedKeyCredential } = requireFromWeb(
  "@azure/storage-blob",
);

function contentType(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}

function extractFilenames(contentTs) {
  const re = /hau\.ac\.in\/storage\/app\/uploads\/([A-Za-z0-9._-]+)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(contentTs))) set.add(m[1]);
  return [...set].sort();
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

async function loadBuffer(fileName) {
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  if (existsSync(cachePath)) {
    return { buf: await readFile(cachePath), from: cachePath };
  }
  const url = `https://hau.ac.in/storage/app/uploads/${fileName}`;
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
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("text/html") || buf.length < 200) {
    throw new Error(`not a binary asset ${url} type=${ct} len=${buf.length}`);
  }
  await writeFile(cachePath, buf);
  return { buf, from: url };
}

async function main() {
  const contentPath = join(ROOT, "apps/web/src/lib/data/farmers-portal-content.ts");
  const files = extractFilenames(readFileSync(contentPath, "utf8"));
  console.log({ mode: APPLY ? "APPLY" : "dry-run", count: files.length, files });

  if (!APPLY) {
    console.log("Pass --apply to download from HAU and upload to Azure legacy-storage/.");
    return;
  }

  const client = getBlobService();
  const container = client.getContainerClient(CONTAINER);
  const report = [];

  for (const fileName of files) {
    const blobPath = `legacy-storage/${fileName}`;
    const blob = container.getBlockBlobClient(blobPath);
    if (await blob.exists()) {
      console.log("exists", blobPath);
      report.push({ fileName, status: "exists", blobPath });
      continue;
    }
    const { buf, from } = await loadBuffer(fileName);
    await blob.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentType(fileName) },
    });
    console.log("uploaded", blobPath, from, buf.length);
    report.push({ fileName, status: "uploaded", blobPath, bytes: buf.length, from });
  }

  mkdirSync(join(__dirname, "reports"), { recursive: true });
  writeFileSync(
    join(__dirname, "reports/farmers-portal-hau-uploads.json"),
    JSON.stringify(report, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
