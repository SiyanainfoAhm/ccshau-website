#!/usr/bin/env node
/**
 * Migrate one ccshau_page_gallery_items row image/thumbnail from HAU → Azure.
 *
 *   node scripts/ops/migrate-gallery-item-azure.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const ITEM_ID = "012b64b9-1b9b-43f8-be79-5d3ff68779b3";
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

async function ensureAzure(containerClient, hauUrl) {
  const m = hauUrl.trim().match(HAU_RE);
  if (!m) throw new Error(`Not a HAU storage URL: ${hauUrl}`);
  const relative = m[1];
  const blobPath = `legacy-storage/${relative}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) return { stored, publicUrl, reused: true };

  mkdirSync(CACHE, { recursive: true });
  const fileName = basename(relative);
  const cachePath = join(CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = readFileSync(cachePath);
  } else {
    const r = await fetch(hauUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/*,*/*",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${r.status} ${hauUrl}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error(`too small ${buf.length}`);
    await writeFile(cachePath, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  return { stored, publicUrl, reused: false, bytes: buf.length };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: item, error } = await supabase
    .from("ccshau_page_gallery_items")
    .select("*")
    .eq("id", ITEM_ID)
    .maybeSingle();
  if (error) throw error;
  if (!item) throw new Error(`Not found: ${ITEM_ID}`);

  console.log({
    mode: APPLY ? "APPLY" : "dry-run",
    id: item.id,
    title: item.title_en,
    image_url: item.image_url,
    thumbnail_url: item.thumbnail_url,
  });

  const source = item.image_url || item.thumbnail_url;
  if (!source) throw new Error("No image_url/thumbnail_url");

  if (!APPLY) {
    const m = source.match(HAU_RE);
    console.log("Would upload →", m ? azurePublicUrl(`${CONTAINER}/legacy-storage/${m[1]}`) : "(unparsed)");
    console.log("Pass --apply to upload + update.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const result = await ensureAzure(container, source);
  console.log("Azure:", result);

  // Keep absolute Azure URLs (column already stores absolute http URLs)
  const patch = {
    image_url: result.publicUrl,
    thumbnail_url: result.publicUrl,
    updated_at: new Date().toISOString(),
  };
  const { error: upErr } = await supabase.from("ccshau_page_gallery_items").update(patch).eq("id", ITEM_ID);
  if (upErr) throw upErr;

  const { data: after } = await supabase
    .from("ccshau_page_gallery_items")
    .select("id, title_en, image_url, thumbnail_url")
    .eq("id", ITEM_ID)
    .maybeSingle();
  console.log("Updated:", after);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
