/**
 * Delete college-scoped legacy media albums from Media Centre
 * (already remapped to college gallery pages).
 *
 * Keeps university-wide albums (gallery_college null/0) that stay published.
 *
 * Usage:
 *   node delete-college-media-albums.mjs --dry-run
 *   node delete-college-media-albums.mjs --confirm
 *   node delete-college-media-albums.mjs --confirm --college=2
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");
const collegeArg = process.argv.find((a) => a.startsWith("--college="));
const ONLY_COLLEGE = collegeArg ? Number(collegeArg.slice("--college=".length)) : null;

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

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

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

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    user: process.env.LEGACY_MYSQL_USER || "root",
    password: process.env.LEGACY_MYSQL_PASSWORD || "",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  const summary = {
    mode: DRY_RUN ? "dry-run" : "apply",
    albumsToDelete: [],
    itemsDeleted: 0,
    albumsDeleted: 0,
    errors: [],
  };

  try {
    const [rows] = await conn.query(
      `SELECT gallery_id, gallery_title, gallery_college
       FROM hau_gallery
       WHERE gallery_college IS NOT NULL AND gallery_college <> 0
         ${ONLY_COLLEGE ? "AND gallery_college = ?" : ""}`,
      ONLY_COLLEGE ? [ONLY_COLLEGE] : [],
    );

    for (const g of rows) {
      const slug = `legacy-gallery-${g.gallery_id}`;
      const { data: album, error } = await supabase
        .from("ccshau_media_albums")
        .select("id, slug, title_en, status")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        summary.errors.push(`${slug}: ${error.message}`);
        continue;
      }
      if (!album) continue;

      const { count: itemCount } = await supabase
        .from("ccshau_media_items")
        .select("id", { count: "exact", head: true })
        .eq("album_id", album.id);

      summary.albumsToDelete.push({
        galleryId: g.gallery_id,
        collegeId: g.gallery_college,
        slug,
        albumId: album.id,
        status: album.status,
        items: itemCount ?? 0,
      });

      if (DRY_RUN) continue;

      const { error: delItemsErr } = await supabase
        .from("ccshau_media_items")
        .delete()
        .eq("album_id", album.id);
      if (delItemsErr) {
        summary.errors.push(`items ${slug}: ${delItemsErr.message}`);
        continue;
      }
      summary.itemsDeleted += itemCount ?? 0;

      const { error: delAlbumErr } = await supabase
        .from("ccshau_media_albums")
        .delete()
        .eq("id", album.id);
      if (delAlbumErr) {
        summary.errors.push(`album ${slug}: ${delAlbumErr.message}`);
        continue;
      }
      summary.albumsDeleted += 1;
      console.log(`✓ deleted ${slug} (${itemCount ?? 0} items) college=${g.gallery_college}`);
    }
  } finally {
    await conn.end();
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "delete-college-media-latest.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        mode: summary.mode,
        albumsFound: summary.albumsToDelete.length,
        albumsDeleted: summary.albumsDeleted,
        itemsDeleted: summary.itemsDeleted,
        hisar: summary.albumsToDelete.find((a) => a.galleryId === 95 || a.collegeId === 2),
        errors: summary.errors,
      },
      null,
      2,
    ),
  );
  console.log(`Report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
