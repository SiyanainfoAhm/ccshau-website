/**
 * Audit + migrate hau.ac.in/storage/app/uploads hotlinks → Azure Blob.
 *
 * Finds every DB text/json field that still points at:
 *   https://hau.ac.in/storage/app/uploads/...
 *   https://www.hau.ac.in/storage/app/uploads/...
 * Uploads local dump file (or downloads from HAU if reachable) and rewrites
 * the path to: ccshaucontainer/legacy-storage/<filename>
 *
 * Usage:
 *   node migrate-hau-storage-uploads.mjs              # audit only
 *   node migrate-hau-storage-uploads.mjs --dry-run    # resolve + plan
 *   node migrate-hau-storage-uploads.mjs --confirm    # upload + rewrite
 *   node migrate-hau-storage-uploads.mjs --confirm --download-missing
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CACHE_DIR = join(REPORT_DIR, "hau-storage-cache");

const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run") || !CONFIRM;
const DOWNLOAD_MISSING = process.argv.includes("--download-missing");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.slice("--limit=".length)) : null;

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
loadEnv(join(ROOT, ".env.local"));

const STORAGE_UPLOADS_ROOT =
  process.env.LEGACY_STORAGE_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\uploads\\uploads";
const UPLOADS_ROOT =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

const HAU_STORAGE_RE =
  /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^\s"'<>)\\]+)/gi;
const HAU_STORAGE_TEST =
  /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\//i;

const TARGETS = [
  { table: "ccshau_downloads", idCol: "id", cols: ["file_path"], kind: "text" },
  {
    table: "ccshau_download_versions",
    idCol: "id",
    cols: ["file_path"],
    kind: "text",
  },
  { table: "ccshau_circulars", idCol: "id", cols: ["file_path"], kind: "text" },
  {
    table: "ccshau_tender_corrigenda",
    idCol: "id",
    cols: ["file_path"],
    kind: "text",
  },
  {
    table: "ccshau_tenders",
    idCol: "id",
    cols: ["cancellation_document_path", "document_paths"],
    kind: "mixed",
  },
  {
    table: "ccshau_news",
    idCol: "id",
    cols: ["attachment_paths", "body_en", "body_hi", "external_url"],
    kind: "mixed",
  },
  {
    table: "ccshau_pages",
    idCol: "id",
    cols: [
      "content_en",
      "content_hi",
      "featured_image_path",
      "logo_image_path",
      "head_image_path",
    ],
    kind: "text",
  },
  {
    table: "ccshau_page_sidebar_items",
    idCol: "id",
    cols: ["content_en", "content_hi"],
    kind: "text",
  },
  {
    table: "ccshau_page_staff",
    idCol: "id",
    cols: ["detail_content_en", "detail_content_hi", "detail_href", "image_path"],
    kind: "text",
  },
  {
    table: "ccshau_page_student_corner_items",
    idCol: "id",
    cols: ["file_path"],
    kind: "text",
  },
  {
    table: "ccshau_page_news_ticker_items",
    idCol: "id",
    cols: ["file_path"],
    kind: "text",
  },
  {
    table: "ccshau_page_gallery_items",
    idCol: "id",
    cols: ["image_url", "thumbnail_url"],
    kind: "text",
  },
  {
    table: "ccshau_banners",
    idCol: "id",
    cols: ["image_path", "target_url"],
    kind: "text",
  },
  {
    table: "ccshau_media_items",
    idCol: "id",
    cols: ["storage_path", "thumbnail_path"],
    kind: "text",
  },
  {
    table: "ccshau_media_albums",
    idCol: "id",
    cols: ["cover_image_path"],
    kind: "text",
  },
  {
    table: "ccshau_homepage_dignitaries",
    idCol: "id",
    cols: ["image_path"],
    kind: "text",
  },
  {
    table: "ccshau_homepage_initiatives",
    idCol: "id",
    cols: ["image_path"],
    kind: "text",
  },
  {
    table: "ccshau_related_links",
    idCol: "id",
    cols: ["url"],
    kind: "text",
  },
  {
    table: "ccshau_url_redirects",
    idCol: "id",
    cols: ["legacy_path", "new_path"],
    kind: "text",
  },
];

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  const map = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp4": "video/mp4",
    ".zip": "application/zip",
  };
  return map[e] || "application/octet-stream";
}

function sanitizeFileName(name) {
  return String(name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extractRelPath(url) {
  const m = String(url).match(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/(.+?)(?:\?|#|$)/i,
  );
  return m ? decodeURIComponent(m[1].replace(/\\/g, "/")) : null;
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function findLocalFile(relPath) {
  const fileName = basename(relPath);
  const candidates = [
    join(STORAGE_UPLOADS_ROOT, relPath),
    join(STORAGE_UPLOADS_ROOT, fileName),
    join(STORAGE_UPLOADS_ROOT, "storage", "app", "uploads", relPath),
    join(STORAGE_UPLOADS_ROOT, "storage", "app", "uploads", fileName),
    join(UPLOADS_ROOT, "storage", "app", "uploads", relPath),
    join(UPLOADS_ROOT, "storage", "app", "uploads", fileName),
    join(CACHE_DIR, fileName),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // shallow scan common subdirs for exact filename
  const dirs = [
    STORAGE_UPLOADS_ROOT,
    join(STORAGE_UPLOADS_ROOT, "circular-pdf"),
    join(STORAGE_UPLOADS_ROOT, "downloads-pdf"),
    join(STORAGE_UPLOADS_ROOT, "college-user"),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      const hit = readdirSync(dir).find((f) => f === fileName);
      if (hit) return join(dir, hit);
    } catch {
      /* skip */
    }
  }
  return null;
}

async function downloadFromHau(url, dest) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 50) return null;
    mkdirSync(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    return dest;
  } catch {
    return null;
  }
}

async function fetchAllMatching(sb, table, cols, idCol) {
  const rows = [];
  const select = [idCol, ...cols].join(", ");
  // OR filter for each col
  const orParts = cols.map((c) => `${c}.ilike.%hau.ac.in%/storage/app/uploads%`);
  let from = 0;
  for (;;) {
    let q = sb.from(table).select(select);
    if (orParts.length === 1) {
      q = q.ilike(cols[0], "%hau.ac.in%/storage/app/uploads%");
    } else {
      q = q.or(orParts.join(","));
    }
    const { data, error } = await q.range(from, from + 999);
    if (error) {
      // column may not support ilike (jsonb) — fall back to text cast via rpc-less scan
      if (/operator|cast|json/i.test(error.message)) {
        return { rows: null, error: error.message, needsScan: true };
      }
      throw new Error(`${table}: ${error.message}`);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return { rows, error: null, needsScan: false };
}

async function scanAllForJson(sb, table, cols, idCol) {
  const rows = [];
  const select = [idCol, ...cols].join(", ");
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select(select)
      .range(from, from + 999);
    if (error) throw new Error(`${table} scan: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) {
      const hit = cols.some((c) => {
        const v = row[c];
        if (v == null) return false;
        return HAU_STORAGE_TEST.test(
          typeof v === "string" ? v : JSON.stringify(v),
        );
      });
      if (hit) rows.push(row);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function collectUrlsFromValue(value) {
  const urls = new Set();
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === "string") {
      let m;
      const re = new RegExp(HAU_STORAGE_RE.source, "gi");
      while ((m = re.exec(v)) !== null) {
        urls.add(m[0].replace(/[),.;]+$/, ""));
      }
      // bare path stored without rewrite yet but full URL
      if (
        HAU_STORAGE_TEST.test(v) &&
        !v.includes(" ") &&
        v.startsWith("http")
      ) {
        urls.add(v.trim());
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item?.path ?? item?.url ?? item);
      return;
    }
    if (typeof v === "object") {
      for (const val of Object.values(v)) walk(val);
    }
  };
  walk(value);
  return [...urls];
}

function rewriteValue(value, urlMap) {
  if (value == null) return { next: value, changed: false };
  if (typeof value === "string") {
    let next = value;
    let changed = false;
    for (const [from, to] of urlMap) {
      if (next.includes(from)) {
        next = next.split(from).join(to);
        changed = true;
      }
    }
    return { next, changed };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      if (typeof item === "string") {
        const r = rewriteValue(item, urlMap);
        changed = changed || r.changed;
        return r.next;
      }
      if (item && typeof item === "object") {
        const copy = { ...item };
        for (const key of ["path", "url", "href"]) {
          if (typeof copy[key] === "string") {
            const r = rewriteValue(copy[key], urlMap);
            if (r.changed) {
              copy[key] = r.next;
              changed = true;
            }
          }
        }
        return copy;
      }
      return item;
    });
    return { next, changed };
  }
  return { next: value, changed: false };
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const container = CONFIRM
  ? BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    ).getContainerClient(CONTAINER)
  : null;

mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(REPORT_DIR, { recursive: true });

const report = {
  mode: CONFIRM ? "apply" : DRY_RUN ? "dry-run" : "audit",
  storageRoot: STORAGE_UPLOADS_ROOT,
  tables: {},
  uniqueUrls: {},
  uploaded: 0,
  rewritten: 0,
  missing: [],
  failed: [],
};

const urlJobs = new Map(); // url -> { relPath, local, stored, status }

for (const target of TARGETS) {
  let rows;
  try {
    const res = await fetchAllMatching(sb, target.table, target.cols, target.idCol);
    if (res.needsScan || res.rows == null) {
      rows = await scanAllForJson(sb, target.table, target.cols, target.idCol);
    } else {
      rows = res.rows;
    }
  } catch (e) {
    report.tables[target.table] = { error: e.message };
    continue;
  }

  const tableStats = { rows: rows.length, urls: 0, samples: [] };
  for (const row of rows) {
    for (const col of target.cols) {
      const urls = collectUrlsFromValue(row[col]);
      for (const url of urls) {
        tableStats.urls++;
        if (!urlJobs.has(url)) {
          const rel = extractRelPath(url);
          urlJobs.set(url, {
            relPath: rel,
            fileName: rel ? basename(rel) : null,
            tables: new Set(),
          });
        }
        urlJobs.get(url).tables.add(`${target.table}.${col}`);
        if (tableStats.samples.length < 5) {
          tableStats.samples.push({ id: row[target.idCol], col, url });
        }
      }
    }
  }
  tableStats.sampleUrls = tableStats.samples;
  delete tableStats.samples;
  report.tables[target.table] = tableStats;
}

console.log(`Found ${urlJobs.size} unique hau.ac.in/storage/app/uploads URLs`);

let processed = 0;
for (const [url, meta] of urlJobs) {
  if (LIMIT != null && processed >= LIMIT) break;
  processed++;

  const rel = meta.relPath;
  if (!rel) {
    report.missing.push({ url, reason: "bad-url" });
    meta.status = "bad-url";
    continue;
  }

  let local = findLocalFile(rel);
  if (!local && DOWNLOAD_MISSING) {
    const dest = join(CACHE_DIR, sanitizeFileName(basename(rel)));
    local = await downloadFromHau(url, dest);
    if (local) meta.downloaded = true;
  }

  if (!local) {
    report.missing.push({ url, rel, tables: [...meta.tables] });
    meta.status = "missing";
    continue;
  }

  const fileName = sanitizeFileName(basename(rel));
  const blobPath = `legacy-storage/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);

  meta.local = local;
  meta.stored = stored;
  meta.publicUrl = publicUrl;

  if (CONFIRM) {
    try {
      const buf = await readFile(local);
      await container.getBlockBlobClient(blobPath).uploadData(buf, {
        blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
      });
      meta.status = "uploaded";
      report.uploaded++;
    } catch (e) {
      meta.status = "failed";
      report.failed.push({ url, error: e.message });
      continue;
    }
  } else {
    meta.status = "planned";
  }

  report.uniqueUrls[url] = {
    status: meta.status,
    local: meta.local,
    stored: meta.stored,
    publicUrl: meta.publicUrl,
    tables: [...meta.tables],
    downloaded: Boolean(meta.downloaded),
  };
}

// Rewrite DB rows using successful url map
const urlMap = [...urlJobs.entries()]
  .filter(([, m]) => m.publicUrl && (CONFIRM ? m.status === "uploaded" : m.status === "planned" || m.status === "uploaded"))
  .map(([from, m]) => [from, CONFIRM ? m.publicUrl : m.publicUrl]);

if (urlMap.length && (CONFIRM || DRY_RUN)) {
  for (const target of TARGETS) {
    let rows;
    try {
      const res = await fetchAllMatching(sb, target.table, target.cols, target.idCol);
      rows =
        res.needsScan || res.rows == null
          ? await scanAllForJson(sb, target.table, target.cols, target.idCol)
          : res.rows;
    } catch {
      continue;
    }

    for (const row of rows) {
      const patch = {};
      let changed = false;
      for (const col of target.cols) {
        const r = rewriteValue(row[col], urlMap);
        if (r.changed) {
          patch[col] = r.next;
          changed = true;
        }
      }
      if (!changed) continue;
      report.rewritten++;
      if (CONFIRM) {
        const { error } = await sb
          .from(target.table)
          .update(patch)
          .eq(target.idCol, row[target.idCol]);
        if (error) {
          report.failed.push({
            table: target.table,
            id: row[target.idCol],
            error: error.message,
          });
        }
      }
    }
  }
}

const out = join(REPORT_DIR, "migrate-hau-storage-uploads-latest.json");
writeFileSync(out, JSON.stringify(report, null, 2));

const summary = {
  mode: report.mode,
  uniqueUrls: urlJobs.size,
  uploaded: report.uploaded,
  rewrittenRows: report.rewritten,
  missing: report.missing.length,
  failed: report.failed.length,
  tables: Object.fromEntries(
    Object.entries(report.tables).map(([k, v]) => [
      k,
      v.error ? v : { rows: v.rows, urls: v.urls },
    ]),
  ),
  report: out,
};
console.log(JSON.stringify(summary, null, 2));
if (report.missing.length) {
  console.log("\nMissing samples:");
  for (const m of report.missing.slice(0, 15)) {
    console.log(` - ${m.url}`);
  }
}
