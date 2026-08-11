/**
 * Fix Nematology Awards and Honors: replace HTML "Nil" with legacy PDF 1687536451.pdf
 *
 * Usage:
 *   node fix-nematology-awards-pdf.mjs --dry-run
 *   node fix-nematology-awards-pdf.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE_DIR = join(__dirname, "reports", "hau-pages-pdf-cache");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

const SIDEBAR_ID = "f4fe98df-5289-4e5a-8181-e8157c67cd7c";
const FILE_NAME = "1687536451.pdf";
const LEGACY_PDF = `https://hau.ac.in/public/pages-pdf/${FILE_NAME}`;
const AZURE_URL = `https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/${FILE_NAME}`;
const LOCAL_CANDIDATES = [
  join(
    process.env.LEGACY_UPLOADS_ROOT?.trim() ||
      "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public",
    "pages-pdf",
    FILE_NAME,
  ),
  join("C:\\Jatin\\Projects\\CCHAU_mysql\\public\\pages-pdf", FILE_NAME),
];

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

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

function pdfHtml(url, label) {
  return `<a href="${url}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${label}</strong></span></a>`;
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!url || !key || !connStr) throw new Error("Missing env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const container =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";
  const blobService = BlobServiceClient.fromConnectionString(connStr);
  const containerClient = blobService.getContainerClient(container);
  const block = containerClient.getBlockBlobClient(`pages-pdf/${FILE_NAME}`);

  if (!(await block.exists())) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const cachePath = join(CACHE_DIR, FILE_NAME);
    let bytes;
    if (existsSync(cachePath)) {
      bytes = await readFile(cachePath);
    } else {
      const local = LOCAL_CANDIDATES.find((p) => existsSync(p));
      if (local) {
        console.log(`reading local ${local}`);
        bytes = await readFile(local);
        await writeFile(cachePath, bytes);
      } else {
        console.log(`downloading ${LEGACY_PDF}`);
        const res = await fetch(LEGACY_PDF);
        if (!res.ok) throw new Error(`download failed: ${res.status}`);
        bytes = Buffer.from(await res.arrayBuffer());
        await writeFile(cachePath, bytes);
      }
    }
    if (CONFIRM) {
      await block.uploadData(bytes, {
        blobHTTPHeaders: { blobContentType: "application/pdf" },
        overwrite: true,
      });
      console.log(`uploaded Azure pages-pdf/${FILE_NAME}`);
    } else {
      console.log(`(dry-run) would upload pages-pdf/${FILE_NAME}`);
    }
  } else {
    console.log(`Azure already has pages-pdf/${FILE_NAME}`);
  }

  const content = pdfHtml(AZURE_URL, "Awards and Honors");
  console.log(`→ ${AZURE_URL}`);

  if (CONFIRM) {
    const { error } = await supabase
      .from("ccshau_page_sidebar_items")
      .update({ content_en: content, href: null })
      .eq("id", SIDEBAR_ID);
    if (error) throw new Error(error.message);
    console.log("updated Nematology Awards and Honors → PDF");
  } else {
    console.log("(dry-run) no DB write");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
