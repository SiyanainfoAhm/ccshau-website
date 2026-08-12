/**
 * Upload home-about-hau.jpg to Azure and point /pages/about at the blob URL.
 *
 * Usage: node scripts/legacy-import/upload-about-hau-image.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

const LEGACY_URL = "https://hau.ac.in/public/images/home-about-hau.jpg";
const BLOB_PATH = "legacy-images/home-about-hau.jpg";

function loadEnv(path) {
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

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

const UPLOADS_ROOT =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";
const LOCAL_PATH = join(UPLOADS_ROOT, "images", "home-about-hau.jpg");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const STORED_PATH = `${CONTAINER}/${BLOB_PATH}`;

function blobPublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function loadImageBuffer() {
  if (existsSync(LOCAL_PATH)) {
    return readFile(LOCAL_PATH);
  }
  const response = await fetch(LEGACY_URL);
  if (!response.ok) {
    throw new Error(`Failed to download ${LEGACY_URL}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  if (!CONFIRM) {
    console.error("Usage: node scripts/legacy-import/upload-about-hau-image.mjs --confirm");
    process.exit(1);
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!connectionString) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const buffer = await loadImageBuffer();
  const blobService = BlobServiceClient.fromConnectionString(connectionString);
  const blockBlob = blobService
    .getContainerClient(CONTAINER)
    .getBlockBlobClient(BLOB_PATH);

  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: "image/jpeg" },
    overwrite: true,
  });

  const publicUrl = blobPublicUrl(STORED_PATH);
  console.log(`✓ Uploaded ${buffer.length} bytes → ${STORED_PATH}`);
  console.log(`  Public URL: ${publicUrl}`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error: findErr } = await supabase
    .from("ccshau_pages")
    .select("id, content_en")
    .eq("slug", "about")
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!page?.id) throw new Error("about page not found");

  const contentEn = String(page.content_en || "").replaceAll(LEGACY_URL, publicUrl);

  const { error: updateErr } = await supabase
    .from("ccshau_pages")
    .update({
      featured_image_path: STORED_PATH,
      content_en: contentEn,
    })
    .eq("id", page.id);
  if (updateErr) throw new Error(updateErr.message);

  console.log("✓ Updated ccshau_pages slug=about");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
