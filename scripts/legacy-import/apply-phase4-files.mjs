/**
 * Legacy Phase 4 — upload files from LEGACY_UPLOADS_ROOT to Azure Blob
 * and patch Supabase paths that still start with legacy-pending/.
 *
 * Usage:
 *   node apply-phase4-files.mjs --dry-run
 *   node apply-phase4-files.mjs --confirm
 *   node apply-phase4-files.mjs --confirm --only=news,tenders,downloads,pages,staff,initiatives,banners,media
 *
 * Env: apps/web/.env.local (Supabase + Azure)
 *      LEGACY_UPLOADS_ROOT   (default: C:\Jatin\Projects\CCHAU_mysql\public\public)
 *      LEGACY_STORAGE_UPLOADS_ROOT (default: C:\Jatin\Projects\CCHAU_mysql\uploads\uploads)
 *        Laravel storage/app/uploads dump — college-user, circular-pdf, etc.
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");

const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

function want(kind) {
  return !ONLY || ONLY.has(kind);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

const UPLOADS_ROOT =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";

/** Laravel storage/app/uploads dump (college-user photos, hashed PDFs, …). */
const STORAGE_UPLOADS_ROOT =
  process.env.LEGACY_STORAGE_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\uploads\\uploads";

function loadPkg(name) {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)(name);
    } catch {
      /* next */
    }
  }
  throw new Error(`Install ${name} in apps/web first.`);
}

const { createClient } = loadPkg("@supabase/supabase-js");

function getAzureContainer() {
  return (
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER?.trim() ||
    "ccshaucontainer"
  );
}

function getBlobServiceClient() {
  const { BlobServiceClient, StorageSharedKeyCredential } = loadPkg("@azure/storage-blob");
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (cs) return BlobServiceClient.fromConnectionString(cs);
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (accountName && accountKey) {
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(accountName, accountKey),
    );
  }
  throw new Error("Azure Storage credentials missing.");
}

function sanitizeFileName(name) {
  return String(name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function contentTypeFor(fileName) {
  const ext = extname(fileName).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  };
  return map[ext] || "application/octet-stream";
}

function parsePending(pathStr) {
  // legacy-pending/{kind}/{legacyId}/{file...}
  const parts = String(pathStr || "").split("/");
  if (parts[0] !== "legacy-pending" || parts.length < 4) return null;
  return {
    kind: parts[1],
    legacyId: parts[2],
    fileName: parts.slice(3).join("/"),
  };
}

function firstExisting(candidates) {
  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

function listFilesSafe(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => join(dir, d.name));
  } catch {
    return [];
  }
}

function resolveLocalFile(kind, legacyId, fileName) {
  const base = basename(String(fileName || "").replace(/\\/g, "/"));
  if (!base) return null;
  const id = String(legacyId);
  const c = [];

  if (kind === "news" || kind === "tenders") {
    c.push(
      join(UPLOADS_ROOT, "notification-documents", id, base),
      join(UPLOADS_ROOT, "news-documents", id, base),
      join(UPLOADS_ROOT, "notification-documents", base),
      join(UPLOADS_ROOT, "images", "notification-images", id, base),
      join(UPLOADS_ROOT, "images", "news-images", id, base),
    );
  } else if (kind === "downloads") {
    c.push(
      join(STORAGE_UPLOADS_ROOT, "downloads-pdf", base),
      join(STORAGE_UPLOADS_ROOT, base),
      join(UPLOADS_ROOT, "documents", id, base),
      join(UPLOADS_ROOT, "documents", base),
      join(UPLOADS_ROOT, "pages-pdf", base),
    );
    // hashed Laravel names often live as sole file in documents/{id}/
    const only = listFilesSafe(join(UPLOADS_ROOT, "documents", id)).filter(
      (f) => !basename(f).startsWith("."),
    );
    if (only.length === 1) c.push(only[0]);
  } else if (kind === "banners") {
    c.push(
      join(UPLOADS_ROOT, "images", "sliders", id, base),
      join(UPLOADS_ROOT, "images", "banner", base),
    );
  } else if (kind === "colleges") {
    c.push(
      join(UPLOADS_ROOT, "images", "college", "banner", id, base),
      join(UPLOADS_ROOT, "images", "college", "logo", id, base),
      join(UPLOADS_ROOT, "images", "college", base),
      join(UPLOADS_ROOT, "images", "college", id, base),
    );
  } else if (kind === "staff") {
    c.push(
      join(STORAGE_UPLOADS_ROOT, "college-user", base),
      join(STORAGE_UPLOADS_ROOT, "user", base),
      join(STORAGE_UPLOADS_ROOT, base),
      join(UPLOADS_ROOT, "storage", "app", "uploads", "college-user", base),
      join(UPLOADS_ROOT, "storage", "app", "public", "college-user", base),
      join(UPLOADS_ROOT, "images", "speakers", id, base),
      join(UPLOADS_ROOT, "images", "faculty", id, base),
      join(UPLOADS_ROOT, "images", "college", "user", id, base),
    );
  } else if (kind === "initiatives" || kind === "flagships") {
    c.push(
      join(STORAGE_UPLOADS_ROOT, "initiative", base),
      join(STORAGE_UPLOADS_ROOT, "flagship", base),
      join(STORAGE_UPLOADS_ROOT, base),
      join(UPLOADS_ROOT, "images", "updated-home", id, base),
      join(UPLOADS_ROOT, "images", "updated-home", base),
      join(UPLOADS_ROOT, "storage", "app", "uploads", "initiatives", base),
      join(UPLOADS_ROOT, "images", base),
    );
  } else if (kind === "cms") {
    c.push(
      join(STORAGE_UPLOADS_ROOT, base),
      join(STORAGE_UPLOADS_ROOT, "downloads-pdf", base),
      join(STORAGE_UPLOADS_ROOT, "circular-pdf", base),
      join(STORAGE_UPLOADS_ROOT, "rti-pdf", base),
      join(STORAGE_UPLOADS_ROOT, "event-pdf", base),
      join(UPLOADS_ROOT, "pages-pdf", base),
      join(UPLOADS_ROOT, "pages-pdf", id, base),
      join(UPLOADS_ROOT, "documents", id, base),
    );
  } else if (kind === "media-albums") {
    c.push(
      join(UPLOADS_ROOT, "images", "gallery", id, base),
      join(UPLOADS_ROOT, "images", "gallery", "images", id, base),
    );
  } else if (kind === "media-items" || kind === "media-thumbs") {
    c.push(
      join(UPLOADS_ROOT, "images", "gallery", "images", id, base),
      join(UPLOADS_ROOT, "images", "gallery", id, base),
    );
  } else {
    c.push(
      join(UPLOADS_ROOT, base),
      join(UPLOADS_ROOT, "pages-pdf", base),
      join(UPLOADS_ROOT, "notification-documents", id, base),
    );
  }

  return firstExisting(c);
}

async function uploadLocalFile(containerClient, blobPath, localPath) {
  const buf = await readFile(localPath);
  const block = containerClient.getBlockBlobClient(blobPath);
  await block.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(localPath) },
  });
  return `${containerClient.containerName}/${blobPath}`;
}

async function fetchAllLike(supabase, table, column, pattern, selectCols) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .like(column, pattern)
      .range(from, from + 999);
    if (error) throw new Error(`${table}.${column}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function bump(stats, key) {
  stats[key] = (stats[key] || 0) + 1;
}

async function patchSimplePath(supabase, container, table, idCol, pathCol, row, blobFolder, stats) {
  const pending = row[pathCol];
  const parsed = parsePending(pending);
  if (!parsed) {
    bump(stats, "skipped");
    return;
  }
  const local = resolveLocalFile(parsed.kind, parsed.legacyId, parsed.fileName);
  if (!local) {
    bump(stats, "missing");
    stats.missingSamples.push(`${table}:${pending}`);
    return;
  }
  const blobPath = `${blobFolder}/${row[idCol]}/${sanitizeFileName(parsed.fileName)}`;
  try {
    if (!DRY_RUN) {
      const stored = await uploadLocalFile(container, blobPath, local);
      const { error } = await supabase
        .from(table)
        .update({ [pathCol]: stored })
        .eq(idCol, row[idCol]);
      if (error) throw new Error(error.message);
    }
    bump(stats, "uploaded");
  } catch (e) {
    bump(stats, "failed");
    stats.errors.push(`${table} ${row[idCol]}: ${e.message}`);
  }
}

async function patchJsonAttachments(
  supabase,
  container,
  table,
  idCol,
  jsonCol,
  row,
  blobFolder,
  stats,
) {
  const list = Array.isArray(row[jsonCol]) ? row[jsonCol] : [];
  let changed = false;
  const next = [];
  for (const item of list) {
    const pathStr = item?.path;
    if (!String(pathStr || "").startsWith("legacy-pending/")) {
      next.push(item);
      continue;
    }
    const parsed = parsePending(pathStr);
    if (!parsed) {
      next.push(item);
      bump(stats, "skipped");
      continue;
    }
    const local = resolveLocalFile(parsed.kind, parsed.legacyId, parsed.fileName);
    if (!local) {
      next.push(item);
      bump(stats, "missing");
      stats.missingSamples.push(`${table}:${pathStr}`);
      continue;
    }
    const blobPath = `${blobFolder}/${row[idCol]}/${sanitizeFileName(parsed.fileName)}`;
    try {
      if (!DRY_RUN) {
        const stored = await uploadLocalFile(container, blobPath, local);
        next.push({ ...item, path: stored });
      } else {
        next.push(item);
      }
      changed = true;
      bump(stats, "uploaded");
    } catch (e) {
      next.push(item);
      bump(stats, "failed");
      stats.errors.push(`${table} ${row[idCol]} file: ${e.message}`);
    }
  }
  if (changed && !DRY_RUN) {
    const { error } = await supabase
      .from(table)
      .update({ [jsonCol]: next })
      .eq(idCol, row[idCol]);
    if (error) stats.errors.push(`${table} ${row[idCol]} patch: ${error.message}`);
  }
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --confirm or --dry-run");
    process.exit(1);
  }
  if (!existsSync(UPLOADS_ROOT)) {
    console.error(`LEGACY_UPLOADS_ROOT missing: ${UPLOADS_ROOT}`);
    process.exit(1);
  }
  if (!existsSync(STORAGE_UPLOADS_ROOT)) {
    console.warn(
      `WARN: LEGACY_STORAGE_UPLOADS_ROOT missing: ${STORAGE_UPLOADS_ROOT} (staff/PDF match rate may be low)`,
    );
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !KEY) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const containerName = getAzureContainer();
  const container = getBlobServiceClient().getContainerClient(containerName);
  try {
    await container.setAccessPolicy("blob");
  } catch {
    /* ignore */
  }

  const summary = {
    startedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run" : "apply",
    uploadsRoot: UPLOADS_ROOT,
    storageUploadsRoot: STORAGE_UPLOADS_ROOT,
    azureContainer: containerName,
    sections: {},
    errors: [],
  };

  function section(name) {
    const s = {
      uploaded: 0,
      missing: 0,
      failed: 0,
      skipped: 0,
      missingSamples: [],
      errors: [],
    };
    summary.sections[name] = s;
    return s;
  }

  console.log(`Phase 4 files (${summary.mode})`);
  console.log(`Public root: ${UPLOADS_ROOT}`);
  console.log(`Storage uploads: ${STORAGE_UPLOADS_ROOT}`);
  console.log(`Azure: ${containerName}`);
  if (ONLY) console.log(`Only: ${[...ONLY].join(",")}`);

  // --- News ---
  if (want("news")) {
    const stats = section("news");
    console.log("… news attachments");
    const rows = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("ccshau_news")
        .select("id, attachment_paths")
        .not("attachment_paths", "is", null)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const row of data) {
        if ((row.attachment_paths || []).some((a) => String(a?.path || "").startsWith("legacy-pending/"))) {
          rows.push(row);
        }
      }
      if (data.length < 1000) break;
      from += 1000;
    }
    for (const row of rows) {
      await patchJsonAttachments(
        supabase,
        container,
        "ccshau_news",
        "id",
        "attachment_paths",
        row,
        "news",
        stats,
      );
    }
    console.log(
      `✓ news uploaded=${stats.uploaded} missing=${stats.missing} failed=${stats.failed}`,
    );
  }

  // --- Tenders ---
  if (want("tenders")) {
    const stats = section("tenders");
    console.log("… tender documents");
    const rows = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("ccshau_tenders")
        .select("id, document_paths")
        .not("document_paths", "is", null)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const row of data) {
        if ((row.document_paths || []).some((a) => String(a?.path || "").startsWith("legacy-pending/"))) {
          rows.push(row);
        }
      }
      if (data.length < 1000) break;
      from += 1000;
    }
    for (const row of rows) {
      await patchJsonAttachments(
        supabase,
        container,
        "ccshau_tenders",
        "id",
        "document_paths",
        row,
        "tenders",
        stats,
      );
    }
    console.log(
      `✓ tenders uploaded=${stats.uploaded} missing=${stats.missing} failed=${stats.failed}`,
    );
  }

  // --- Downloads ---
  if (want("downloads")) {
    const stats = section("downloads");
    console.log("… downloads");
    const rows = await fetchAllLike(
      supabase,
      "ccshau_downloads",
      "file_path",
      "legacy-pending/%",
      "id, file_path",
    );
    for (const row of rows) {
      await patchSimplePath(
        supabase,
        container,
        "ccshau_downloads",
        "id",
        "file_path",
        row,
        "downloads",
        stats,
      );
    }
    console.log(
      `✓ downloads uploaded=${stats.uploaded} missing=${stats.missing} failed=${stats.failed}`,
    );
  }

  // --- Pages (college logo / featured / head) ---
  if (want("pages")) {
    const stats = section("pages");
    console.log("… page images");
    for (const col of ["featured_image_path", "logo_image_path", "head_image_path"]) {
      const rows = await fetchAllLike(
        supabase,
        "ccshau_pages",
        col,
        "legacy-pending/%",
        `id, ${col}`,
      );
      for (const row of rows) {
        const folder =
          col === "logo_image_path"
            ? "pages/logo"
            : col === "head_image_path"
              ? "pages/head"
              : "pages/featured";
        await patchSimplePath(supabase, container, "ccshau_pages", "id", col, row, folder, stats);
      }
    }
    console.log(
      `✓ pages uploaded=${stats.uploaded} missing=${stats.missing} failed=${stats.failed}`,
    );
  }

  // --- Staff ---
  if (want("staff")) {
    const stats = section("staff");
    console.log("… staff photos");
    const pendingRows = await fetchAllLike(
      supabase,
      "ccshau_page_staff",
      "image_path",
      "legacy-pending/%",
      "id, image_path",
    );
    for (const row of pendingRows) {
      await patchSimplePath(
        supabase,
        container,
        "ccshau_page_staff",
        "id",
        "image_path",
        row,
        "faculty",
        stats,
      );
    }

    // Also migrate hotlinked hau.ac.in college-user images when local file exists
    const { data: hotRows, error: hotErr } = await supabase
      .from("ccshau_page_staff")
      .select("id, image_path")
      .like("image_path", "%hau.ac.in%/college-user/%");
    if (hotErr) throw new Error(hotErr.message);
    for (const row of hotRows ?? []) {
      const fileName = basename(String(row.image_path || "").replace(/\\/g, "/"));
      if (!fileName) {
        bump(stats, "skipped");
        continue;
      }
      const local = resolveLocalFile("staff", "hotlink", fileName);
      if (!local) {
        bump(stats, "missing");
        stats.missingSamples.push(`staff-hotlink:${row.image_path}`);
        continue;
      }
      const blobPath = `faculty/${row.id}/${sanitizeFileName(fileName)}`;
      try {
        if (!DRY_RUN) {
          const stored = await uploadLocalFile(container, blobPath, local);
          const { error } = await supabase
            .from("ccshau_page_staff")
            .update({ image_path: stored })
            .eq("id", row.id);
          if (error) throw new Error(error.message);
        }
        bump(stats, "uploaded");
      } catch (e) {
        bump(stats, "failed");
        stats.errors.push(`staff hotlink ${row.id}: ${e.message}`);
      }
    }

    console.log(
      `✓ staff uploaded=${stats.uploaded} missing=${stats.missing} failed=${stats.failed}`,
    );
  }

  // --- Initiatives ---
  if (want("initiatives")) {
    const stats = section("initiatives");
    console.log("… homepage initiatives");
    const rows = await fetchAllLike(
      supabase,
      "ccshau_homepage_initiatives",
      "image_path",
      "legacy-pending/%",
      "id, image_path",
    );
    for (const row of rows) {
      await patchSimplePath(
        supabase,
        container,
        "ccshau_homepage_initiatives",
        "id",
        "image_path",
        row,
        "homepage/initiatives",
        stats,
      );
    }
    console.log(
      `✓ initiatives uploaded=${stats.uploaded} missing=${stats.missing} failed=${stats.failed}`,
    );
  }

  // --- Remaining banners ---
  if (want("banners")) {
    const stats = section("banners");
    console.log("… remaining banners");
    const rows = await fetchAllLike(
      supabase,
      "ccshau_banners",
      "image_path",
      "legacy-pending/%",
      "id, image_path",
    );
    for (const row of rows) {
      await patchSimplePath(
        supabase,
        container,
        "ccshau_banners",
        "id",
        "image_path",
        row,
        "banners",
        stats,
      );
    }
    console.log(
      `✓ banners uploaded=${stats.uploaded} missing=${stats.missing} failed=${stats.failed}`,
    );
  }

  // --- Remaining media ---
  if (want("media")) {
    const coverStats = section("mediaCovers");
    console.log("… remaining media covers");
    const covers = await fetchAllLike(
      supabase,
      "ccshau_media_albums",
      "cover_image_path",
      "legacy-pending/%",
      "id, cover_image_path",
    );
    for (const row of covers) {
      await patchSimplePath(
        supabase,
        container,
        "ccshau_media_albums",
        "id",
        "cover_image_path",
        row,
        "albums/cover",
        coverStats,
      );
    }
    console.log(
      `✓ media covers uploaded=${coverStats.uploaded} missing=${coverStats.missing} failed=${coverStats.failed}`,
    );

    const itemStats = section("mediaItems");
    console.log("… remaining media items");
    const items = await fetchAllLike(
      supabase,
      "ccshau_media_items",
      "storage_path",
      "legacy-pending/%",
      "id, album_id, storage_path, thumbnail_path",
    );
    for (const row of items) {
      const parsed = parsePending(row.storage_path);
      if (!parsed) {
        bump(itemStats, "skipped");
        continue;
      }
      const local = resolveLocalFile(parsed.kind, parsed.legacyId, parsed.fileName);
      if (!local) {
        bump(itemStats, "missing");
        itemStats.missingSamples.push(row.storage_path);
        continue;
      }
      const blobPath = `albums/${row.album_id}/items/${row.id}/${sanitizeFileName(parsed.fileName)}`;
      try {
        if (!DRY_RUN) {
          const stored = await uploadLocalFile(container, blobPath, local);
          let thumb = row.thumbnail_path;
          if (String(thumb || "").startsWith("legacy-pending/")) {
            const tp = parsePending(thumb);
            const tLocal = tp
              ? resolveLocalFile(tp.kind, tp.legacyId, tp.fileName)
              : null;
            if (tLocal) {
              thumb = await uploadLocalFile(
                container,
                `albums/${row.album_id}/items/${row.id}/thumb-${sanitizeFileName(tp.fileName)}`,
                tLocal,
              );
            }
          }
          const { error } = await supabase
            .from("ccshau_media_items")
            .update({ storage_path: stored, thumbnail_path: thumb })
            .eq("id", row.id);
          if (error) throw new Error(error.message);
        }
        bump(itemStats, "uploaded");
      } catch (e) {
        bump(itemStats, "failed");
        itemStats.errors.push(`item ${row.id}: ${e.message}`);
      }
      if (itemStats.uploaded && itemStats.uploaded % 50 === 0) {
        console.log(`  … media items ${itemStats.uploaded}`);
      }
    }
    console.log(
      `✓ media items uploaded=${itemStats.uploaded} missing=${itemStats.missing} failed=${itemStats.failed}`,
    );
  }

  // Collect top-level errors
  for (const s of Object.values(summary.sections)) {
    summary.errors.push(...(s.errors || []));
    // trim samples
    s.missingSamples = (s.missingSamples || []).slice(0, 15);
  }

  summary.finishedAt = new Date().toISOString();
  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "phase4-files-latest.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
