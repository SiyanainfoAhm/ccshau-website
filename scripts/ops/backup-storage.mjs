#!/usr/bin/env node
/**
 * Inventory (and optionally download) Azure Blob containers for off-site backup.
 *
 * Env (or apps/web/.env.local):
 *   AZURE_STORAGE_CONNECTION_STRING
 *   OR AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY
 *
 * Usage:
 *   node scripts/ops/backup-storage.mjs
 *   node scripts/ops/backup-storage.mjs --download
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadAzureStorage() {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("@azure/storage-blob");
    } catch {
      /* try next */
    }
  }
  throw new Error("Install @azure/storage-blob (apps/web) before running this script.");
}

const { BlobServiceClient, StorageSharedKeyCredential } = loadAzureStorage();

const CONTAINERS = (() => {
  const single =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER?.trim();
  if (single) return [single];
  return [
    process.env.NEXT_PUBLIC_STORAGE_BUCKET_PUBLIC || "ccshau-public",
    process.env.STORAGE_BUCKET_PRIVATE || "ccshau-private",
    process.env.NEXT_PUBLIC_STORAGE_BUCKET_MEDIA || "ccshau-media",
  ];
})();
const DOWNLOAD = process.argv.includes("--download");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

function getBlobServiceClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (accountName && accountKey) {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
  }
  return null;
}

async function listAll(service, containerName) {
  const objects = [];
  const container = service.getContainerClient(containerName);
  for await (const blob of container.listBlobsFlat()) {
    objects.push({
      bucket: containerName,
      path: blob.name,
      size: blob.properties.contentLength ?? null,
      updated_at: blob.properties.lastModified?.toISOString?.() ?? null,
      mimetype: blob.properties.contentType ?? null,
    });
  }
  return objects;
}

async function downloadObject(service, containerName, path, destFile) {
  mkdirSync(dirname(destFile), { recursive: true });
  const blob = service.getContainerClient(containerName).getBlockBlobClient(path);
  await blob.downloadToFile(destFile);
}

async function main() {
  const service = getBlobServiceClient();
  if (!service) {
    console.error(
      "Missing Azure credentials. Set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY",
    );
    process.exit(1);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = join(ROOT, "backups", "storage", stamp);
  mkdirSync(outDir, { recursive: true });

  const all = [];
  for (const container of CONTAINERS) {
    console.log(`Listing ${container}...`);
    try {
      const objs = await listAll(service, container);
      console.log(`  ${objs.length} objects`);
      all.push(...objs);
    } catch (err) {
      console.warn(`  skipped (${err instanceof Error ? err.message : err})`);
    }
  }

  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT ||
    process.env.AZURE_STORAGE_ACCOUNT_NAME ||
    "azure";
  const inventoryPath = join(outDir, "inventory.json");
  writeFileSync(
    inventoryPath,
    JSON.stringify(
      {
        storage_account: account,
        generated_at: new Date().toISOString(),
        buckets: CONTAINERS,
        object_count: all.length,
        objects: all,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${inventoryPath}`);

  if (!DOWNLOAD) {
    console.log("Inventory only. Pass --download to copy files into backups/storage/<date>/files/");
    return;
  }

  const filesRoot = join(outDir, "files");
  let ok = 0;
  let fail = 0;
  for (const obj of all) {
    const dest = join(filesRoot, obj.bucket, obj.path);
    try {
      await downloadObject(service, obj.bucket, obj.path, dest);
      ok += 1;
      if (ok % 25 === 0) console.log(`  downloaded ${ok}/${all.length}`);
    } catch (err) {
      fail += 1;
      console.warn(`  fail ${obj.bucket}/${obj.path}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Download complete: ${ok} ok, ${fail} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
