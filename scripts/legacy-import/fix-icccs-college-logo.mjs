/**
 * Upload ICCCS college logo from local legacy dump and set logo_image_path
 * so department heroes fall back to a working college logo.
 *
 * Usage: node fix-icccs-college-logo.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = requireFromWeb("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const LOCAL_LOGO =
  process.env.ICCCS_LOGO_PATH?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public\\images\\college\\logo\\9\\1741857160.jpg";

const SLUGS = ["ic-college-of-community-science", "ic-college-of-home-science"];
const FILE_NAME = basename(LOCAL_LOGO);

function contentTypeFor(path) {
  const e = extname(path).toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  if (e === ".gif") return "image/gif";
  return "image/jpeg";
}

if (!existsSync(LOCAL_LOGO)) {
  throw new Error(`Local logo missing: ${LOCAL_LOGO}`);
}

const { data: pages, error } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, logo_image_path")
  .in("slug", SLUGS);
if (error) throw new Error(error.message);
if (!pages?.length) throw new Error("ICCCS college pages not found");

console.log(
  "Pages:",
  pages.map((p) => ({ slug: p.slug, logo: p.logo_image_path })),
);
console.log("Local:", LOCAL_LOGO, "confirm=", CONFIRM);

if (!CONFIRM) {
  console.log("Dry-run only. Re-run with --confirm to upload + update.");
  process.exit(0);
}

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER ||
  process.env.AZURE_STORAGE_CONTAINER ||
  "ccshaucontainer";
if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING missing");

const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
  containerName,
);
const buf = await readFile(LOCAL_LOGO);

for (const page of pages) {
  const blobPath = `pages/logo/${page.id}/${FILE_NAME}`;
  const block = container.getBlockBlobClient(blobPath);
  await block.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(LOCAL_LOGO) },
  });
  const stored = `${containerName}/${blobPath}`;
  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({ logo_image_path: stored })
    .eq("id", page.id);
  if (upErr) throw new Error(`${page.slug}: ${upErr.message}`);
  console.log("Updated", page.slug, "→", stored);
}

console.log("Done. Department heroes inherit college.logoImageUrl when dept logo is null.");
