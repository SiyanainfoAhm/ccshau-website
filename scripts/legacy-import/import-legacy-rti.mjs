#!/usr/bin/env node
/**
 * Import legacy RTI documents (https://hau.ac.in/rti) into ccshau_downloads
 * (category=rti) and upload PDFs to Azure under downloads/{id}/.
 *
 *   node scripts/legacy-import/import-legacy-rti.mjs
 *   node scripts/legacy-import/import-legacy-rti.mjs --apply
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const LEGACY_BASE = "https://hau.ac.in";
const LOCAL_PDF_ROOT = join("C:/Jatin/Projects/CCHAU_mysql/uploads/uploads/rti-pdf");
const CACHE = join(__dirname, "reports/rti-pdf-cache");
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

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileName(name) {
  return basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function parseLegacyPage(page) {
  const r = await fetch(`${LEGACY_BASE}/rti?page=${page}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: `${LEGACY_BASE}/rti`,
    },
  });
  if (!r.ok) throw new Error(`rti?page=${page} → ${r.status}`);
  const h = await r.text();
  const rows = [];
  const re =
    /<tr>[\s\S]*?<td[^>]*>\s*(\d+)\.?[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(h))) {
    rows.push({
      n: Number(m[1]),
      href: m[2].replace(/&amp;/g, "&"),
      title: decodeHtml(m[3].replace(/<[^>]+>/g, "")),
      fileName: basename(m[2].replace(/&amp;/g, "&").split("?")[0]),
    });
  }
  return rows;
}

async function loadPdfBuffer(fileName) {
  const localPath = join(LOCAL_PDF_ROOT, fileName);
  if (existsSync(localPath)) {
    return { buf: await readFile(localPath), from: localPath };
  }
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  if (existsSync(cachePath)) {
    return { buf: await readFile(cachePath), from: cachePath };
  }
  const url = `${LEGACY_BASE}/storage/app/uploads/rti-pdf/${fileName}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/pdf,*/*",
      Referer: `${LEGACY_BASE}/rti`,
    },
  });
  if (!r.ok) throw new Error(`fetch ${fileName} → ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 200) throw new Error(`PDF too small: ${fileName}`);
  await writeFile(cachePath, buf);
  return { buf, from: url };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const items = [...(await parseLegacyPage(1)), ...(await parseLegacyPage(2))];
  items.sort((a, b) => a.n - b.n);
  console.log({
    mode: APPLY ? "APPLY" : "dry-run",
    count: items.length,
    localPdfExists: existsSync(LOCAL_PDF_ROOT),
    sample: items.slice(0, 3),
  });

  if (!APPLY) {
    console.log("Pass --apply to upload PDFs and upsert ccshau_downloads (category=rti).");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);

  // Hide demo handbook so only legacy list shows on /rti
  await supabase
    .from("ccshau_downloads")
    .update({ status: "archived", is_public: false })
    .eq("file_path", "ccshau-public/demo/rti-handbook.pdf");

  let ok = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const tag = `legacy-rti-${item.n}`;
      const { data: existing } = await supabase
        .from("ccshau_downloads")
        .select("id, file_path")
        .contains("tags", [tag])
        .maybeSingle();

      const id = existing?.id ?? randomUUID();
      const safeName = sanitizeFileName(item.fileName);
      const blobPath = `downloads/${id}/${safeName}`;
      const storedPath = `${CONTAINER}/${blobPath}`;
      const blob = container.getBlockBlobClient(blobPath);

      let fileSize = null;
      if (!(await blob.exists())) {
        let buf;
        try {
          ({ buf } = await loadPdfBuffer(item.fileName));
        } catch (e) {
          console.warn(`PDF missing for #${item.n}, creating titled stub (${e.message})`);
          const escape = (s) =>
            s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
          const stream = `BT /F1 12 Tf 50 720 Td (${escape(item.title.slice(0, 100))}) Tj ET`;
          const objects = [
            "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
            "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
            "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
            `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
            "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
          ];
          let body = "%PDF-1.4\n";
          const offsets = [0];
          for (const obj of objects) {
            offsets.push(Buffer.byteLength(body, "utf8"));
            body += obj;
          }
          const xrefStart = Buffer.byteLength(body, "utf8");
          body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
          for (let i = 1; i < offsets.length; i++) {
            body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
          }
          body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
          buf = Buffer.from(body, "utf8");
        }
        await blob.uploadData(buf, {
          blobHTTPHeaders: { blobContentType: "application/pdf" },
          overwrite: true,
        });
        fileSize = buf.length;
      } else {
        fileSize = (await blob.getProperties()).contentLength ?? null;
      }

      const row = {
        title_en: item.title,
        title_hi: null,
        category: "rti",
        version: String(item.n),
        file_path: storedPath,
        file_name: safeName,
        file_size: fileSize,
        mime_type: "application/pdf",
        status: "published",
        is_public: true,
        published_at: new Date().toISOString(),
        tags: [tag, "rti"],
      };

      if (existing?.id) {
        const { error } = await supabase.from("ccshau_downloads").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ccshau_downloads").insert({ id, ...row });
        if (error) throw error;
      }
      ok++;
      console.log(`OK #${item.n}: ${item.title.slice(0, 60)}`);
    } catch (e) {
      failed++;
      console.error(`FAIL #${item.n}:`, e?.message || e);
    }
  }

  console.log({ ok, failed, total: items.length });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
