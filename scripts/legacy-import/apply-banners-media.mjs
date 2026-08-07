/**
 * Re-import legacy banners + media (gallery) metadata into Supabase,
 * then (optionally) upload local files to Azure Blob and patch paths.
 *
 * File root:
 *   LEGACY_UPLOADS_ROOT=C:\Jatin\Projects\CCHAU_mysql\public\public
 *
 * Usage:
 *   node apply-banners-media.mjs --meta --confirm
 *   node apply-banners-media.mjs --files --confirm
 *   node apply-banners-media.mjs --meta --files --confirm
 *   node apply-banners-media.mjs --meta --files --dry-run   # no writes
 *
 * Env: LEGACY_MYSQL_*, apps/web/.env.local (Supabase + Azure)
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");

const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");
const DO_META = process.argv.includes("--meta");
const DO_FILES = process.argv.includes("--files");

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

function loadSupabaseJs() {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("@supabase/supabase-js");
    } catch {
      /* next */
    }
  }
  throw new Error("Install @supabase/supabase-js in apps/web first.");
}

function loadAzure() {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("@azure/storage-blob");
    } catch {
      /* next */
    }
  }
  throw new Error("Install @azure/storage-blob in apps/web first.");
}

const { createClient } = loadSupabaseJs();

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

function pendingPath(kind, legacyId, raw) {
  const base = basename(String(raw || "pending.bin").replace(/\\/g, "/")) || "pending.bin";
  return `legacy-pending/${kind}/${legacyId}/${base}`;
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
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

function getAzureContainer() {
  return (
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.NEXT_PUBLIC_STORAGE_BUCKET_PUBLIC?.trim() ||
    "ccshaucontainer"
  );
}

function getBlobServiceClient() {
  const { BlobServiceClient, StorageSharedKeyCredential } = loadAzure();
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (connectionString) return BlobServiceClient.fromConnectionString(connectionString);
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

function resolveBannerFile(legacyId, rawName) {
  const base = basename(String(rawName || "").replace(/\\/g, "/"));
  if (!base) return null;
  const candidates = [
    join(UPLOADS_ROOT, "images", "sliders", String(legacyId), base),
    join(UPLOADS_ROOT, "images", "sliders", String(legacyId), base.replace(/\s/g, "")),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolveGalleryFile(galleryId, detailId, rawName) {
  const base = basename(String(rawName || "").replace(/\\/g, "/"));
  if (!base) return null;
  const candidates = [];
  if (detailId != null) {
    candidates.push(join(UPLOADS_ROOT, "images", "gallery", "images", String(detailId), base));
  }
  if (galleryId != null) {
    candidates.push(join(UPLOADS_ROOT, "images", "gallery", String(galleryId), base));
  }
  candidates.push(join(UPLOADS_ROOT, "images", "gallery", base));
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function upsertBanner(supabase, legacyId, pendingImagePath, row, stats) {
  const { data: byPending, error: e1 } = await supabase
    .from("ccshau_banners")
    .select("id, image_path")
    .eq("image_path", pendingImagePath)
    .maybeSingle();
  if (e1) throw new Error(`banner find: ${e1.message}`);

  let existing = byPending;
  if (!existing) {
    const { data: list, error: e2 } = await supabase
      .from("ccshau_banners")
      .select("id, image_path")
      .like("image_path", `legacy-pending/banners/${legacyId}/%`)
      .limit(1);
    if (e2) throw new Error(`banner like: ${e2.message}`);
    existing = list?.[0] ?? null;
  }

  if (DRY_RUN) {
    if (existing?.id) stats.updated += 1;
    else stats.inserted += 1;
    return existing?.id ?? null;
  }

  const keepImage =
    existing?.image_path &&
    !existing.image_path.startsWith("legacy-pending/") &&
    existing.image_path !== "pending";

  const payload = {
    ...row,
    image_path: keepImage ? existing.image_path : pendingImagePath,
  };

  if (existing?.id) {
    const { error } = await supabase.from("ccshau_banners").update(payload).eq("id", existing.id);
    if (error) throw new Error(`banner update: ${error.message}`);
    stats.updated += 1;
    return existing.id;
  }

  const { data, error } = await supabase.from("ccshau_banners").insert(payload).select("id").single();
  if (error) throw new Error(`banner insert: ${error.message}`);
  stats.inserted += 1;
  return data.id;
}

async function upsertAlbumBySlug(supabase, row, stats) {
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_media_albums")
    .select("id, cover_image_path")
    .eq("slug", row.slug)
    .maybeSingle();
  if (findErr) throw new Error(`albums find: ${findErr.message}`);

  if (DRY_RUN) {
    if (existing?.id) stats.updated += 1;
    else stats.inserted += 1;
    return existing?.id ?? `dry-${row.slug}`;
  }

  const keepCover =
    existing?.cover_image_path &&
    !String(existing.cover_image_path).startsWith("legacy-pending/") &&
    existing.cover_image_path !== "pending";

  const payload = {
    ...row,
    cover_image_path: keepCover ? existing.cover_image_path : row.cover_image_path,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("ccshau_media_albums")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(`albums update: ${error.message}`);
    stats.updated += 1;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("ccshau_media_albums")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`albums insert: ${error.message}`);
  stats.inserted += 1;
  return data.id;
}

async function upsertMediaItem(supabase, pendingStoragePath, row, stats) {
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_media_items")
    .select("id")
    .eq("storage_path", pendingStoragePath)
    .maybeSingle();
  if (findErr) throw new Error(`items find: ${findErr.message}`);

  if (DRY_RUN) {
    if (existing?.id) stats.updated += 1;
    else stats.inserted += 1;
    return existing?.id ?? null;
  }

  if (existing?.id) {
    const { error } = await supabase.from("ccshau_media_items").update(row).eq("id", existing.id);
    if (error) throw new Error(`items update: ${error.message}`);
    stats.updated += 1;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("ccshau_media_items")
    .insert({ ...row, storage_path: pendingStoragePath })
    .select("id")
    .single();
  if (error) throw new Error(`items insert: ${error.message}`);
  stats.inserted += 1;
  return data.id;
}

async function uploadLocalFile(containerClient, blobPath, localPath) {
  const buf = await readFile(localPath);
  const block = containerClient.getBlockBlobClient(blobPath);
  await block.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(localPath) },
  });
  return `${containerClient.containerName}/${blobPath}`;
}

async function importMeta(conn, supabase, summary) {
  // --- Banners ---
  const [bannerRows] = await conn.query(
    `SELECT id, slider_title, slider_images, slider_link, slider_order, status
     FROM hau_slider_detail WHERE status = 1 ORDER BY slider_order, id`,
  );

  for (const row of bannerRows) {
    const fileBase = row.slider_images || `banner-${row.id}.jpg`;
    const imagePath = pendingPath("banners", row.id, fileBase);
    const local = resolveBannerFile(row.id, fileBase);
    summary.banners.filesOnDisk += local ? 1 : 0;
    summary.banners.filesMissing += local ? 0 : 1;

    try {
      await upsertBanner(
        supabase,
        row.id,
        imagePath,
        {
          title: row.slider_title || `Banner ${row.id}`,
          target_url: row.slider_link || null,
          alt_text: row.slider_title || null,
          priority: Number(row.slider_order || 0),
          is_active: true,
        },
        summary.banners,
      );
    } catch (e) {
      summary.errors.push(`banner ${row.id}: ${e.message}`);
      summary.banners.skipped += 1;
    }
  }

  console.log(
    `✓ banners meta inserted=${summary.banners.inserted} updated=${summary.banners.updated} skipped=${summary.banners.skipped} onDisk=${summary.banners.filesOnDisk} missing=${summary.banners.filesMissing}`,
  );

  // --- Media albums ---
  const [albums] = await conn.query(
    `SELECT gallery_id, gallery_title, gallery_description, gallery_image, gallery_type,
            gallery_sort_order, gallery_status, video_link
     FROM hau_gallery
     WHERE gallery_status = 1
     ORDER BY gallery_sort_order, gallery_id`,
  );

  const albumIdByLegacy = new Map();

  for (const row of albums) {
    const slug = `legacy-gallery-${row.gallery_id}`;
    const coverRaw = row.gallery_image || null;
    const coverPath = coverRaw
      ? pendingPath("media-albums", row.gallery_id, coverRaw)
      : null;
    if (coverRaw) {
      const local = resolveGalleryFile(row.gallery_id, null, coverRaw);
      summary.albums.filesOnDisk += local ? 1 : 0;
      summary.albums.filesMissing += local ? 0 : 1;
    }

    const albumType = Number(row.gallery_type) === 2 ? "video" : "photo";
    try {
      const id = await upsertAlbumBySlug(
        supabase,
        {
          slug,
          title_en: row.gallery_title || `Gallery ${row.gallery_id}`,
          title_hi: null,
          album_type: albumType,
          event_date: null,
          department_id: null,
          cover_image_path: coverPath,
          status: "published",
          published_at: new Date().toISOString(),
        },
        summary.albums,
      );
      albumIdByLegacy.set(Number(row.gallery_id), id);
    } catch (e) {
      summary.errors.push(`album ${row.gallery_id}: ${e.message}`);
      summary.albums.skipped += 1;
    }
  }

  console.log(
    `✓ albums meta inserted=${summary.albums.inserted} updated=${summary.albums.updated} skipped=${summary.albums.skipped} onDisk=${summary.albums.filesOnDisk} missing=${summary.albums.filesMissing}`,
  );

  // --- Media items ---
  const [details] = await conn.query(
    `SELECT d.id, d.gallery_id, d.title, d.caption, d.description, d.status,
            d.full_image, d.medium_image, d.thumbnail, d.original_image,
            g.gallery_type, g.video_link
     FROM hau_gallery_detail d
     INNER JOIN hau_gallery g ON g.gallery_id = d.gallery_id
     WHERE d.status = 1 AND g.gallery_status = 1
     ORDER BY d.gallery_id, d.id`,
  );

  let sort = 0;
  let lastGallery = null;
  for (const row of details) {
    if (lastGallery !== row.gallery_id) {
      lastGallery = row.gallery_id;
      sort = 0;
    }
    sort += 1;

    const albumId = albumIdByLegacy.get(Number(row.gallery_id));
    if (!albumId) {
      summary.items.skipped += 1;
      continue;
    }

    const isVideo = Number(row.gallery_type) === 2;
    const imageName =
      row.original_image || row.full_image || row.medium_image || row.thumbnail || null;

    let storagePending;
    if (isVideo && row.video_link && /^https?:\/\//i.test(String(row.video_link))) {
      storagePending = String(row.video_link);
    } else if (imageName) {
      storagePending = pendingPath("media-items", row.id, imageName);
      const local = resolveGalleryFile(row.gallery_id, row.id, imageName);
      summary.items.filesOnDisk += local ? 1 : 0;
      summary.items.filesMissing += local ? 0 : 1;
    } else {
      summary.items.skipped += 1;
      continue;
    }

    const thumbName = row.thumbnail || null;
    const thumbPending =
      thumbName && !isVideo ? pendingPath("media-thumbs", row.id, thumbName) : null;

    try {
      await upsertMediaItem(
        supabase,
        storagePending,
        {
          album_id: albumId,
          title_en: row.title || null,
          title_hi: null,
          media_type: isVideo ? "video" : "image",
          thumbnail_path: thumbPending,
          caption_en: row.caption || row.description || null,
          caption_hi: null,
          sort_order: sort,
        },
        summary.items,
      );
    } catch (e) {
      summary.errors.push(`item ${row.id}: ${e.message}`);
      summary.items.skipped += 1;
    }
  }

  console.log(
    `✓ items meta inserted=${summary.items.inserted} updated=${summary.items.updated} skipped=${summary.items.skipped} onDisk=${summary.items.filesOnDisk} missing=${summary.items.filesMissing}`,
  );

  return albumIdByLegacy;
}

async function importFiles(conn, supabase, summary) {
  const containerName = getAzureContainer();
  const service = getBlobServiceClient();
  const container = service.getContainerClient(containerName);

  // Ensure public blob access (best-effort)
  try {
    await container.setAccessPolicy("blob");
  } catch {
    /* may already be set or account policy blocks */
  }

  // --- Banner files ---
  const { data: banners, error: bErr } = await supabase
    .from("ccshau_banners")
    .select("id, title, image_path")
    .like("image_path", "legacy-pending/banners/%");
  if (bErr) throw new Error(bErr.message);

  for (const banner of banners ?? []) {
    const parts = String(banner.image_path).split("/");
    // legacy-pending/banners/{id}/{file}
    const legacyId = parts[2];
    const fileName = parts.slice(3).join("/") || "banner.jpg";
    const local = resolveBannerFile(legacyId, fileName);
    if (!local) {
      summary.fileUpload.bannersMissing += 1;
      continue;
    }
    const blobPath = `banners/${banner.id}/${sanitizeFileName(fileName)}`;
    try {
      if (!DRY_RUN) {
        const stored = await uploadLocalFile(container, blobPath, local);
        const { error } = await supabase
          .from("ccshau_banners")
          .update({ image_path: stored })
          .eq("id", banner.id);
        if (error) throw new Error(error.message);
      }
      summary.fileUpload.bannersUploaded += 1;
    } catch (e) {
      summary.errors.push(`banner file ${banner.id}: ${e.message}`);
      summary.fileUpload.bannersFailed += 1;
    }
  }

  console.log(
    `✓ banner files uploaded=${summary.fileUpload.bannersUploaded} missing=${summary.fileUpload.bannersMissing} failed=${summary.fileUpload.bannersFailed}`,
  );

  // --- Album covers ---
  const { data: albums, error: aErr } = await supabase
    .from("ccshau_media_albums")
    .select("id, slug, cover_image_path")
    .like("cover_image_path", "legacy-pending/media-albums/%");
  if (aErr) throw new Error(aErr.message);

  for (const album of albums ?? []) {
    const parts = String(album.cover_image_path).split("/");
    const legacyId = parts[2];
    const fileName = parts.slice(3).join("/");
    const local = resolveGalleryFile(legacyId, null, fileName);
    if (!local) {
      summary.fileUpload.coversMissing += 1;
      continue;
    }
    const blobPath = `albums/${album.id}/cover/${sanitizeFileName(fileName)}`;
    try {
      if (!DRY_RUN) {
        const stored = await uploadLocalFile(container, blobPath, local);
        const { error } = await supabase
          .from("ccshau_media_albums")
          .update({ cover_image_path: stored })
          .eq("id", album.id);
        if (error) throw new Error(error.message);
      }
      summary.fileUpload.coversUploaded += 1;
    } catch (e) {
      summary.errors.push(`cover ${album.id}: ${e.message}`);
      summary.fileUpload.coversFailed += 1;
    }
  }

  console.log(
    `✓ album covers uploaded=${summary.fileUpload.coversUploaded} missing=${summary.fileUpload.coversMissing} failed=${summary.fileUpload.coversFailed}`,
  );

  // --- Media items ---
  const { data: items, error: iErr } = await supabase
    .from("ccshau_media_items")
    .select("id, album_id, storage_path, thumbnail_path")
    .like("storage_path", "legacy-pending/media-items/%");
  if (iErr) throw new Error(iErr.message);

  // Build legacy detail id → gallery_id from MySQL for path resolve
  const [details] = await conn.query(
    `SELECT id, gallery_id, original_image, full_image, thumbnail FROM hau_gallery_detail`,
  );
  const detailById = new Map(details.map((d) => [Number(d.id), d]));

  for (const item of items ?? []) {
    const parts = String(item.storage_path).split("/");
    const legacyDetailId = Number(parts[2]);
    const fileName = parts.slice(3).join("/");
    const detail = detailById.get(legacyDetailId);
    const local = resolveGalleryFile(detail?.gallery_id, legacyDetailId, fileName);
    if (!local) {
      summary.fileUpload.itemsMissing += 1;
      continue;
    }
    const blobPath = `albums/${item.album_id}/items/${item.id}/${sanitizeFileName(fileName)}`;
    try {
      if (!DRY_RUN) {
        const stored = await uploadLocalFile(container, blobPath, local);
        let thumbStored = item.thumbnail_path;
        if (item.thumbnail_path?.startsWith("legacy-pending/media-thumbs/")) {
          const tParts = item.thumbnail_path.split("/");
          const tName = tParts.slice(3).join("/");
          const tLocal = resolveGalleryFile(detail?.gallery_id, legacyDetailId, tName);
          if (tLocal) {
            const tBlob = `albums/${item.album_id}/items/${item.id}/thumb-${sanitizeFileName(tName)}`;
            thumbStored = await uploadLocalFile(container, tBlob, tLocal);
          }
        }
        const { error } = await supabase
          .from("ccshau_media_items")
          .update({ storage_path: stored, thumbnail_path: thumbStored })
          .eq("id", item.id);
        if (error) throw new Error(error.message);
      }
      summary.fileUpload.itemsUploaded += 1;
    } catch (e) {
      summary.errors.push(`item file ${item.id}: ${e.message}`);
      summary.fileUpload.itemsFailed += 1;
    }

    if (summary.fileUpload.itemsUploaded % 50 === 0 && summary.fileUpload.itemsUploaded) {
      console.log(`  … items uploaded ${summary.fileUpload.itemsUploaded}`);
    }
  }

  console.log(
    `✓ media items uploaded=${summary.fileUpload.itemsUploaded} missing=${summary.fileUpload.itemsMissing} failed=${summary.fileUpload.itemsFailed}`,
  );
}

async function main() {
  if (!DO_META && !DO_FILES) {
    console.error("Specify --meta and/or --files");
    console.error(
      "Usage: node apply-banners-media.mjs --meta --files --confirm\n       node apply-banners-media.mjs --meta --files --dry-run",
    );
    process.exit(1);
  }
  if (!CONFIRM && !DRY_RUN) {
    console.error("Refusing without --confirm (or use --dry-run).");
    process.exit(1);
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (!existsSync(UPLOADS_ROOT)) {
    console.error(`LEGACY_UPLOADS_ROOT not found: ${UPLOADS_ROOT}`);
    process.exit(1);
  }

  const mysqlConfig = {
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "root",
    password: process.env.LEGACY_MYSQL_PASSWORD || "",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
    dateStrings: true,
  };

  const supabase = createClient(SUPABASE_URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const summary = {
    startedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run" : "apply",
    uploadsRoot: UPLOADS_ROOT,
    azureContainer: getAzureContainer(),
    banners: {
      inserted: 0,
      updated: 0,
      skipped: 0,
      filesOnDisk: 0,
      filesMissing: 0,
    },
    albums: {
      inserted: 0,
      updated: 0,
      skipped: 0,
      filesOnDisk: 0,
      filesMissing: 0,
    },
    items: {
      inserted: 0,
      updated: 0,
      skipped: 0,
      filesOnDisk: 0,
      filesMissing: 0,
    },
    fileUpload: {
      bannersUploaded: 0,
      bannersMissing: 0,
      bannersFailed: 0,
      coversUploaded: 0,
      coversMissing: 0,
      coversFailed: 0,
      itemsUploaded: 0,
      itemsMissing: 0,
      itemsFailed: 0,
    },
    errors: [],
  };

  console.log(`Banners + Media import (${summary.mode})`);
  console.log(`Uploads root: ${UPLOADS_ROOT}`);
  console.log(`Azure container: ${summary.azureContainer}`);
  console.log(`MySQL ${mysqlConfig.host}/${mysqlConfig.database}`);
  console.log(`Supabase ${new URL(SUPABASE_URL).hostname}`);
  console.log(`Steps: meta=${DO_META} files=${DO_FILES}`);

  const conn = await mysql.createConnection(mysqlConfig);
  try {
    if (DO_META) await importMeta(conn, supabase, summary);
    if (DO_FILES) await importFiles(conn, supabase, summary);
  } finally {
    await conn.end();
  }

  summary.finishedAt = new Date().toISOString();
  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "banners-media-apply-latest.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`Report: ${out}`);
  if (summary.errors.length) {
    console.log(`Errors: ${summary.errors.length} (see report)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
