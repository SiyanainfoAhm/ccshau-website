/**
 * Upload the 3 homepage inspirational quote portraits to Azure and update DB rows.
 *
 * Usage: node scripts/legacy-import/upload-homepage-quote-images.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

const QUOTES = [
  {
    authorEn: "Chaudhary Charan Singh",
    legacyUrl:
      "https://hau.ac.in/storage/app/public/uploads/theme/eeB0xNjRWdFkMmwbJnRYD3ksnAHooDatx7CUfYHU.jpeg",
    blobPath: "legacy-images/homepage-quotes/charan-singh.jpeg",
    contentType: "image/jpeg",
  },
  {
    authorEn: "Norman Borlaug",
    legacyUrl:
      "https://hau.ac.in/storage/app/public/uploads/theme/yVu1TIQ2Vd8Tq2qMEyQOBnv5MKX8Fb0hTbKzU9Tt.jpeg",
    blobPath: "legacy-images/homepage-quotes/norman-borlaug.jpeg",
    contentType: "image/jpeg",
  },
  {
    authorEn: "Dr. M. S. Swaminathan",
    legacyUrl:
      "https://hau.ac.in/storage/app/public/uploads/theme/lbhkPcOeDxsdiUidT9CCtx9OY53ZhlOiCdIe1gal.jpeg",
    blobPath: "legacy-images/homepage-quotes/ms-swaminathan.jpeg",
    contentType: "image/jpeg",
  },
];

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

const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

function blobPublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${imageUrl}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function findQuoteRow(supabase, authorEn) {
  const { data, error } = await supabase
    .from("ccshau_homepage_quotes")
    .select("id, author_en")
    .order("sort_order");
  if (error) throw new Error(error.message);

  const normalized = authorEn.toLowerCase().replace(/^dr\.?\s+/i, "").trim();
  return (data ?? []).find((row) => {
    const rowAuthor = row.author_en.toLowerCase().replace(/^dr\.?\s+/i, "").trim();
    return rowAuthor === normalized || rowAuthor.includes(normalized.split(" ").pop());
  });
}

async function main() {
  if (!CONFIRM) {
    console.error(
      "Usage: node scripts/legacy-import/upload-homepage-quote-images.mjs --confirm",
    );
    process.exit(1);
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!connectionString) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const blobService = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobService.getContainerClient(CONTAINER);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const results = [];

  for (const quote of QUOTES) {
    const buffer = await downloadImage(quote.legacyUrl);
    const blockBlob = containerClient.getBlockBlobClient(quote.blobPath);

    await blockBlob.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: quote.contentType },
      overwrite: true,
    });

    const storedPath = `${CONTAINER}/${quote.blobPath}`;
    const publicUrl = blobPublicUrl(storedPath);
    const row = await findQuoteRow(supabase, quote.authorEn);

    if (!row?.id) {
      console.warn(`⚠ No DB row for ${quote.authorEn} — uploaded blob only: ${storedPath}`);
      results.push({ authorEn: quote.authorEn, storedPath, publicUrl, updated: false });
      continue;
    }

    const { error: updateErr } = await supabase
      .from("ccshau_homepage_quotes")
      .update({ image_path: storedPath })
      .eq("id", row.id);
    if (updateErr) throw new Error(updateErr.message);

    console.log(`✓ ${quote.authorEn}`);
    console.log(`  Blob: ${storedPath}`);
    console.log(`  URL:  ${publicUrl}`);
    results.push({ authorEn: quote.authorEn, storedPath, publicUrl, updated: true });
  }

  console.log("\nLegacy fallback URLs:");
  for (const item of results) {
    console.log(`  ${item.authorEn}: ${item.publicUrl}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
