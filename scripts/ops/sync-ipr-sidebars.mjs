#!/usr/bin/env node
/**
 * Fill empty IPR Cell sidebar HTML tabs from legacy department pages:
 *   https://hau.ac.in/department/MjA=/NzQ=
 *
 *   node scripts/ops/sync-ipr-sidebars.mjs
 *   node scripts/ops/sync-ipr-sidebars.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/ipr-sidebar-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const IPR_PAGE_ID = "6d775969-a631-41fb-a78f-3c2618327bd0";

/** Tabs with empty content_en on local (PDF-only tabs already have short HTML). */
const TABS = [
  {
    labelEn: "Objectives",
    labelHi: "उद्देश्य",
    legacyUrl: "https://hau.ac.in/page/objectives-7",
  },
  {
    labelEn: "Responsibilities",
    labelHi: "उत्तरदायित्व",
    legacyUrl: "https://hau.ac.in/page/responsibilities",
  },
  {
    labelEn: "Intellectual Property",
    labelHi: "बौद्धिक संपदा",
    legacyUrl: "https://hau.ac.in/page/intellectual-property",
  },
  {
    labelEn: "Links",
    labelHi: "लिंक",
    legacyUrl: "https://hau.ac.in/page/links",
  },
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

function extractBlogContent(html) {
  const m = html.match(
    /<div class="blog-single-img">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*(?:<!--|<\/section>|<footer)/i,
  );
  if (m?.[1]) return m[1].trim();
  const m2 = html.match(/<div class="blog-single-img">([\s\S]*?)<\/div>/i);
  return (m2?.[1] ?? "").trim();
}

function extractHauFileUrls(html) {
  const urls = new Set();
  for (const m of html.matchAll(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/(?:storage\/app\/uploads|public\/)[^"'\\\s>]+/gi,
  )) {
    urls.add(m[0].replace(/&amp;/g, "&"));
  }
  return [...urls];
}

function blobPathFor(hauUrl) {
  const u = new URL(hauUrl);
  const path = u.pathname.replace(/^\/+/, "");
  if (path.startsWith("storage/app/uploads/")) {
    return `legacy-storage/${path.slice("storage/app/uploads/".length)}`;
  }
  return `legacy-storage/${path}`;
}

async function ensureAzure(container, hauUrl) {
  const blobPath = blobPathFor(hauUrl);
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = container.getBlockBlobClient(blobPath);
  if (await blob.exists()) return { publicUrl, reused: true, stored };

  mkdirSync(CACHE, { recursive: true });
  const fileName = basename(new URL(hauUrl).pathname) || "file.bin";
  const cacheFile = join(
    CACHE,
    `${createHash("sha1").update(hauUrl).digest("hex").slice(0, 12)}-${fileName.replace(/[\\/]/g, "_")}`,
  );
  let buf;
  if (existsSync(cacheFile)) {
    buf = readFileSync(cacheFile);
  } else {
    const r = await fetch(hauUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${r.status} ${hauUrl}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error(`too small ${buf.length}`);
    await writeFile(cacheFile, buf);
  }
  const ext = fileName.toLowerCase().split(".").pop();
  const ct =
    ext === "pdf"
      ? "application/pdf"
      : ext === "doc"
        ? "application/msword"
        : "application/octet-stream";
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: ct },
    overwrite: true,
  });
  return { publicUrl, reused: false, bytes: buf.length, stored };
}

function rewriteUrls(html, map) {
  let out = html;
  for (const [from, to] of map) {
    out = out.split(from).join(to);
    out = out.split(from.replace(/&/g, "&amp;")).join(to);
  }
  return out;
}

function toHindiShell(html, labelHi) {
  return html
    .replace(/Ownership of Intellectual Property:/gi, "बौद्धिक संपदा का स्वामित्व:")
    .replace(
      /Responsibilities of Faculty, Students and Supporting Staff/gi,
      "संकाय, छात्र एवं सहायक कर्मचारियों के उत्तरदायित्व",
    )
    .replace(/Last Updated\s*:-?/gi, "अंतिम अद्यतन :-")
    .replace(/Official Journal of The patent Office, Govt\. of India/gi, "भारत सरकार का पेटेंट कार्यालय का आधिकारिक जर्नल")
    .replace(/World Intellectual Property Organization \(WIPO\)/gi, "विश्व बौद्धिक संपदा संगठन (WIPO)")
    .replace(/Intellectual Property, India/gi, "बौद्धिक संपदा, भारत");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  const prepared = [];
  for (const tab of TABS) {
    console.log(`\nFetching ${tab.legacyUrl}`);
    const html = await (
      await fetch(tab.legacyUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      })
    ).text();
    let content = extractBlogContent(html);
    if (!content || content.length < 40) throw new Error(`No content for ${tab.labelEn}`);
    // Strip legacy "Last Updated" noise if duplicated by our UI — keep as in legacy for parity
    const files = extractHauFileUrls(content);
    console.log(`  html ${content.length} chars, files ${files.length}`);
    prepared.push({ ...tab, content, files });
  }

  if (!APPLY) {
    for (const p of prepared) {
      console.log(`\n${p.labelEn} preview:`, p.content.replace(/\s+/g, " ").slice(0, 240));
    }
    console.log("\nPass --apply to upload files + update sidebar content.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const urlMap = new Map();
  let uploaded = 0;
  let reused = 0;
  let failed = 0;

  const allFiles = [...new Set(prepared.flatMap((p) => p.files))];
  for (const f of allFiles) {
    try {
      const res = await ensureAzure(container, f);
      urlMap.set(f, res.publicUrl);
      if (res.reused) reused++;
      else uploaded++;
      console.log(`  ${res.reused ? "reuse" : "up"} ${basename(f)}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${f}: ${e.message}`);
      urlMap.set(f, f);
    }
  }

  const replacements = [...urlMap.entries()];
  const now = new Date().toISOString();

  for (const p of prepared) {
    const content_en = rewriteUrls(p.content, replacements);
    const content_hi = toHindiShell(content_en, p.labelHi);
    const { data: row, error } = await sb
      .from("ccshau_page_sidebar_items")
      .select("id, label_en")
      .eq("page_id", IPR_PAGE_ID)
      .eq("label_en", p.labelEn)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error(`Sidebar missing: ${p.labelEn}`);
    const { error: upErr } = await sb
      .from("ccshau_page_sidebar_items")
      .update({
        content_en,
        content_hi,
        label_hi: p.labelHi,
        is_active: true,
        updated_at: now,
      })
      .eq("id", row.id);
    if (upErr) throw upErr;
    console.log(`OK ${p.labelEn} → content_en ${content_en.length}`);
  }

  console.log(`\nSummary: uploaded=${uploaded} reused=${reused} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
