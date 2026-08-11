/**
 * Prefer legacy PDF files over HTML for Agricultural Meteorology sidebar tabs.
 *
 * Legacy (college=2, dept=3 / menu 20) stores both page_content HTML and a
 * pages-pdf file. Live site opens the PDF; sync previously preferred HTML.
 *
 * Usage:
 *   node fix-agmet-sidebar-pdfs.mjs --dry-run
 *   node fix-agmet-sidebar-pdfs.mjs --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CACHE_DIR = join(REPORT_DIR, "hau-pages-pdf-cache");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

const PAGE_SLUG = "hisar-agricultural-meteorology";
const LEGACY_COLLEGE = 2;
const LEGACY_DEPT = 3;
const LEGACY_PDF_BASE = "https://www.hau.ac.in/public/pages-pdf/";
const AZURE_BASE =
  "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf";

/** Tabs that should open PDF (match loosely on label). */
const PDF_TAB_KEYS = [
  "thrust area",
  "thurst area",
  "ongoing research projects",
  "publications",
  "awards and honors",
  "infrastructure",
  "courses offered",
  "alumni of the department",
  "bsma implementation",
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

function normalizeLabel(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isPdfTab(label) {
  const n = normalizeLabel(label);
  return PDF_TAB_KEYS.some((k) => n === k || n.includes(k));
}

function pdfLinkHtml(url, label) {
  const safeLabel = String(label || "Document")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<a href="${url}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${safeLabel}</strong></span></a>`;
}

async function ensureAzurePdf(containerClient, fileName) {
  const blobName = `pages-pdf/${fileName}`;
  const block = containerClient.getBlockBlobClient(blobName);
  if (await block.exists()) {
    return `${AZURE_BASE}/${fileName}`;
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, fileName);
  let bytes;
  if (existsSync(cachePath)) {
    bytes = await readFile(cachePath);
  } else {
    const localCandidates = [
      join(
        process.env.LEGACY_UPLOADS_ROOT?.trim() ||
          "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public",
        "pages-pdf",
        fileName,
      ),
      join("C:\\Jatin\\Projects\\CCHAU_mysql\\public\\pages-pdf", fileName),
    ];
    let found = null;
    for (const p of localCandidates) {
      if (existsSync(p)) {
        found = p;
        break;
      }
    }
    if (found) {
      bytes = await readFile(found);
    } else {
      const url = `${LEGACY_PDF_BASE}${fileName}`;
      console.log(`  downloading ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed ${fileName}: ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
      await writeFile(cachePath, bytes);
    }
  }

  if (!DRY_RUN && CONFIRM) {
    await block.uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: "application/pdf" },
      overwrite: true,
    });
  }
  return `${AZURE_BASE}/${fileName}`;
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!url || !key) throw new Error("Missing Supabase env");
  if (!connStr) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const container =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";
  const blobService = BlobServiceClient.fromConnectionString(connStr);
  const containerClient = blobService.getContainerClient(container);

  const { data: page, error: pageErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", PAGE_SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page) throw new Error(`Page not found: ${PAGE_SLUG}`);

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  const [legacyRows] = await conn.query(
    `SELECT md.label, cms.file
     FROM hau_menu m
     JOIN hau_menu_detail md ON md.menu_id = m.menu_id
     LEFT JOIN hau_cms cms ON cms.id = md.page_id
     WHERE m.college_id = ? AND m.department_id = ?
       AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
     ORDER BY md.display_order, md.id`,
    [LEGACY_COLLEGE, LEGACY_DEPT],
  );
  await conn.end();

  const fileByLabel = new Map();
  for (const row of legacyRows) {
    if (!row.file || !isPdfTab(row.label)) continue;
    fileByLabel.set(normalizeLabel(row.label), String(row.file).trim());
  }

  const { data: sidebars, error: sbErr } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, content_en, sort_order, is_active")
    .eq("page_id", page.id)
    .eq("side", "left")
    .eq("is_active", true)
    .order("sort_order");
  if (sbErr) throw new Error(sbErr.message);

  const report = {
    page: page.slug,
    mode: DRY_RUN ? "dry-run" : "apply",
    updates: [],
    skipped: [],
  };

  console.log(`AgMet PDF tabs (${report.mode}) page=${page.slug}`);

  for (const item of sidebars || []) {
    if (!isPdfTab(item.label_en)) continue;
    const key = normalizeLabel(item.label_en);
    let fileName = fileByLabel.get(key);
    if (!fileName) {
      for (const [lk, fv] of fileByLabel.entries()) {
        if (key.includes(lk) || lk.includes(key)) {
          fileName = fv;
          break;
        }
      }
    }
    if (!fileName) {
      report.skipped.push({ label: item.label_en, reason: "no legacy file" });
      continue;
    }

    const azureUrl = await ensureAzurePdf(containerClient, basename(fileName));
    const labelFix =
      normalizeLabel(item.label_en).includes("thurst") ||
      normalizeLabel(item.label_en) === "thrust area"
        ? "Thrust Area"
        : item.label_en;
    const content = pdfLinkHtml(azureUrl, labelFix);

    const already =
      String(item.content_en || "").includes(azureUrl) &&
      String(item.content_en || "").includes(".pdf");

    report.updates.push({
      id: item.id,
      label: item.label_en,
      labelFix,
      file: fileName,
      azureUrl,
      already,
    });

    console.log(
      `${already ? "=" : "→"} ${item.label_en} → ${azureUrl}${already ? " (already)" : ""}`,
    );

    if (!DRY_RUN && CONFIRM && !already) {
      const patch = { content_en: content, href: null };
      if (labelFix !== item.label_en) patch.label_en = labelFix;
      const { error } = await supabase
        .from("ccshau_page_sidebar_items")
        .update(patch)
        .eq("id", item.id);
      if (error) throw new Error(`${item.label_en}: ${error.message}`);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "agmet-sidebar-pdfs-latest.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log("---");
  console.log(`updates=${report.updates.length} skipped=${report.skipped.length}`);
  console.log(`Report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
