/**
 * Set featured_image_path for KVK pages that have no college_banner in MySQL.
 * Live hau.ac.in uses CSS `#intro { background: url(../images/intro.jpg) }`
 * when a college has no custom banner — that is the image shown on
 * https://hau.ac.in/college/krishi-vigyan-kendra-jind
 *
 * Usage:
 *   node fix-kvk-missing-banners.mjs --dry-run
 *   node fix-kvk-missing-banners.mjs --confirm
 *   node fix-kvk-missing-banners.mjs --slug=krishi-vigyan-kendra-jind --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CACHE_DIR = join(REPORT_DIR, "hau-images-cache");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run") || !CONFIRM;

const LIVE_INTRO = "https://hau.ac.in/public/images/intro.jpg";

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

const ONLY_SLUG = argValue("--slug");

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

function loadFromWeb(name) {
  return createRequire(join(ROOT, "apps/web/package.json"))(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");
const { BlobServiceClient, StorageSharedKeyCredential } = loadFromWeb(
  "@azure/storage-blob",
);

function contentTypeFor(fileName) {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function isRealFeaturedPath(path) {
  if (!path || path === "pending") return false;
  if (/legacy-pending/i.test(path)) return false;
  if (/\.php(\?|$)/i.test(path)) return false;
  if (/unsplash\.com/i.test(path)) return false;
  return /ccshaucontainer\/pages\/(featured|hero)\//i.test(path) ||
    /legacy-images\/intro\.jpg$/i.test(path);
}

function getBlobServiceClient() {
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
  return null;
}

async function loadIntroBytes() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, "intro.jpg");
  if (existsSync(cachePath)) return readFile(cachePath);
  const locals = [
    join(
      process.env.LEGACY_UPLOADS_ROOT?.trim() ||
        "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public",
      "images",
      "intro.jpg",
    ),
    join("C:\\Jatin\\Projects\\CCHAU_mysql\\public\\images\\intro.jpg"),
  ];
  const local = locals.find((p) => existsSync(p));
  let bytes;
  if (local) {
    bytes = await readFile(local);
  } else {
    const res = await fetch(LIVE_INTRO);
    if (!res.ok) throw new Error(`download intro.jpg failed: ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
  }
  await writeFile(cachePath, bytes);
  return bytes;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const blobClient = getBlobServiceClient();
  if (!blobClient) throw new Error("Missing Azure storage credentials");

  const containerName =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER?.trim() ||
    "ccshaucontainer";
  const container = blobClient.getContainerClient(containerName);
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from("ccshau_pages")
    .select("id, slug, featured_image_path")
    .like("slug", "krishi-vigyan-kendra-%")
    .order("slug");
  if (ONLY_SLUG) query = query.eq("slug", ONLY_SLUG);

  const { data: pages, error } = await query;
  if (error) throw new Error(error.message);

  const missing = (pages || []).filter((page) => !isRealFeaturedPath(page.featured_image_path));
  console.log(
    `${DRY_RUN ? "dry-run" : "apply"} ${missing.length} KVK page(s) missing a banner`,
  );

  const bytes = missing.length ? await loadIntroBytes() : Buffer.alloc(0);
  const report = { mode: DRY_RUN ? "dry-run" : "apply", updated: [], skipped: [] };

  for (const page of pages || []) {
    if (isRealFeaturedPath(page.featured_image_path)) {
      report.skipped.push({ slug: page.slug, featured: page.featured_image_path });
      continue;
    }
    const blobPath = `pages/featured/${page.id}/intro.jpg`;
    const stored = `${containerName}/${blobPath}`;
    console.log(`  ${page.slug}: ${page.featured_image_path || "null"} → ${stored}`);
    if (!DRY_RUN) {
      await container.getBlockBlobClient(blobPath).uploadData(bytes, {
        blobHTTPHeaders: { blobContentType: contentTypeFor("intro.jpg") },
      });
      const { error: updateErr } = await supabase
        .from("ccshau_pages")
        .update({ featured_image_path: stored })
        .eq("id", page.id);
      if (updateErr) throw new Error(`${page.slug}: ${updateErr.message}`);
    }
    report.updated.push({ slug: page.slug, stored });
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "fix-kvk-missing-banners.json");
  await writeFile(out, JSON.stringify(report, null, 2));
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
