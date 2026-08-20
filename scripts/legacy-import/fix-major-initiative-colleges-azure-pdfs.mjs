/**
 * Migrate hau.ac.in/storage/app/uploads PDF (and other file) links → Azure
 * for Major Initiative college microsites:
 *   sports-facilities, experiential-learning-programme,
 *   deendayal-..., agri-tourism-center
 *
 * Usage:
 *   node fix-major-initiative-colleges-azure-pdfs.mjs --dry-run
 *   node fix-major-initiative-colleges-azure-pdfs.mjs --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CACHE_DIR = join(REPORT_DIR, "major-initiatives-storage-cache");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = !CONFIRM;

const COLLEGE_IDS = [
  "bf8bef31-42b3-4a76-8fdb-7ae882d01ae4", // sports-facilities
  "25271522-2df4-4200-9d1d-34a7aaa89d2a", // experiential-learning-programme
  "0d68f527-6616-4578-ae9f-dd69b94144fe", // deendayal...
  "6c837a4d-697c-4f29-beff-6cd16c1d57ab", // agri-tourism-center
];

const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

/** Any hau.ac.in asset that ends in a document/media extension */
const HAU_FILE_RE =
  /https?:\/\/(?:www\.)?hau\.ac\.in\/(?:storage\/app\/uploads|public\/pages-pdf)\/[^\s"'<>)\\]+/gi;

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
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
  const map = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return map[e] || "application/octet-stream";
}

function sanitizeFileName(name) {
  return String(name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function collectUrls(text) {
  const urls = new Set();
  if (!text) return urls;
  const re = new RegExp(HAU_FILE_RE.source, "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    urls.add(m[0].replace(/[),.;]+$/, ""));
  }
  return urls;
}

function rewriteHtml(html, urlMap) {
  let next = html;
  let changed = false;
  for (const [from, to] of urlMap) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      changed = true;
    }
  }
  return { next, changed };
}

function blobPathFor(hauUrl) {
  const path = new URL(hauUrl).pathname;
  const fileName = sanitizeFileName(basename(path));
  if (/\/public\/pages-pdf\//i.test(path)) {
    return `pages-pdf/${fileName}`;
  }
  return `legacy-storage/major-initiatives/${fileName}`;
}

function altHauUrls(url) {
  const u = String(url);
  const variants = new Set([u]);
  if (u.includes("://www.hau.ac.in/")) {
    variants.add(u.replace("://www.hau.ac.in/", "://hau.ac.in/"));
  } else if (u.includes("://hau.ac.in/")) {
    variants.add(u.replace("://hau.ac.in/", "://www.hau.ac.in/"));
  }
  return [...variants];
}

async function downloadFromHau(url, dest) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/pdf,image/*,*/*",
    Referer: "https://hau.ac.in/",
  };
  let lastErr = null;
  for (const candidate of altHauUrls(url)) {
    try {
      const r = await fetch(candidate, { headers, redirect: "follow" });
      if (!r.ok) {
        lastErr = new Error(`download ${r.status} ${candidate}`);
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 50) {
        lastErr = new Error(`download too small ${candidate}`);
        continue;
      }
      mkdirSync(dirname(dest), { recursive: true });
      await writeFile(dest, buf);
      return buf;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`download failed ${url}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const container = CONFIRM
    ? BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER)
    : null;

  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  const targets = [];

  for (const collegeId of COLLEGE_IDS) {
    const { data: sidebars, error: sbErr } = await sb
      .from("ccshau_page_sidebar_items")
      .select("id,label_en,content_en,content_hi,href")
      .eq("page_id", collegeId);
    if (sbErr) throw new Error(sbErr.message);
    for (const row of sidebars || []) {
      targets.push({
        table: "ccshau_page_sidebar_items",
        id: row.id,
        label: row.label_en,
        fields: {
          content_en: row.content_en || "",
          content_hi: row.content_hi || "",
          href: row.href || "",
        },
      });
    }

    const { data: pages, error: pageErr } = await sb
      .from("ccshau_pages")
      .select("id,slug,content_en,content_hi")
      .or(`id.eq.${collegeId},college_root_id.eq.${collegeId}`);
    if (pageErr) throw new Error(pageErr.message);
    for (const row of pages || []) {
      targets.push({
        table: "ccshau_pages",
        id: row.id,
        label: row.slug,
        fields: {
          content_en: row.content_en || "",
          content_hi: row.content_hi || "",
        },
      });
    }
  }

  const allUrls = new Set();
  for (const t of targets) {
    for (const val of Object.values(t.fields)) {
      for (const u of collectUrls(val)) allUrls.add(u);
    }
  }

  console.log(
    DRY_RUN ? "dry-run" : "apply",
    "major-initiative hau file URLs:",
    allUrls.size,
  );

  const urlMap = [];
  const report = {
    mode: CONFIRM ? "apply" : "dry-run",
    urls: {},
    rewrittenRows: 0,
    uploaded: 0,
    skippedExisting: 0,
    failed: [],
  };

  for (const hauUrl of allUrls) {
    const fileName = sanitizeFileName(basename(new URL(hauUrl).pathname));
    const blobPath = blobPathFor(hauUrl);
    const stored = `${CONTAINER}/${blobPath}`;
    const publicUrl = azurePublicUrl(stored);
    const cachePath = join(CACHE_DIR, fileName);

    try {
      let buf;
      if (existsSync(cachePath)) {
        buf = await readFile(cachePath);
      } else {
        buf = await downloadFromHau(hauUrl, cachePath);
      }

      if (CONFIRM) {
        const blob = container.getBlockBlobClient(blobPath);
        if (await blob.exists()) {
          report.skippedExisting += 1;
        } else {
          await blob.uploadData(buf, {
            blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
          });
          report.uploaded += 1;
        }
      }

      for (const variant of altHauUrls(hauUrl)) {
        urlMap.push([variant, publicUrl]);
      }
      report.urls[hauUrl] = {
        status: CONFIRM ? "mapped" : "planned",
        publicUrl,
        bytes: buf.length,
      };
      console.log((CONFIRM ? "map" : "plan"), fileName, "->", publicUrl);
    } catch (e) {
      report.failed.push({ url: hauUrl, error: e.message });
      console.error("FAIL", fileName, e.message);
    }
  }

  if (urlMap.length) {
    for (const target of targets) {
      const patch = {};
      let changed = false;
      for (const [col, val] of Object.entries(target.fields)) {
        const r = rewriteHtml(val, urlMap);
        if (r.changed) {
          patch[col] = r.next || null;
          changed = true;
        }
      }
      if (!changed) continue;
      report.rewrittenRows += 1;
      if (CONFIRM) {
        const { error } = await sb
          .from(target.table)
          .update(patch)
          .eq("id", target.id);
        if (error) {
          report.failed.push({
            table: target.table,
            id: target.id,
            label: target.label,
            error: error.message,
          });
        } else {
          console.log("rewrote", target.table, target.label);
        }
      } else {
        console.log(
          "would rewrite",
          target.table,
          target.label,
          Object.keys(patch),
        );
      }
    }
  }

  const out = join(REPORT_DIR, "fix-major-initiative-colleges-azure-pdfs.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        urls: allUrls.size,
        uploaded: report.uploaded,
        skippedExisting: report.skippedExisting,
        rewrittenRows: report.rewrittenRows,
        failed: report.failed.length,
        report: out,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
