#!/usr/bin/env node
/**
 * Fix RTI #15 Seema Rani — restore empty file_path by uploading local/legacy PDF.
 *   node scripts/legacy-import/fix-rti-15-seema-rani.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const ID = "68f94976-d4ec-460c-9de1-b502be6fed62";
const FILE = "fyhNFx43VMnKpZsyaMomtEsmqinjPkyxisFvZ15Z.pdf";
const LOCAL = join("C:/Jatin/Projects/CCHAU_mysql/uploads/uploads/rti-pdf", FILE);
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
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  let buf;
  if (existsSync(LOCAL)) {
    buf = await readFile(LOCAL);
    console.log("Loaded local", LOCAL, buf.length);
  } else {
    const r = await fetch(
      `https://hau.ac.in/storage/app/uploads/rti-pdf/${FILE}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/pdf,*/*",
          Referer: "https://hau.ac.in/rti",
        },
      },
    );
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    console.log("Loaded remote", buf.length);
  }

  const blobPath = `downloads/${ID}/${FILE}`;
  const storedPath = `${CONTAINER}/${blobPath}`;
  console.log({ mode: APPLY ? "APPLY" : "dry-run", id: ID, storedPath, bytes: buf.length });

  if (!APPLY) {
    console.log("Pass --apply to upload and update row.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  await container.getBlockBlobClient(blobPath).uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
    overwrite: true,
  });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase
    .from("ccshau_downloads")
    .update({
      file_path: storedPath,
      file_name: FILE,
      file_size: buf.length,
      mime_type: "application/pdf",
      status: "published",
      is_public: true,
      category: "rti",
      version: "15",
    })
    .eq("id", ID);
  if (error) throw error;
  console.log("Updated", ID);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
