/**
 * Batch-fix ALL college/directorate department sidebar tabs:
 * prefer legacy PDF file over HTML (same issue as Hisar departments).
 *
 * Usage:
 *   node fix-all-dept-sidebar-pdfs.mjs --dry-run
 *   node fix-all-dept-sidebar-pdfs.mjs --confirm
 *   node fix-all-dept-sidebar-pdfs.mjs --confirm --skip-college=2
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

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}
const SKIP_COLLEGE = argValue("--skip-college");

const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";
const AZURE_BASE =
  "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf";

const COLLEGE_SLUG_BY_LEGACY_ID = {
  2: "college-of-agriculture-hisar",
  5: "directorate-of-research",
  6: "college-of-agriculture-kaul",
  7: "college-of-agriculture-bawal",
  8: "centre-of-food-science-technology",
  9: "ic-college-of-community-science",
  10: "college-basic-sciences-humanities",
  11: "college-of-agricultural-engineering-and-technology",
  13: "directorate-of-extension-education",
  21: "directorate-of-students-welfare",
  65: "college-of-fisheries-science",
  67: "college-of-biotechnology",
};

const SLUG_ALIASES = {
  "college-of-basic-sciences-humanities": "college-basic-sciences-humanities",
  "ic-college-of-home-science": "ic-college-of-community-science",
};

const PREFIX_BY_COLLEGE_SLUG = {
  "college-of-agriculture-hisar": "hisar",
  "college-of-agriculture-kaul": "kaul",
  "college-of-agriculture-bawal": "bawal",
  "college-of-agricultural-engineering-and-technology": "coaet",
  "college-basic-sciences-humanities": "cbs",
  "centre-of-food-science-technology": "cfst",
  "ic-college-of-community-science": "icccs",
  "college-of-fisheries-science": "cfs",
  "college-of-biotechnology": "cbt",
  "directorate-of-research": "dor",
  "directorate-of-extension-education": "dee",
  "directorate-of-students-welfare": "dsw",
};

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

function resolveCollegeSlug(legacyCollegeId, collegeSlug, collegeName) {
  const fromMap = COLLEGE_SLUG_BY_LEGACY_ID[Number(legacyCollegeId)];
  const raw = fromMap || collegeSlug || slugify(collegeName);
  return SLUG_ALIASES[raw] || raw;
}

async function findCollegePage(supabase, slug) {
  const candidates = [slug, SLUG_ALIASES[slug]].filter(Boolean);
  for (const s of candidates) {
    const { data, error } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, college_root_id")
      .eq("slug", s)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data;
  }
  return null;
}

async function findDepartmentPage(supabase, collegePage, deptName) {
  const wanted = normalizeTitle(deptName);
  const base = slugify(deptName);
  const prefix = PREFIX_BY_COLLEGE_SLUG[collegePage.slug];
  const rootId = collegePage.college_root_id || collegePage.id;

  function pickBest(candidates) {
    const list = (candidates || []).filter(
      (p) => p.id !== collegePage.id && normalizeTitle(p.title_en) === wanted,
    );
    if (!list.length) return null;
    return (
      list.find((p) => String(p.layout_template || "") === "office_portal") ||
      (prefix
        ? list.find((p) => String(p.slug || "").startsWith(`${prefix}-`))
        : null) ||
      list[0]
    );
  }

  if (rootId) {
    const { data: underRoot } = await supabase
      .from("ccshau_pages")
      .select(
        "id, slug, title_en, parent_id, college_root_id, layout_template",
      )
      .eq("college_root_id", rootId)
      .limit(400);
    const hit = pickBest(underRoot);
    if (hit) return hit;
  }

  const { data: level1 } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, parent_id, layout_template, college_root_id")
    .eq("parent_id", collegePage.id);
  const direct = pickBest(level1);
  if (direct) return direct;

  for (const child of level1 || []) {
    const { data: level2 } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, layout_template, college_root_id")
      .eq("parent_id", child.id);
    const hit = pickBest(level2);
    if (hit) return hit;
  }

  const slugGuesses = [];
  if (prefix) {
    slugGuesses.push(`${prefix}-${base}`, `${base}-${prefix}`);
  }
  slugGuesses.push(base);
  for (const slug of [...new Set(slugGuesses)]) {
    const { data } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, college_root_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data?.id || data.id === collegePage.id) continue;
    return data;
  }
  return null;
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

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  let menuSql = `
    SELECT m.menu_id, m.college_id, m.department_id, m.menu_name,
           c.college_name, c.college_slug,
           d.department_name
    FROM hau_menu m
    LEFT JOIN hau_college c ON c.college_id = m.college_id
    LEFT JOIN hau_college_departments d ON d.id = m.department_id
    WHERE m.menu_status = 1
      AND m.department_id > 0
      AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
  `;
  const params = [];
  if (SKIP_COLLEGE) {
    menuSql += " AND m.college_id <> ?";
    params.push(Number(SKIP_COLLEGE));
  }
  menuSql += " ORDER BY m.college_id, d.department_name, m.menu_id";

  const [menus] = await conn.query(menuSql, params);

  const report = {
    mode: DRY_RUN ? "dry-run" : "apply",
    skipCollege: SKIP_COLLEGE,
    menus: menus.length,
    departments: [],
    totals: {
      updated: 0,
      already: 0,
      skippedNoFile: 0,
      missingCollege: 0,
      missingPages: 0,
      errors: 0,
    },
  };

  console.log(
    `All dept PDF tabs (${report.mode}) menus=${menus.length}${SKIP_COLLEGE ? ` skipCollege=${SKIP_COLLEGE}` : ""}`,
  );

  const collegeCache = new Map();

  for (const menu of menus) {
    const deptEntry = {
      collegeId: menu.college_id,
      collegeName: menu.college_name,
      departmentId: menu.department_id,
      departmentName: menu.department_name,
      menuId: menu.menu_id,
      pageSlug: null,
      updates: [],
      skipped: [],
      error: null,
    };

    try {
      if (!menu.department_name) {
        report.totals.errors += 1;
        deptEntry.error = "no department name";
        report.departments.push(deptEntry);
        continue;
      }

      const collegeSlug = resolveCollegeSlug(
        menu.college_id,
        menu.college_slug,
        menu.college_name,
      );
      let collegePage = collegeCache.get(collegeSlug);
      if (collegePage === undefined) {
        collegePage = await findCollegePage(supabase, collegeSlug);
        collegeCache.set(collegeSlug, collegePage || null);
      }
      if (!collegePage) {
        report.totals.missingCollege += 1;
        deptEntry.error = `college page missing: ${collegeSlug}`;
        report.departments.push(deptEntry);
        console.log(`✗ college missing ${collegeSlug} (dept ${menu.department_name})`);
        continue;
      }

      const deptPage = await findDepartmentPage(
        supabase,
        collegePage,
        menu.department_name,
      );
      if (!deptPage) {
        report.totals.missingPages += 1;
        deptEntry.error = "department page not found";
        report.departments.push(deptEntry);
        console.log(
          `✗ ${collegeSlug} / ${menu.department_name}: page not found`,
        );
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
          deptEntry.skipped.push({
            label: item.label_en,
            reason: "no legacy file",
          });
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

        console.log(
          `→ ${collegeSlug} / ${deptPage.slug} / ${item.label_en} → ${basename(fileName)}`,
        );
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

      if (deptUpdated > 0) {
        console.log(
          `✓ ${collegeSlug} / ${menu.department_name} (${deptPage.slug}) updated=${deptUpdated}`,
        );
      }
    } catch (e) {
      report.totals.errors += 1;
      deptEntry.error = e.message || String(e);
      console.error(
        `✗ ${menu.college_name || menu.college_id} / ${menu.department_name}: ${deptEntry.error}`,
      );
    }

    report.departments.push(deptEntry);
  }

  await conn.end();

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "all-dept-sidebar-pdfs-latest.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log("---");
  console.log(
    `updated=${report.totals.updated} already=${report.totals.already} skippedNoFile=${report.totals.skippedNoFile} missingCollege=${report.totals.missingCollege} missingPages=${report.totals.missingPages} errors=${report.totals.errors}`,
  );
  console.log(`Report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
