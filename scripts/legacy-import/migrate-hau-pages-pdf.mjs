/**
 * Migrate hau.ac.in/public/pages-pdf/* hotlinks → Azure Blob.
 *
 * Usage:
 *   node migrate-hau-pages-pdf.mjs --dry-run
 *   node migrate-hau-pages-pdf.mjs --confirm
 *   node migrate-hau-pages-pdf.mjs --confirm --download-missing
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
const CACHE_DIR = join(REPORT_DIR, "hau-pages-pdf-cache");
const CONFIRM = process.argv.includes("--confirm");
const DOWNLOAD_MISSING = process.argv.includes("--download-missing");

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

const UPLOADS_ROOT =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

const PAGES_PDF_RE =
  /https?:\/\/(?:www\.)?hau\.ac\.in\/public\/pages-pdf\/([^\s"'<>)\\]+)/gi;
const PAGES_PDF_TEST =
  /https?:\/\/(?:www\.)?hau\.ac\.in\/public\/pages-pdf\//i;

const TARGETS = [
  { table: "ccshau_pages", idCol: "id", cols: ["content_en", "content_hi"] },
  {
    table: "ccshau_page_sidebar_items",
    idCol: "id",
    cols: ["content_en", "content_hi", "href"],
  },
  {
    table: "ccshau_page_staff",
    idCol: "id",
    cols: ["detail_content_en", "detail_content_hi", "detail_href"],
  },
  {
    table: "ccshau_news",
    idCol: "id",
    cols: ["body_en", "body_hi", "external_url"],
  },
  { table: "ccshau_related_links", idCol: "id", cols: ["url"] },
];

function contentTypeFor(name) {
  const e = extname(name).toLowerCase();
  if (e === ".pdf") return "application/pdf";
  if (e === ".png") return "image/png";
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function sanitize(name) {
  return String(name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function azureUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function extractFile(url) {
  const m = String(url).match(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/public\/pages-pdf\/([^?#\s"'<>]+)/i,
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function findLocal(fileName) {
  const candidates = [
    join(UPLOADS_ROOT, "pages-pdf", fileName),
    join(UPLOADS_ROOT, "public", "pages-pdf", fileName),
    join(CACHE_DIR, fileName),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  const dir = join(UPLOADS_ROOT, "pages-pdf");
  if (existsSync(dir)) {
    try {
      const hit = readdirSync(dir).find((f) => f === fileName);
      if (hit) return join(dir, hit);
    } catch {
      /* skip */
    }
  }
  return null;
}

async function download(url, dest) {
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

function collectUrls(value) {
  const urls = new Set();
  if (value == null) return [];
  const s = typeof value === "string" ? value : JSON.stringify(value);
  let m;
  const re = new RegExp(PAGES_PDF_RE.source, "gi");
  while ((m = re.exec(s)) !== null) {
    urls.add(m[0].replace(/[),.;]+$/, ""));
  }
  if (PAGES_PDF_TEST.test(s) && s.startsWith("http") && !s.includes(" ")) {
    urls.add(s.trim());
  }
  return [...urls];
}

function rewrite(value, urlMap) {
  if (typeof value !== "string") return { next: value, changed: false };
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

async function fetchMatching(sb, table, cols, idCol) {
  const select = [idCol, ...cols].join(", ");
  const orParts = cols.map(
    (c) => `${c}.ilike.%hau.ac.in%/public/pages-pdf%`,
  );
  const rows = [];
  let from = 0;
  for (;;) {
    let q = sb.from(table).select(select);
    q = orParts.length === 1 ? q.ilike(cols[0], "%hau.ac.in%/public/pages-pdf%") : q.or(orParts.join(","));
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(REPORT_DIR, { recursive: true });

const urlJobs = new Map();
const tableHits = {};

for (const t of TARGETS) {
  const rows = await fetchMatching(sb, t.table, t.cols, t.idCol);
  tableHits[t.table] = { rows: rows.length, urls: 0 };
  for (const row of rows) {
    for (const col of t.cols) {
      for (const url of collectUrls(row[col])) {
        tableHits[t.table].urls++;
        if (!urlJobs.has(url)) {
          urlJobs.set(url, { file: extractFile(url), tables: new Set() });
        }
        urlJobs.get(url).tables.add(`${t.table}.${col}`);
      }
    }
  }
}

console.log(`Found ${urlJobs.size} unique pages-pdf URLs`);

const container = CONFIRM
  ? BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    ).getContainerClient(CONTAINER)
  : null;

const report = {
  mode: CONFIRM ? "apply" : "dry-run",
  uploaded: 0,
  rewritten: 0,
  missing: [],
  failed: [],
  tables: tableHits,
  urls: {},
};

for (const [url, meta] of urlJobs) {
  const fileName = meta.file;
  if (!fileName) {
    report.missing.push({ url, reason: "bad-url" });
    continue;
  }
  let local = findLocal(fileName);
  if (!local && DOWNLOAD_MISSING) {
    local = await download(url, join(CACHE_DIR, sanitize(fileName)));
    meta.downloaded = Boolean(local);
  }
  if (!local) {
    // try alternate host
    if (DOWNLOAD_MISSING) {
      const alt = url.includes("www.")
        ? url.replace("www.", "")
        : url.replace("://hau.ac.in", "://www.hau.ac.in");
      local = await download(alt, join(CACHE_DIR, sanitize(fileName)));
      meta.downloaded = Boolean(local);
    }
  }
  if (!local) {
    report.missing.push({ url, fileName, tables: [...meta.tables] });
    continue;
  }

  const blobPath = `pages-pdf/${sanitize(fileName)}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azureUrl(stored);
  meta.local = local;
  meta.stored = stored;
  meta.publicUrl = publicUrl;

  if (CONFIRM) {
    try {
      const buf = await readFile(local);
      await container.getBlockBlobClient(blobPath).uploadData(buf, {
        blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
      });
      report.uploaded++;
      meta.status = "uploaded";
    } catch (e) {
      report.failed.push({ url, error: e.message });
      meta.status = "failed";
      continue;
    }
  } else {
    meta.status = "planned";
  }

  report.urls[url] = {
    status: meta.status,
    publicUrl,
    local,
    tables: [...meta.tables],
    downloaded: Boolean(meta.downloaded),
  };
}

const urlMap = [...urlJobs.entries()]
  .filter(([, m]) => m.publicUrl && (CONFIRM ? m.status === "uploaded" : true))
  .map(([from, m]) => [from, m.publicUrl]);

if (urlMap.length) {
  for (const t of TARGETS) {
    const rows = await fetchMatching(sb, t.table, t.cols, t.idCol);
    for (const row of rows) {
      const patch = {};
      let changed = false;
      for (const col of t.cols) {
        const r = rewrite(row[col], urlMap);
        if (r.changed) {
          patch[col] = r.next;
          changed = true;
        }
      }
      if (!changed) continue;
      report.rewritten++;
      if (CONFIRM) {
        const { error } = await sb
          .from(t.table)
          .update(patch)
          .eq(t.idCol, row[t.idCol]);
        if (error) {
          report.failed.push({
            table: t.table,
            id: row[t.idCol],
            error: error.message,
          });
        }
      }
    }
  }
}

const out = join(REPORT_DIR, "migrate-hau-pages-pdf-latest.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      mode: report.mode,
      uniqueUrls: urlJobs.size,
      uploaded: report.uploaded,
      rewritten: report.rewritten,
      missing: report.missing.length,
      failed: report.failed.length,
      report: out,
    },
    null,
    2,
  ),
);

const achievement = report.urls["https://www.hau.ac.in/public/pages-pdf/1718083817.pdf"];
if (achievement) {
  console.log("\nPublication Unit Achievements →", achievement.publicUrl);
}
