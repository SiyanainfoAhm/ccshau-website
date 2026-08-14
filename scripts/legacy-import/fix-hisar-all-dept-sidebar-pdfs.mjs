/**
 * Batch-fix College of Agriculture Hisar (college_id=2) department sidebar PDFs.
 * Prefers legacy file over HTML for every left-sidebar tab that has a PDF.
 *
 * Usage:
 *   node fix-hisar-all-dept-sidebar-pdfs.mjs --dry-run
 *   node fix-hisar-all-dept-sidebar-pdfs.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const COLLEGE_ID = 2;
const COLLEGE_SLUG = "college-of-agriculture-hisar";
const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";
const AZURE_BASE =
  "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf";

const PREFIX = "hisar";

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

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeTitle(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeLabel(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isProtected(label) {
  const n = normalizeLabel(label);
  return n === "faculty" || n.includes("head of department") || n === "hod";
}

function labelFix(label) {
  const n = normalizeLabel(label);
  if (n === "thurst area" || n === "thrust area") return "Thrust Area";
  return label;
}

function pdfHtml(url, label) {
  const safe = String(label || "Document")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<a href="${url}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${safe}</strong></span></a>`;
}

async function ensureAzurePdf(containerClient, fileName) {
  const blobName = `pages-pdf/${fileName}`;
  const block = containerClient.getBlockBlobClient(blobName);
  if (await block.exists()) return `${AZURE_BASE}/${fileName}`;

  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, fileName);
  let bytes;
  if (existsSync(cachePath)) {
    bytes = await readFile(cachePath);
  } else {
    const locals = [
      join(
        process.env.LEGACY_UPLOADS_ROOT?.trim() ||
          "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public",
        "pages-pdf",
        fileName,
      ),
      join("C:\\Jatin\\Projects\\CCHAU_mysql\\public\\pages-pdf", fileName),
    ];
    const local = locals.find((p) => existsSync(p));
    if (local) {
      bytes = await readFile(local);
      await writeFile(cachePath, bytes);
    } else {
      const res = await fetch(`${LEGACY_PDF_BASE}${fileName}`);
      if (!res.ok) throw new Error(`download ${fileName} failed: ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
      await writeFile(cachePath, bytes);
    }
  }

  if (CONFIRM) {
    await block.uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: "application/pdf" },
      overwrite: true,
    });
  }
  return `${AZURE_BASE}/${fileName}`;
}

async function findDepartmentPage(supabase, collegePage, deptName) {
  const wanted = normalizeTitle(deptName);
  const base = slugify(deptName);
  const rootId = collegePage.college_root_id || collegePage.id;

  const { data: underRoot } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, parent_id, college_root_id, layout_template")
    .eq("college_root_id", rootId)
    .limit(300);

  const matches = (underRoot || []).filter(
    (p) =>
      p.id !== collegePage.id &&
      normalizeTitle(p.title_en) === wanted,
  );
  if (matches.length) {
    return (
      matches.find((p) => String(p.slug || "").startsWith(`${PREFIX}-`)) ||
      matches[0]
    );
  }

  const slugGuesses = [`${PREFIX}-${base}`, base, `${base}-${PREFIX}`];
  for (const slug of slugGuesses) {
    const { data } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, college_root_id")
      .eq("slug", slug)
      .maybeSingle();
    if (data?.id && data.id !== collegePage.id) return data;
  }
  return null;
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!url || !key || !connStr) throw new Error("Missing env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const container =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";
  const blobService = BlobServiceClient.fromConnectionString(connStr);
  const containerClient = blobService.getContainerClient(container);

  const { data: collegePage, error: cErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, college_root_id")
    .eq("slug", COLLEGE_SLUG)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!collegePage) throw new Error(`College page missing: ${COLLEGE_SLUG}`);

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  const [menus] = await conn.query(
    `SELECT m.menu_id, m.department_id, d.department_name
     FROM hau_menu m
     JOIN hau_college_departments d ON d.id = m.department_id
     WHERE m.college_id = ?
       AND m.menu_status = 1
       AND m.department_id > 0
       AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
     ORDER BY d.department_name, m.menu_id`,
    [COLLEGE_ID],
  );

  const report = {
    mode: DRY_RUN ? "dry-run" : "apply",
    college: COLLEGE_SLUG,
    departments: [],
    totals: { updated: 0, already: 0, skippedNoFile: 0, missingPages: 0 },
  };

  console.log(`Hisar college departments (${report.mode}) menus=${menus.length}`);

  for (const menu of menus) {
    const deptEntry = {
      departmentId: menu.department_id,
      departmentName: menu.department_name,
      menuId: menu.menu_id,
      pageSlug: null,
      updates: [],
      skipped: [],
      error: null,
    };

    try {
      const deptPage = await findDepartmentPage(
        supabase,
        collegePage,
        menu.department_name,
      );
      if (!deptPage) {
        report.totals.missingPages += 1;
        deptEntry.error = "page not found";
        report.departments.push(deptEntry);
        console.log(`✗ ${menu.department_name}: page not found`);
        continue;
      }
      deptEntry.pageSlug = deptPage.slug;

      const [legacyRows] = await conn.query(
        `SELECT md.label, md.link, md.page_id,
                COALESCE(cms.file, cms_slug.file) AS file
         FROM hau_menu_detail md
         LEFT JOIN hau_cms cms ON cms.id = md.page_id
         LEFT JOIN hau_cms cms_slug
           ON cms_slug.page_slug = CASE
             WHEN md.link LIKE 'page/%' THEN SUBSTRING(md.link, 6)
             ELSE NULL
           END
         WHERE md.menu_id = ?
         ORDER BY md.display_order, md.id`,
        [menu.menu_id],
      );

      const fileByLabel = new Map();
      for (const row of legacyRows) {
        if (!row.file || isProtected(row.label)) continue;
        fileByLabel.set(normalizeLabel(row.label), String(row.file).trim());
      }

      const { data: sidebars, error: sbErr } = await supabase
        .from("ccshau_page_sidebar_items")
        .select("id, label_en, content_en, sort_order, is_active")
        .eq("page_id", deptPage.id)
        .eq("side", "left")
        .eq("is_active", true)
        .order("sort_order");
      if (sbErr) throw new Error(sbErr.message);

      let deptUpdated = 0;
      for (const item of sidebars || []) {
        if (isProtected(item.label_en)) continue;
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
          report.totals.skippedNoFile += 1;
          deptEntry.skipped.push({ label: item.label_en, reason: "no legacy file" });
          continue;
        }

        let azureUrl;
        try {
          azureUrl = await ensureAzurePdf(containerClient, basename(fileName));
        } catch (e) {
          report.totals.skippedNoFile += 1;
          deptEntry.skipped.push({
            label: item.label_en,
            reason: e.message || String(e),
            file: fileName,
          });
          console.log(`! ${deptPage.slug} / ${item.label_en}: ${e.message || e}`);
          continue;
        }
        const fixedLabel = labelFix(item.label_en);
        const content = pdfHtml(azureUrl, fixedLabel);
        const already = String(item.content_en || "").includes(azureUrl);

        deptEntry.updates.push({
          label: item.label_en,
          file: fileName,
          azureUrl,
          already,
        });

        if (already) {
          report.totals.already += 1;
          continue;
        }

        console.log(`→ ${deptPage.slug} / ${item.label_en} → ${basename(fileName)}`);
        if (CONFIRM) {
          const patch = { content_en: content, href: null };
          if (fixedLabel !== item.label_en) patch.label_en = fixedLabel;
          const { error } = await supabase
            .from("ccshau_page_sidebar_items")
            .update(patch)
            .eq("id", item.id);
          if (error) throw new Error(`${item.label_en}: ${error.message}`);
        }
        report.totals.updated += 1;
        deptUpdated += 1;
      }

      console.log(
        `${deptUpdated ? "✓" : "="} ${menu.department_name} (${deptPage.slug}) updated=${deptUpdated} pdfTabs=${deptEntry.updates.length}`,
      );
    } catch (e) {
      deptEntry.error = e.message || String(e);
      console.error(`✗ ${menu.department_name}: ${deptEntry.error}`);
    }

    report.departments.push(deptEntry);
  }

  await conn.end();

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "hisar-all-dept-sidebar-pdfs.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log("---");
  console.log(
    `updated=${report.totals.updated} already=${report.totals.already} skippedNoFile=${report.totals.skippedNoFile} missingPages=${report.totals.missingPages}`,
  );
  console.log(`Report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
