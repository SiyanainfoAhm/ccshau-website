#!/usr/bin/env node
/**
 * Sync Nehru Library backlog/roster PDF from legacy
 *   https://hau.ac.in/public/pages-pdf/1721969757.pdf
 * → Azure pages-pdf/1721969757.pdf
 * → page slug instructions-relating-to-backlog-vacancies-roster
 *
 *   node scripts/ops/sync-nehru-backlog-pdf.mjs
 *   node scripts/ops/sync-nehru-backlog-pdf.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_SLUG = "instructions-relating-to-backlog-vacancies-roster";
const PDF_FILE = "1721969757.pdf";
const LEGACY_PDF = `https://hau.ac.in/public/pages-pdf/${PDF_FILE}`;
const CACHE = join(__dirname, "../legacy-import/reports/hau-pages-pdf-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const TITLE_EN = "Instructions Relating to Backlog Vacancies, Roster";
const TITLE_HI = "बकाया रिक्तियों, रोस्टर संबंधी निर्देश";

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

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function pdfHtml(pdfUrl, title) {
  return `<iframe src="${pdfUrl}" title="${title}" width="100%" height="720" loading="lazy"></iframe>`;
}

async function ensurePdf(containerClient) {
  const blobPath = `pages-pdf/${PDF_FILE}`;
  const publicUrl = azurePublicUrl(`${CONTAINER}/${blobPath}`);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) {
    return { publicUrl, reused: true };
  }

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, PDF_FILE);
  let buf = null;
  let from = null;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
    from = cachePath;
  } else {
    const r = await fetch(LEGACY_PDF, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch PDF ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    from = LEGACY_PDF;
    await writeFile(cachePath, buf);
  }
  if (buf.length < 1000) throw new Error(`PDF too small (${buf.length})`);

  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
    overwrite: true,
  });
  return { publicUrl, reused: false, from, bytes: buf.length };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en, content_hi")
    .eq("slug", PAGE_SLUG)
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error(`Page not found: ${PAGE_SLUG}`);

  const plannedUrl = azurePublicUrl(`${CONTAINER}/pages-pdf/${PDF_FILE}`);
  console.log({
    mode: APPLY ? "APPLY" : "dry-run",
    page: PAGE_SLUG,
    legacy: LEGACY_PDF,
    azure: plannedUrl,
    currentEn: (page.content_en || "").slice(0, 160),
  });

  if (!APPLY) {
    console.log("Pass --apply to upload PDF (if needed) and update content_en/content_hi.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const uploaded = await ensurePdf(container);
  console.log("PDF:", uploaded);

  const content_en = pdfHtml(uploaded.publicUrl, TITLE_EN);
  const content_hi = pdfHtml(uploaded.publicUrl, TITLE_HI);

  const { error: upErr } = await supabase
    .from("ccshau_pages")
    .update({
      content_en,
      content_hi,
      excerpt_en: TITLE_EN,
      excerpt_hi: TITLE_HI,
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (upErr) throw upErr;
  console.log("Updated page with Azure PDF iframe.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
