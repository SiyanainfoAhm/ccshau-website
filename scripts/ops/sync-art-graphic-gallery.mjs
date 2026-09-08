#!/usr/bin/env node
/**
 * Fill Art & Graphic Gallery sidebar from legacy PDF:
 *   https://hau.ac.in/page/art-graphic-gallery
 *   → https://hau.ac.in/public/pages-pdf/1780034968.pdf
 *
 *   node scripts/ops/sync-art-graphic-gallery.mjs
 *   node scripts/ops/sync-art-graphic-gallery.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/art-gallery-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const PAGE_ID = "e23eb90a-5eff-4599-a80c-cdeed5b811d7";
const LEGACY_PDF = "https://hau.ac.in/public/pages-pdf/1780034968.pdf";
const LABEL_EN = "Art & Graphic Gallery";
const LABEL_HI = "कला एवं ग्राफिक गैलरी";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function ensurePdf(container) {
  const blobPath = "pages-pdf/1780034968.pdf";
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = container.getBlockBlobClient(blobPath);
  if (await blob.exists()) {
    const props = await blob.getProperties();
    if ((props.contentLength ?? 0) > 1000) {
      return { publicUrl, reused: true, stored };
    }
  }

  mkdirSync(CACHE, { recursive: true });
  const cacheFile = join(CACHE, "1780034968.pdf");
  let buf;
  if (existsSync(cacheFile) && readFileSync(cacheFile).length > 1000) {
    buf = readFileSync(cacheFile);
  } else {
    const r = await fetch(LEGACY_PDF, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
        Referer: "https://hau.ac.in/page/art-graphic-gallery",
      },
    });
    if (!r.ok) throw new Error(`PDF fetch ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) throw new Error(`PDF too small ${buf.length}`);
    await writeFile(cacheFile, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
    overwrite: true,
  });
  return { publicUrl, reused: false, bytes: buf.length, stored };
}

function pdfHtml(url, label) {
  return `<a href="${url}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${label}</strong></span></a>`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("Will set Art & Graphic Gallery → legacy PDF", LEGACY_PDF);

  // Also add empty-state safety: verify Achievers already has PDF
  const { data: row, error } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,content_en")
    .eq("page_id", PAGE_ID)
    .eq("label_en", LABEL_EN)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Sidebar row missing");
  console.log("current content_en len", (row.content_en || "").length);

  if (!APPLY) {
    console.log("Pass --apply to upload PDF + update sidebar.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const pdf = await ensurePdf(container);
  console.log(`PDF ${pdf.reused ? "reuse" : "up"} ${pdf.publicUrl} (${pdf.bytes ?? "exists"})`);

  const content_en = pdfHtml(pdf.publicUrl, LABEL_EN);
  const content_hi = `<p>${pdfHtml(pdf.publicUrl, LABEL_HI)}</p>`;
  const now = new Date().toISOString();

  const { error: upErr } = await sb
    .from("ccshau_page_sidebar_items")
    .update({
      content_en,
      content_hi,
      label_hi: LABEL_HI,
      is_active: true,
      updated_at: now,
    })
    .eq("id", row.id);
  if (upErr) throw upErr;
  console.log("OK gallery sidebar content set");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
