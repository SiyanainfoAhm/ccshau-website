#!/usr/bin/env node
/**
 * Migrate hau.ac.in/public file URLs inside ccshau_pages.content_en
 * → Azure, and replace the SAME URL in content_hi as well.
 *
 * Matches: content_en LIKE '%https://hau.ac.in/public%'
 *
 *   node scripts/ops/migrate-pages-hau-public.mjs
 *   node scripts/ops/migrate-pages-hau-public.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/pages-hau-public-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const URL_RE = /https?:\/\/(?:www\.)?hau\.ac\.in\/public\/[^\s"'<>)]+/gi;

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

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    }[e] || "application/octet-stream"
  );
}

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function normalizeUrl(u) {
  return u.replace(/[.,;)]+$/, "").trim();
}

function extractUrls(html) {
  if (!html) return [];
  return [...new Set([...(html.match(URL_RE) ?? []).map(normalizeUrl)])];
}

/** Match SPIO convention for pages-pdf; otherwise preserve public/ path. */
function blobPathForHauPublicUrl(hauUrl) {
  const url = new URL(hauUrl);
  const path = url.pathname.replace(/^\/+/, ""); // public/pages-pdf/x.pdf
  const m = path.match(/^public\/pages-pdf\/(.+)$/i);
  if (m) return `pages-pdf/${m[1]}`;
  return `legacy-storage/${path}`;
}

async function ensureAzure(containerClient, cache, hauUrl) {
  const key = normalizeUrl(hauUrl);
  if (cache.has(key)) return cache.get(key);

  const blobPath = blobPathForHauPublicUrl(key);
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);

  if (await blob.exists()) {
    const result = { stored, publicUrl, reused: true, blobPath };
    cache.set(key, result);
    return result;
  }

  mkdirSync(CACHE, { recursive: true });
  const fileName = basename(new URL(key).pathname) || "file.bin";
  const cacheFile = join(
    CACHE,
    `${createHash("sha1").update(key).digest("hex").slice(0, 12)}-${fileName.replace(/[\\/]/g, "_")}`,
  );
  let buf;
  if (existsSync(cacheFile)) {
    buf = readFileSync(cacheFile);
  } else {
    const r = await fetch(key, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,image/*,*/*",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error(`too small (${buf.length})`);
    await writeFile(cacheFile, buf);
  }

  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  const result = { stored, publicUrl, reused: false, bytes: buf.length, blobPath };
  cache.set(key, result);
  return result;
}

function replaceAllUrls(html, replacements) {
  if (!html) return html;
  let out = html;
  for (const [from, to] of replacements) {
    if (out.includes(from)) out = out.split(from).join(to);
    // also http vs https / www variants that might appear in hi
    const alt = from.replace(/^https:\/\//i, "http://");
    if (alt !== from && out.includes(alt)) out = out.split(alt).join(to);
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: pages, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en, content_hi")
    .ilike("content_en", "%https://hau.ac.in/public%");
  if (error) throw error;

  const unique = new Map(); // url -> slugs
  for (const p of pages ?? []) {
    for (const u of extractUrls(p.content_en)) {
      if (!unique.has(u)) unique.set(u, []);
      unique.get(u).push(p.slug);
    }
  }

  console.log(`pages with hau.ac.in/public in content_en: ${pages?.length ?? 0}`);
  console.log(`unique files: ${unique.size}`);
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  for (const [u, slugs] of unique) {
    console.log(`  ${u}`);
    console.log(`    → ${slugs.join(", ")} → ${blobPathForHauPublicUrl(u)}`);
  }

  if (!pages?.length) return;
  if (!APPLY) {
    console.log("Pass --apply to upload + update content_en and content_hi.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const fileCache = new Map();
  const replacements = []; // [legacy, azure]
  let uploaded = 0;
  let reused = 0;
  let failedFiles = 0;

  for (const hauUrl of unique.keys()) {
    try {
      const res = await ensureAzure(container, fileCache, hauUrl);
      replacements.push([hauUrl, res.publicUrl]);
      if (res.reused) {
        reused++;
        console.log(`  reuse ${hauUrl} → ${res.publicUrl}`);
      } else {
        uploaded++;
        console.log(`  up ${res.bytes}b ${hauUrl} → ${res.publicUrl}`);
      }
    } catch (e) {
      failedFiles++;
      console.log(`  FAIL file ${hauUrl}: ${e.message}`);
    }
  }

  let updated = 0;
  let skipped = 0;
  for (const page of pages) {
    const enUrls = extractUrls(page.content_en);
    const usable = replacements.filter(([from]) => enUrls.includes(from));
    if (!usable.length) {
      skipped++;
      console.log(`  SKIP page ${page.slug}: no successful file uploads for its urls`);
      continue;
    }

    const content_en = replaceAllUrls(page.content_en, usable);
    const content_hi = replaceAllUrls(page.content_hi, usable);

    if (content_en === page.content_en && content_hi === page.content_hi) {
      skipped++;
      console.log(`  SKIP page ${page.slug}: already azure?`);
      continue;
    }

    // Ensure HI got the same file URL(s) as EN after rewrite
    for (const [, azureUrl] of usable) {
      if (content_en.includes(azureUrl) && content_hi && !content_hi.includes(azureUrl)) {
        console.log(`  WARN ${page.slug}: content_hi missing azure url ${azureUrl} (no matching legacy url in hi)`);
      }
    }

    const { error: upErr } = await supabase
      .from("ccshau_pages")
      .update({
        content_en,
        content_hi,
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);
    if (upErr) throw new Error(`${page.slug}: ${upErr.message}`);
    updated++;
    console.log(`  OK ${page.slug} (en+hi)`);
  }

  const { data: remaining } = await supabase
    .from("ccshau_pages")
    .select("id, slug")
    .ilike("content_en", "%https://hau.ac.in/public%");

  console.log("\nSummary:");
  console.log(`  files uploaded: ${uploaded}`);
  console.log(`  files reused: ${reused}`);
  console.log(`  files failed: ${failedFiles}`);
  console.log(`  pages updated: ${updated}`);
  console.log(`  pages skipped: ${skipped}`);
  console.log(`  remaining pages with hau/public in content_en: ${remaining?.length ?? 0}`);
  for (const r of remaining ?? []) console.log(`  leftover ${r.slug}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
