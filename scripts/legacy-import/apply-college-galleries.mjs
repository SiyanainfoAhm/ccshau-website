/**
 * Remap college-scoped legacy galleries into college Gallery section pages
 * (ccshau_page_gallery_items), and unpublish those albums from Media Centre.
 *
 * Legacy:
 *   hau_college.college_id
 *   hau_gallery.gallery_college = college_id
 *   hau_gallery_detail.gallery_id = gallery_id
 *
 * Usage:
 *   node apply-college-galleries.mjs --dry-run
 *   node apply-college-galleries.mjs --confirm
 *   node apply-college-galleries.mjs --confirm --college=2
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");
const collegeArg = process.argv.find((a) => a.startsWith("--college="));
const ONLY_COLLEGE = collegeArg ? Number(collegeArg.slice("--college=".length)) : null;

const SLUG_ALIASES = {
  "college-of-basic-sciences-humanities": "college-basic-sciences-humanities",
  "ic-college-of-home-science": "ic-college-of-community-science",
};

const PREFIX_BY_TARGET_SLUG = {
  "college-of-agriculture-hisar": "hisar",
  "college-of-agriculture-kaul": "kaul",
  "college-of-agriculture-bawal": "bawal",
  "college-of-agricultural-engineering-and-technology": "coaet",
  "college-basic-sciences-humanities": "cbs",
  "basic-sciences-humanities": "humanities",
  "centre-of-food-science-technology": "cfst",
  "ic-college-of-community-science": "icccs",
  "college-of-fisheries-science": "cfs",
  "college-of-biotechnology": "cbt",
  "directorate-of-research": "dor",
  "directorate-of-extension-education": "dee",
  "directorate-of-students-welfare": "dsw",
  "pg-studies": "pg",
  "campus-school": "cs",
  "nehru-library": "nl",
};

const GALLERY_LAYOUT = {
  hero: false,
  headOfficer: false,
  contacts: false,
  staff: false,
  gallery: true,
  newsTicker: false,
  studentCorner: false,
  mainContent: false,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

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

function loadPkg(name) {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)(name);
    } catch {
      /* next */
    }
  }
  throw new Error(`Install ${name}`);
}

const { createClient } = loadPkg("@supabase/supabase-js");

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

function derivePrefix(targetSlug, legacyId) {
  if (PREFIX_BY_TARGET_SLUG[targetSlug]) return PREFIX_BY_TARGET_SLUG[targetSlug];
  if (targetSlug.startsWith("krishi-vigyan-kendra-")) {
    return `kvk-${targetSlug.replace(/^krishi-vigyan-kendra-/, "").slice(0, 20)}`;
  }
  // Prefer a stable unique prefix from the full slug (avoids collisions like "bawal"/"hisar").
  const compact = targetSlug.replace(/^(college-of-|directorate-of-|centre-of-)/, "").slice(0, 28);
  if (compact) return compact;
  return `c${legacyId}`;
}

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
  throw new Error("Azure credentials missing");
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
  };
  return map[ext] || "application/octet-stream";
}

function resolveGalleryFile(galleryId, detailId, rawName) {
  const base = basename(String(rawName || "").replace(/\\/g, "/"));
  if (!base) return null;
  const candidates = [
    join(UPLOADS_ROOT, "images", "gallery", "images", String(detailId), base),
    join(UPLOADS_ROOT, "images", "gallery", String(galleryId), base),
    join(UPLOADS_ROOT, "images", "gallery", base),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function uploadLocal(container, blobPath, localPath) {
  const buf = await readFile(localPath);
  await container.getBlockBlobClient(blobPath).uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(localPath) },
  });
  return `${container.containerName}/${blobPath}`;
}

async function findCollegeRoot(supabase, targetSlug) {
  const { data, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", targetSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function findOrCreateGalleryPage(supabase, collegeRoot, prefix, summary) {
  const preferredSlugs = [`${prefix}-gallery`, "gallery", `${collegeRoot.slug}-gallery`];
  const { data: children, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, layout_config, status")
    .eq("parent_id", collegeRoot.id);
  if (error) throw new Error(error.message);

  let page =
    (children || []).find((p) => preferredSlugs.includes(p.slug)) ||
    (children || []).find((p) => String(p.slug).endsWith("-gallery") || p.slug === "gallery");

  if (page) {
    const cfg = { ...(page.layout_config || {}), ...GALLERY_LAYOUT };
    if (!DRY_RUN) {
      await supabase
        .from("ccshau_pages")
        .update({
          layout_config: cfg,
          layout_template: "standard",
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", page.id);
    }
    summary.galleryPagesReused += 1;
    return page;
  }

  const trySlugs = [`${prefix}-gallery`, `${collegeRoot.slug}-gallery`, `gallery-${collegeRoot.id.slice(0, 8)}`];

  for (const slug of trySlugs) {
    const payload = {
      slug,
      title_en: "Gallery",
      title_hi: "गैलरी",
      excerpt_en: `Photo gallery from ${collegeRoot.title_en || collegeRoot.slug}.`,
      excerpt_hi: null,
      content_en: "",
      content_hi: null,
      parent_id: collegeRoot.id,
      page_type: "standard",
      layout_template: "standard",
      layout_config: GALLERY_LAYOUT,
      status: "published",
      published_at: new Date().toISOString(),
      sort_order: 2,
      office_cta_enabled: false,
    };

    if (DRY_RUN) {
      summary.galleryPagesCreated += 1;
      return { id: `dry-${slug}`, slug };
    }

    const { data, error: insErr } = await supabase
      .from("ccshau_pages")
      .insert(payload)
      .select("id, slug")
      .single();

    if (!insErr && data) {
      summary.galleryPagesCreated += 1;
      return data;
    }
    if (insErr && !/duplicate key|unique constraint/i.test(insErr.message)) {
      throw new Error(`create gallery page ${slug}: ${insErr.message}`);
    }
    // slug taken globally — try next candidate
  }

  throw new Error(`Could not create gallery page under ${collegeRoot.slug}`);
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --confirm or --dry-run");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const container = getBlobServiceClient().getContainerClient(getAzureContainer());
  try {
    await container.setAccessPolicy("blob");
  } catch {
    /* ignore */
  }

  const summary = {
    startedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run" : "apply",
    galleryPagesCreated: 0,
    galleryPagesReused: 0,
    collegesProcessed: 0,
    collegesSkippedMissingPage: 0,
    itemsInserted: 0,
    itemsSkipped: 0,
    itemsMissingFile: 0,
    itemsFromMediaReuse: 0,
    itemsUploaded: 0,
    albumsUnpublished: 0,
    errors: [],
  };

  const mysqlConfig = {
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "root",
    password: process.env.LEGACY_MYSQL_PASSWORD || "",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  };

  console.log(`College gallery remap (${summary.mode})`);
  const conn = await mysql.createConnection(mysqlConfig);

  try {
    let collegeSql = `SELECT college_id, college_name, college_slug, type FROM hau_college`;
    const params = [];
    if (ONLY_COLLEGE) {
      collegeSql += ` WHERE college_id = ?`;
      params.push(ONLY_COLLEGE);
    }
    collegeSql += ` ORDER BY college_id`;
    const [colleges] = await conn.query(collegeSql, params);

    const [galleries] = await conn.query(
      `SELECT gallery_id, gallery_title, gallery_college, gallery_type, gallery_status, gallery_image
       FROM hau_gallery
       WHERE gallery_status = 1
         AND gallery_college IS NOT NULL
         AND gallery_college <> 0
         ${ONLY_COLLEGE ? "AND gallery_college = ?" : ""}
       ORDER BY gallery_college, gallery_sort_order, gallery_id`,
      ONLY_COLLEGE ? [ONLY_COLLEGE] : [],
    );

    const galleriesByCollege = new Map();
    for (const g of galleries) {
      const cid = Number(g.gallery_college);
      if (!galleriesByCollege.has(cid)) galleriesByCollege.set(cid, []);
      galleriesByCollege.get(cid).push(g);
    }

    for (const college of colleges) {
      try {
      const legacyId = Number(college.college_id);
      const collegeGalleries = galleriesByCollege.get(legacyId) || [];
      if (!collegeGalleries.length) continue;

      const legacySlug =
        college.college_slug || slugify(college.college_name) || `college-${legacyId}`;
      const targetSlug = SLUG_ALIASES[legacySlug] || legacySlug;
      const prefix = derivePrefix(targetSlug, legacyId);

      const root = await findCollegeRoot(supabase, targetSlug);
      if (!root) {
        summary.collegesSkippedMissingPage += 1;
        summary.errors.push(`No CMS page for college ${legacyId} slug=${targetSlug}`);
        continue;
      }

      const galleryPage = await findOrCreateGalleryPage(supabase, root, prefix, summary);
      summary.collegesProcessed += 1;
      console.log(
        `College ${legacyId} ${targetSlug} → gallery page ${galleryPage.slug} (${collegeGalleries.length} albums)`,
      );

      // Replace gallery contents for this college section (legacy is source of truth).
      if (!DRY_RUN) {
        await supabase.from("ccshau_page_gallery_items").delete().eq("page_id", galleryPage.id);
      }

      let sort = 0;
      for (const g of collegeGalleries) {
        const albumSlug = `legacy-gallery-${g.gallery_id}`;

        // Reuse Azure paths from media centre album if present
        const { data: album } = await supabase
          .from("ccshau_media_albums")
          .select("id, slug, status")
          .eq("slug", albumSlug)
          .maybeSingle();

        let mediaItems = [];
        if (album?.id) {
          const { data: items } = await supabase
            .from("ccshau_media_items")
            .select("id, title_en, storage_path, thumbnail_path, sort_order")
            .eq("album_id", album.id)
            .order("sort_order", { ascending: true });
          mediaItems = items || [];
        }

        const [details] = await conn.query(
          `SELECT id, gallery_id, title, caption, full_image, original_image, thumbnail, status
           FROM hau_gallery_detail
           WHERE gallery_id = ? AND status = 1
           ORDER BY id`,
          [g.gallery_id],
        );

        // Index media items by basename of storage_path for reuse
        const mediaByBase = new Map();
        for (const mi of mediaItems) {
          const base = basename(String(mi.storage_path || "").replace(/\\/g, "/"));
          if (base) mediaByBase.set(base.toLowerCase(), mi);
          // also pending-style
          const pendingBase = basename(
            String(mi.storage_path || "")
              .split("/")
              .slice(-1)[0] || "",
          );
          if (pendingBase) mediaByBase.set(pendingBase.toLowerCase(), mi);
        }

        for (const detail of details) {
          sort += 1;
          const fileName =
            detail.original_image || detail.full_image || detail.thumbnail || null;
          if (!fileName) {
            summary.itemsSkipped += 1;
            continue;
          }
          const base = basename(String(fileName).replace(/\\/g, "/"));
          const reused = mediaByBase.get(base.toLowerCase());

          let imageUrl = null;
          let thumbUrl = null;

          if (reused?.storage_path && !String(reused.storage_path).startsWith("legacy-pending/")) {
            imageUrl = reused.storage_path;
            thumbUrl =
              reused.thumbnail_path &&
              !String(reused.thumbnail_path).startsWith("legacy-pending/")
                ? reused.thumbnail_path
                : null;
            summary.itemsFromMediaReuse += 1;
          } else {
            const local = resolveGalleryFile(g.gallery_id, detail.id, fileName);
            if (!local) {
              summary.itemsMissingFile += 1;
              continue;
            }
            if (!DRY_RUN) {
              const itemId = crypto.randomUUID();
              const blobPath = `pages/gallery/${galleryPage.id}/${itemId}/${sanitizeFileName(base)}`;
              imageUrl = await uploadLocal(container, blobPath, local);
              if (detail.thumbnail) {
                const tLocal = resolveGalleryFile(g.gallery_id, detail.id, detail.thumbnail);
                if (tLocal) {
                  thumbUrl = await uploadLocal(
                    container,
                    `pages/gallery/${galleryPage.id}/${itemId}/thumb-${sanitizeFileName(detail.thumbnail)}`,
                    tLocal,
                  );
                }
              }
              summary.itemsUploaded += 1;
            } else {
              summary.itemsUploaded += 1;
              imageUrl = `dry-run://${base}`;
            }
          }

          const row = {
            page_id: galleryPage.id,
            image_url: imageUrl,
            thumbnail_url: thumbUrl,
            title_en: detail.title || g.gallery_title || "Gallery",
            title_hi: null,
            sort_order: sort,
            is_active: true,
          };

          if (!DRY_RUN) {
            const { error } = await supabase.from("ccshau_page_gallery_items").insert(row);
            if (error) {
              summary.errors.push(`detail ${detail.id}: ${error.message}`);
              summary.itemsSkipped += 1;
              continue;
            }
          }
          summary.itemsInserted += 1;
        }

        // Unpublish college-scoped album from media centre
        if (album?.id && !DRY_RUN) {
          const { error } = await supabase
            .from("ccshau_media_albums")
            .update({ status: "archived" })
            .eq("id", album.id);
          if (error) summary.errors.push(`unpublish ${albumSlug}: ${error.message}`);
          else summary.albumsUnpublished += 1;
        } else if (album?.id && DRY_RUN) {
          summary.albumsUnpublished += 1;
        }
      }
      } catch (e) {
        summary.errors.push(`college ${college.college_id}: ${e.message || e}`);
        console.error(`! college ${college.college_id} failed:`, e.message || e);
      }
    }
  } finally {
    await conn.end();
  }

  summary.finishedAt = new Date().toISOString();
  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "college-galleries-latest.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
