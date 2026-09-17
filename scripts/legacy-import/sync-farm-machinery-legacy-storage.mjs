#!/usr/bin/env node
/**
 * Pull Farm Machinery PDFs/images from HAU legacy pages and upload to
 * Azure `legacy-storage/{file}` so sanitize rewrite links resolve.
 *
 * Sources:
 *   - https://hau.ac.in/event/MQ== → Farm Machinery Testing Centre
 *   - https://hau.ac.in/page/farm-power-machinery
 *   - known Farmers Portal asset filenames
 *
 *   node scripts/legacy-import/sync-farm-machinery-legacy-storage.mjs
 *   node scripts/legacy-import/sync-farm-machinery-legacy-storage.mjs --apply
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
const ACCOUNT =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() ||
  process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() ||
  "ccshau";
const AZURE_PUBLIC = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}`;

const KNOWN_PORTAL_FILES = [
  "BiNKjtQyhzvqzzs8NhxcIhpXGR3hLarY22bUl3CB.pdf",
  "0ijwYZsJx9TBbDm7MLpKTb4AHYQ4hEpfsx8wNGZs.pdf",
  "TAfj2XWCtifkxtbHzV1DtONyBkXa6zewdIoBvrUd.pdf",
  "8H4nEFgHM3Siqg73XswJhBxpWVlqheXpD2cdS85H.pdf",
  "r51K3m3FJgUDOp6XstgwKbyvhjxqSmw6e8eAk884.pdf",
  "wyCoWyp9eWitdvB0LInAxezMW4pa21X2gF22925U.pdf",
  "d4vzr6tibtn5EjKtxd5MriH9vVEeJDiwLRIq5L48.pdf",
  "WiFNf18darAxloDie5JYAhiSjQX6cZZ5z0rcDLbR.pdf",
  "uxssDUAGchoKwfgrD7smLUsdRoDKSN44RVRe0E8B.pdf",
  "Y2eOdunYGEZyHUMB4CgBWNGtb8thRxibDwAl6Dna.jpeg",
  "jExotVpD1Xiuq4VZmHQQ8xxflnU8YSFgHy6yc0Ir.jpeg",
  "lC6hqDVb1tIgEZbrtxR4ZsMg1yTrWXOyT8ZFhI7e.jpeg",
];

const SOURCE_PAGES = [
  "https://hau.ac.in/event/MQ==",
  "https://hau.ac.in/page/farm-power-machinery",
];

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

function contentType(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream";
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

async function fetchPageFilenames(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://hau.ac.in/event/MQ==",
    },
  });
  if (!r.ok) throw new Error(`page ${url} → ${r.status}`);
  const html = await r.text();
  return [...html.matchAll(/storage\/app\/uploads\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]);
}

async function loadBuffer(fileName) {
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  if (existsSync(cachePath)) {
    const buf = await readFile(cachePath);
    if (buf.length > 200) return { buf, from: cachePath };
  }

  const candidates = [
    `${AZURE_PUBLIC}/farmers-portal/assets/${fileName}`,
    `https://hau.ac.in/storage/app/uploads/${fileName}`,
  ];
  for (const url of candidates) {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
        Referer: "https://hau.ac.in/page/farm-power-machinery",
      },
    });
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("text/html") || buf.length < 200) continue;
    await writeFile(cachePath, buf);
    return { buf, from: url };
  }
  throw new Error(`could not fetch ${fileName}`);
}

async function main() {
  const set = new Set(KNOWN_PORTAL_FILES);
  for (const page of SOURCE_PAGES) {
    try {
      const names = await fetchPageFilenames(page);
      console.log(`page ${page} → ${names.length} uploads`);
      for (const n of names) set.add(n);
    } catch (e) {
      console.warn(`warn: ${e.message}`);
    }
  }
  const files = [...set].sort();
  console.log({ mode: APPLY ? "APPLY" : "dry-run", count: files.length, azurePublic: AZURE_PUBLIC });

  if (!APPLY) {
    console.log(files.slice(0, 20).join("\n"));
    console.log("Pass --apply to upload into Azure legacy-storage/.");
    return;
  }

  const container = getBlobService().getContainerClient(CONTAINER);
  const report = { uploaded: 0, exists: 0, failed: [], urls: [] };

  for (const fileName of files) {
    const blobPath = `legacy-storage/${fileName}`;
    const blob = container.getBlockBlobClient(blobPath);
    try {
      if (await blob.exists()) {
        report.exists += 1;
        report.urls.push(`${AZURE_PUBLIC}/${blobPath}`);
        console.log("exists", blobPath);
        continue;
      }
      const { buf, from } = await loadBuffer(fileName);
      await blob.uploadData(buf, {
        blobHTTPHeaders: { blobContentType: contentType(fileName) },
      });
      report.uploaded += 1;
      report.urls.push(`${AZURE_PUBLIC}/${blobPath}`);
      console.log("uploaded", blobPath, from, buf.length);
    } catch (e) {
      report.failed.push({ fileName, error: e.message });
      console.log("FAIL", fileName, e.message);
    }
  }

  mkdirSync(join(__dirname, "reports"), { recursive: true });
  writeFileSync(
    join(__dirname, "reports/legacy-storage-farm-machinery-sync.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      { uploaded: report.uploaded, exists: report.exists, failed: report.failed.length, failedSamples: report.failed.slice(0, 10) },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
