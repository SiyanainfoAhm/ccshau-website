#!/usr/bin/env node
/**
 * Backfill RTI #17 (Renu Munjal nomination) — source PDF is missing on hau.ac.in (404)
 * and not present in the local rti-pdf dump. Creates a titled PDF stub on Azure so the
 * public /rti list matches legacy's 17 items.
 *
 *   node scripts/legacy-import/backfill-rti-17.mjs --apply
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const TITLE =
  "Nominate Dr. Renu Munjal, Associate Director, Human Resource Management (DHRM) under RTI Act, 2005";
const TAG = "legacy-rti-17";
const FILE_NAME = "No5ZKdomWF7TvukCijT9ankG2CgxirvC02X4AP6D.pdf";
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

/** Minimal one-page PDF with wrapped title text (no external deps). */
function buildTitlePdf(title) {
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const words = title.split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > 78) {
      lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  lines.push("");
  lines.push("(Source PDF was not available on hau.ac.in storage at import time.)");

  let y = 720;
  const ops = ["BT", "/F1 12 Tf", "50 720 Td", "14 TL"];
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) ops.push(`(${escape(lines[i])}) Tj`);
    else ops.push(`T* (${escape(lines[i])}) Tj`);
    y -= 14;
  }
  ops.push("ET");
  const stream = ops.join("\n");

  const objects = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  console.log({ mode: APPLY ? "APPLY" : "dry-run", title: TITLE, tag: TAG });
  if (!APPLY) {
    console.log("Pass --apply to insert RTI #17 with Azure PDF stub.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: existing } = await supabase
    .from("ccshau_downloads")
    .select("id, file_path")
    .contains("tags", [TAG])
    .maybeSingle();

  const id = existing?.id ?? randomUUID();
  const blobPath = `downloads/${id}/${FILE_NAME}`;
  const storedPath = `${CONTAINER}/${blobPath}`;
  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const blob = container.getBlockBlobClient(blobPath);
  const buf = buildTitlePdf(TITLE);
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
    overwrite: true,
  });

  const row = {
    title_en: TITLE,
    title_hi: null,
    category: "rti",
    version: "17",
    file_path: storedPath,
    file_name: FILE_NAME,
    file_size: buf.length,
    mime_type: "application/pdf",
    status: "published",
    is_public: true,
    published_at: new Date().toISOString(),
    tags: [TAG, "rti"],
  };

  if (existing?.id) {
    const { error } = await supabase.from("ccshau_downloads").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ccshau_downloads").insert({ id, ...row });
    if (error) throw error;
  }

  console.log({ ok: true, id, storedPath, bytes: buf.length });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
