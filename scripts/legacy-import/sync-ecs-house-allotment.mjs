/**
 * Sync ECS House Allotment from legacy MySQL menu 146 (college 53 / dept 103).
 * Legacy URL: https://hau.ac.in/department/NTM=/MTAz
 * Local: /college/eo-cum-se/ecs-department/ecs-house-allotment
 *
 * Usage: node sync-ecs-house-allotment.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE = join(__dirname, "reports/house-allotment-cache");
const CONFIRM = process.argv.includes("--confirm");
const PAGE_SLUG = "ecs-house-allotment";
const MENU_ID = 146;
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";

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
const sanitizeHtml = requireFromWeb("sanitize-html");

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".rtf": "application/rtf",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".png": "image/png",
    }[e] || "application/octet-stream"
  );
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function ensureRemoteFile(containerClient, sourceUrl, blobSubpath) {
  const normalized = String(sourceUrl)
    .replace("https://www.hau.ac.in/", "https://hau.ac.in/")
    .trim();
  const fileName = basename(new URL(normalized).pathname);
  const blobPath = `${blobSubpath}/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) return { stored, publicUrl, fileName, reused: true };

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const candidates = [
      normalized,
      normalized.replace("https://hau.ac.in/", "https://www.hau.ac.in/"),
    ];
    let lastErr = null;
    for (const candidate of [...new Set(candidates)]) {
      try {
        const r = await fetch(candidate, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "*/*",
            Referer: "https://hau.ac.in/department/NTM=/MTAz",
          },
        });
        if (!r.ok) {
          lastErr = new Error(`${candidate} -> ${r.status}`);
          continue;
        }
        buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 200) {
          lastErr = new Error(`${candidate} too small`);
          continue;
        }
        await writeFile(cachePath, buf);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr || !buf) throw lastErr || new Error(`fetch failed ${normalized}`);
  }

  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  return { stored, publicUrl, fileName, reused: false };
}

function sanitize(html) {
  return sanitizeHtml(String(html || ""), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "h3",
      "h4",
      "span",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class", "style"],
      a: ["href", "target", "rel", "class"],
      td: ["colspan", "rowspan", "style", "width"],
      th: ["colspan", "rowspan", "style", "width"],
      table: ["style", "width", "border", "cellpadding", "cellspacing"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

function pdfLinkHtml(title, url) {
  return `<p><a class="fr-file" href="${url}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong></a></p>`;
}

async function rewriteStorageLinks(html, containerClient) {
  let out = html;
  const urls = [
    ...new Set(
      [...html.matchAll(/https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/[^"'\\\s>]+/gi)].map(
        (m) => m[0],
      ),
    ),
  ];
  const map = {};
  for (const url of urls) {
    try {
      const uploaded = await ensureRemoteFile(
        containerClient,
        url,
        "pages/eo-cum-se/house-allotment",
      );
      map[url] = uploaded.publicUrl;
      console.log("file", uploaded.fileName, uploaded.reused ? "reuse" : "upload");
    } catch (err) {
      console.warn("keep legacy file", url, err.message);
      map[url] = url;
    }
  }
  for (const [from, to] of Object.entries(map)) {
    out = out.split(from).join(to);
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !connStr) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const mysqlConn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  const [rows] = await mysqlConn.query(
    `SELECT md.id, md.label, md.link, md.page_id, md.display_order,
            c.page_title, c.page_slug, c.file, c.page_content
     FROM hau_menu_detail md
     LEFT JOIN hau_cms c ON c.id = md.page_id
     WHERE md.menu_id = ?
     ORDER BY md.display_order, md.id`,
    [MENU_ID],
  );
  await mysqlConn.end();

  console.log({
    mode: CONFIRM ? "apply" : "dry-run",
    items: rows.map((r) => ({
      label: r.label,
      order: r.display_order,
      file: r.file,
      contentLen: r.page_content ? String(r.page_content).length : 0,
    })),
  });

  if (!CONFIRM) {
    console.log("Pass --confirm to migrate files and update Supabase");
    return;
  }

  const container = BlobServiceClient.fromConnectionString(connStr).getContainerClient(
    CONTAINER,
  );
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id,slug,content_en")
    .eq("slug", PAGE_SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page) throw new Error("page missing");

  // Build migrated sidebar contents
  const migrated = [];
  for (const row of rows) {
    const label = String(row.label || row.page_title || "").trim();
    let contentEn = "";
    if (row.file) {
      const fileName = String(row.file).trim();
      const knownAzure = `https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/${fileName}`;
      let finalUrl = knownAzure;
      const rootBlob = container.getBlockBlobClient(`pages-pdf/${fileName}`);
      if (await rootBlob.exists()) {
        console.log("pdf reuse azure", fileName);
        finalUrl = knownAzure;
      } else {
        try {
          const uploaded = await ensureRemoteFile(
            container,
            `${LEGACY_PDF_BASE}${fileName}`,
            "pages-pdf",
          );
          finalUrl = uploaded.publicUrl;
          console.log("pdf", uploaded.fileName, uploaded.reused ? "reuse" : "upload");
        } catch (err) {
          console.warn("pdf unavailable, keep azure path anyway", fileName, err.message);
          finalUrl = knownAzure;
        }
      }
      contentEn = pdfLinkHtml(row.page_title || label, finalUrl);
    } else if (row.page_content) {
      contentEn = await rewriteStorageLinks(sanitize(row.page_content), container);
    }
    migrated.push({
      labelEn: label,
      labelHi: label,
      contentEn,
      sortOrder: Number(row.display_order ?? 0) + 3, // after HOD/Faculty
    });
  }

  // Fetch existing sidebars
  const { data: existing, error: sbErr } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,sort_order,is_active")
    .eq("page_id", page.id)
    .eq("side", "left");
  if (sbErr) throw new Error(sbErr.message);

  const protectedRe = /^(head of department|faculty)$/i;
  const keep = (existing || []).filter((s) => protectedRe.test(s.label_en || ""));
  const remove = (existing || []).filter((s) => !protectedRe.test(s.label_en || ""));

  if (remove.length) {
    const { error: delErr } = await sb
      .from("ccshau_page_sidebar_items")
      .delete()
      .in(
        "id",
        remove.map((r) => r.id),
      );
    if (delErr) throw new Error(delErr.message);
  }

  // Ensure HOD/Faculty exist
  if (!keep.some((k) => /^head of department$/i.test(k.label_en || ""))) {
    await sb.from("ccshau_page_sidebar_items").insert({
      page_id: page.id,
      side: "left",
      label_en: "Head of Department",
      label_hi: "विभागाध्यक्ष",
      sort_order: 1,
      is_active: true,
      href: null,
      content_en: null,
      content_hi: null,
    });
  } else {
    await sb
      .from("ccshau_page_sidebar_items")
      .update({ sort_order: 1, is_active: true, updated_at: new Date().toISOString() })
      .eq(
        "id",
        keep.find((k) => /^head of department$/i.test(k.label_en || "")).id,
      );
  }
  if (!keep.some((k) => /^faculty$/i.test(k.label_en || ""))) {
    await sb.from("ccshau_page_sidebar_items").insert({
      page_id: page.id,
      side: "left",
      label_en: "Faculty",
      label_hi: "संकाय",
      sort_order: 2,
      is_active: true,
      href: null,
      content_en: null,
      content_hi: null,
    });
  } else {
    await sb
      .from("ccshau_page_sidebar_items")
      .update({ sort_order: 2, is_active: true, updated_at: new Date().toISOString() })
      .eq(
        "id",
        keep.find((k) => /^faculty$/i.test(k.label_en || "")).id,
      );
  }

  const inserts = migrated.map((item) => ({
    page_id: page.id,
    side: "left",
    label_en: item.labelEn,
    label_hi: item.labelHi,
    sort_order: item.sortOrder,
    is_active: true,
    href: null,
    content_en: item.contentEn,
    content_hi: null,
  }));
  const { error: insErr } = await sb.from("ccshau_page_sidebar_items").insert(inserts);
  if (insErr) throw new Error(insErr.message);

  // Clear stub about text; landing uses HOD card instead.
  const { error: upPageErr } = await sb
    .from("ccshau_pages")
    .update({
      content_en: "",
      content_hi: null,
      excerpt_en:
        "House Allotment — Estate Office-cum-Chief Engineer, CCS HAU Hisar.",
      excerpt_hi: "गृह आवंटन — संपदा अधिकारी-सह-मुख्य अभियंता, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।",
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (upPageErr) throw new Error(upPageErr.message);

  console.log("done", {
    sidebarsInserted: inserts.length,
    removedOld: remove.length,
    labels: inserts.map((i) => i.label_en),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
