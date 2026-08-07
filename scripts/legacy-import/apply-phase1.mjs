/**
 * Phase 1 live import: legacy hau_db → Supabase (metadata only, upsert, no wipe).
 *
 * Imports:
 *   - social URLs → ccshau_site_settings
 *   - banners → ccshau_banners (placeholder image_path until files arrive)
 *   - downloads → ccshau_downloads (placeholder file_path)
 *   - news + jobs → ccshau_news (upsert by slug)
 *   - tenders → ccshau_tenders (upsert by slug)
 *   - flagships + initiatives → ccshau_homepage_initiatives (placeholder image)
 *   - partners → ccshau_related_links
 *
 * Usage:
 *   node apply-phase1.mjs --confirm
 *
 * Env (MySQL): LEGACY_MYSQL_*
 * Env (Supabase): from apps/web/.env.local — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");

const NEWS_CATEGORY_IDS = [5, 28, 29];
const JOBS_CATEGORY_ID = 4;
const TENDER_CATEGORY_ID = 3;

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

function toIsoOrNull(value) {
  if (!value) return null;
  const s = String(value);
  if (s.startsWith("0000-00-00")) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function pendingPath(kind, legacyId, raw) {
  const base = basename(String(raw || "pending.bin").replace(/\\/g, "/")) || "pending.bin";
  return `legacy-pending/${kind}/${legacyId}/${base}`;
}

function mapSocial(rows) {
  const out = {
    social_twitter_url: null,
    social_facebook_url: null,
    social_youtube_url: null,
    social_blogger_url: null,
    social_instagram_url: null,
  };
  for (const row of rows) {
    if (Number(row.status) !== 1) continue;
    const name = String(row.social_name || "").toLowerCase();
    const link = row.social_link || null;
    if (!link) continue;
    if (name.includes("twitter") || name === "x" || name.includes("x.com")) {
      out.social_twitter_url = link;
    } else if (name.includes("facebook")) out.social_facebook_url = link;
    else if (name.includes("youtube")) out.social_youtube_url = link;
    else if (name.includes("blog")) out.social_blogger_url = link;
    else if (name.includes("instagram")) out.social_instagram_url = link;
  }
  return out;
}

async function upsertBySlug(supabase, table, row, stats) {
  const { data: existing, error: findErr } = await supabase
    .from(table)
    .select("id")
    .eq("slug", row.slug)
    .maybeSingle();
  if (findErr) throw new Error(`${table} find ${row.slug}: ${findErr.message}`);

  if (existing?.id) {
    const { error } = await supabase.from(table).update(row).eq("id", existing.id);
    if (error) throw new Error(`${table} update ${row.slug}: ${error.message}`);
    stats.updated += 1;
    return "updated";
  }
  const { error } = await supabase.from(table).insert(row);
  if (error) throw new Error(`${table} insert ${row.slug}: ${error.message}`);
  stats.inserted += 1;
  return "inserted";
}

async function upsertByExact(supabase, table, matchCol, matchVal, row, stats) {
  const { data: existing, error: findErr } = await supabase
    .from(table)
    .select("id")
    .eq(matchCol, matchVal)
    .maybeSingle();
  if (findErr) throw new Error(`${table} find: ${findErr.message}`);

  if (existing?.id) {
    const { error } = await supabase.from(table).update(row).eq("id", existing.id);
    if (error) throw new Error(`${table} update: ${error.message}`);
    stats.updated += 1;
    return "updated";
  }
  const { error } = await supabase.from(table).insert(row);
  if (error) throw new Error(`${table} insert: ${error.message}`);
  stats.inserted += 1;
  return "inserted";
}

async function main() {
  if (!CONFIRM) {
    console.error("Refusing to run without --confirm (safety).");
    console.error("Usage: node apply-phase1.mjs --confirm");
    process.exit(1);
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
    mode: "phase1-metadata-upsert",
    wipe: false,
    social: { updated: false },
    banners: { inserted: 0, updated: 0, skipped: 0 },
    downloads: { inserted: 0, updated: 0, skipped: 0 },
    news: { inserted: 0, updated: 0, skipped: 0 },
    tenders: { inserted: 0, updated: 0, skipped: 0 },
    initiatives: { inserted: 0, updated: 0, skipped: 0 },
    partners: { inserted: 0, updated: 0, skipped: 0 },
    errors: [],
  };

  console.log("Phase 1 metadata import (upsert, no wipe)");
  console.log(`MySQL ${mysqlConfig.host}/${mysqlConfig.database}`);
  console.log(`Supabase ${new URL(SUPABASE_URL).hostname}`);

  const conn = await mysql.createConnection(mysqlConfig);

  try {
    // --- Social ---
    const [socialRows] = await conn.query(
      "SELECT id, social_name, social_link, status FROM hau_social ORDER BY id",
    );
    const social = mapSocial(socialRows);
    const { error: socialErr } = await supabase
      .from("ccshau_site_settings")
      .update({
        ...social,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (socialErr) throw new Error(`site_settings: ${socialErr.message}`);
    summary.social.updated = true;
    summary.social.urls = social;
    console.log("✓ social URLs updated on site_settings");

    // --- Banners ---
    const [bannerRows] = await conn.query(
      `SELECT id, slider_title, slider_images, slider_link, slider_order, status
       FROM hau_slider_detail WHERE status = 1 ORDER BY slider_order, id`,
    );
    for (const row of bannerRows) {
      const imagePath = pendingPath("banners", row.id, row.slider_images || `banner-${row.id}.jpg`);
      const payload = {
        title: row.slider_title || `Banner ${row.id}`,
        image_path: imagePath,
        target_url: row.slider_link || null,
        alt_text: row.slider_title || null,
        priority: Number(row.slider_order || 0),
        is_active: true,
      };
      try {
        await upsertByExact(
          supabase,
          "ccshau_banners",
          "image_path",
          imagePath,
          payload,
          summary.banners,
        );
      } catch (e) {
        summary.banners.skipped += 1;
        summary.errors.push(String(e.message || e));
      }
    }
    console.log(
      `✓ banners inserted=${summary.banners.inserted} updated=${summary.banners.updated} skipped=${summary.banners.skipped}`,
    );

    // --- Downloads ---
    const [downloadRows] = await conn.query(
      `SELECT id, title, download_file, status, created_at
       FROM hau_downloads WHERE status = 1 ORDER BY id`,
    );
    for (const row of downloadRows) {
      const fileName = basename(String(row.download_file || `file-${row.id}.pdf`).replace(/\\/g, "/"));
      const filePath = pendingPath("downloads", row.id, row.download_file || fileName);
      const payload = {
        title_en: row.title || `Download ${row.id}`,
        title_hi: null,
        category: "legacy-import",
        file_path: filePath,
        file_name: fileName || `file-${row.id}.pdf`,
        status: "published",
        published_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
        is_public: true,
      };
      try {
        await upsertByExact(
          supabase,
          "ccshau_downloads",
          "file_path",
          filePath,
          payload,
          summary.downloads,
        );
      } catch (e) {
        summary.downloads.skipped += 1;
        summary.errors.push(String(e.message || e));
      }
    }
    console.log(
      `✓ downloads inserted=${summary.downloads.inserted} updated=${summary.downloads.updated} skipped=${summary.downloads.skipped}`,
    );

    // --- News + jobs ---
    const [categoryRows] = await conn.query(
      "SELECT category_id, category_name FROM hau_notification_category",
    );
    const categoryById = new Map(
      categoryRows.map((r) => [Number(r.category_id), r.category_name]),
    );
    const newsCatList = [...NEWS_CATEGORY_IDS, JOBS_CATEGORY_ID].join(",");
    const [newsRows] = await conn.query(
      `SELECT id, category_id, notification_name, notification_slug, notification_link,
              notification_file, is_featured, status, created_at
       FROM hau_notifications
       WHERE status = 1 AND category_id IN (${newsCatList})
       ORDER BY id DESC`,
    );
    for (const row of newsRows) {
      const categoryName = categoryById.get(Number(row.category_id)) || null;
      const slugBase =
        row.notification_slug || slugify(row.notification_name) || `notice-${row.id}`;
      const slug = `${slugBase}-${row.id}`.slice(0, 180);
      const attachments = [];
      if (row.notification_file) {
        attachments.push({
          path: pendingPath("news", row.id, row.notification_file),
          name: basename(String(row.notification_file).replace(/\\/g, "/")),
        });
      }
      const payload = {
        slug,
        title_en: row.notification_name || `News ${row.id}`,
        title_hi: null,
        body_en: row.notification_link
          ? `<p>Legacy link: <a href="${String(row.notification_link).replace(/"/g, "")}">${String(row.notification_link).replace(/</g, "")}</a></p>`
          : null,
        notice_type: String(categoryName || "").toLowerCase().includes("job")
          ? "notice"
          : "news",
        category: categoryName,
        status: "published",
        published_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
        is_featured: String(row.is_featured) === "1",
        is_pinned: false,
        attachment_paths: attachments,
      };
      try {
        await upsertBySlug(supabase, "ccshau_news", payload, summary.news);
      } catch (e) {
        summary.news.skipped += 1;
        summary.errors.push(String(e.message || e));
      }
    }
    console.log(
      `✓ news inserted=${summary.news.inserted} updated=${summary.news.updated} skipped=${summary.news.skipped}`,
    );

    // --- Tenders ---
    const [tenderRows] = await conn.query(
      `SELECT id, category_id, notification_name, notification_slug, notification_link,
              notification_file, is_featured, status, created_at
       FROM hau_notifications
       WHERE status = 1 AND category_id = ?
       ORDER BY id DESC`,
      [TENDER_CATEGORY_ID],
    );
    for (const row of tenderRows) {
      const slugBase =
        row.notification_slug || slugify(row.notification_name) || `tender-${row.id}`;
      const slug = `${slugBase}-${row.id}`.slice(0, 180);
      const docs = [];
      if (row.notification_file) {
        docs.push({
          path: pendingPath("tenders", row.id, row.notification_file),
          name: basename(String(row.notification_file).replace(/\\/g, "/")),
        });
      }
      const payload = {
        slug,
        title_en: row.notification_name || `Tender ${row.id}`,
        title_hi: null,
        description_en: row.notification_link
          ? `Legacy link: ${row.notification_link}`
          : null,
        category: "Tender",
        status: "open",
        published_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
        document_paths: docs,
        tender_number: `LEGACY-${row.id}`,
      };
      try {
        await upsertBySlug(supabase, "ccshau_tenders", payload, summary.tenders);
      } catch (e) {
        summary.tenders.skipped += 1;
        summary.errors.push(String(e.message || e));
      }
    }
    console.log(
      `✓ tenders inserted=${summary.tenders.inserted} updated=${summary.tenders.updated} skipped=${summary.tenders.skipped}`,
    );

    // --- Homepage initiatives (flagships + initiatives) ---
    const [flagshipRows] = await conn.query(
      "SELECT id, title, description, link, slug, image FROM hau_flagships ORDER BY id",
    );
    const [initiativeRows] = await conn.query(
      "SELECT id, title, description, link, slug, image FROM hau_initiatives ORDER BY id",
    );
    let sort = 100;
    for (const row of [...flagshipRows, ...initiativeRows]) {
      const title = row.title || `Initiative ${row.id}`;
      const imagePath = pendingPath(
        "initiatives",
        row.id,
        row.image || `initiative-${row.id}.jpg`,
      );
      // Live DB: slug + href (NOT NULL). Legacy MySQL often has empty link —
      // derive a college-page href from slug (matches existing seed pattern).
      const slug =
        row.slug || slugify(title) || `legacy-initiative-${row.id}`;
      const hrefFromLegacy = row.link && String(row.link).trim();
      const href = hrefFromLegacy || `/college/${slug}`;
      const payload = {
        title_en: title,
        title_hi: null,
        description_en: row.description || title,
        description_hi: null,
        image_path: imagePath,
        slug,
        href,
        sort_order: sort++,
        is_active: true,
      };
      try {
        // Unique(slug): merge onto existing homepage cards; keep real images/hrefs
        // when legacy only has placeholders / empty links.
        const { data: existing, error: findErr } = await supabase
          .from("ccshau_homepage_initiatives")
          .select("id, image_path, href")
          .eq("slug", slug)
          .maybeSingle();
        if (findErr) throw new Error(findErr.message);
        if (existing?.id) {
          const update = { ...payload };
          if (
            existing.image_path &&
            !String(existing.image_path).startsWith("legacy-pending/")
          ) {
            update.image_path = existing.image_path;
          }
          if (!hrefFromLegacy && existing.href) {
            update.href = existing.href;
          }
          const { error } = await supabase
            .from("ccshau_homepage_initiatives")
            .update(update)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          summary.initiatives.updated += 1;
        } else {
          const { error } = await supabase
            .from("ccshau_homepage_initiatives")
            .insert(payload);
          if (error) throw new Error(error.message);
          summary.initiatives.inserted += 1;
        }
      } catch (e) {
        summary.initiatives.skipped += 1;
        summary.errors.push(String(e.message || e));
      }
    }
    console.log(
      `✓ initiatives inserted=${summary.initiatives.inserted} updated=${summary.initiatives.updated} skipped=${summary.initiatives.skipped}`,
    );

    // --- Partners → related links ---
    const [partnerRows] = await conn.query(
      "SELECT id, title, link, image FROM hau_partners ORDER BY id",
    );
    let partnerOrder = 100;
    for (const row of partnerRows) {
      if (!row.link) {
        summary.partners.skipped += 1;
        continue;
      }
      const payload = {
        title_en: row.title || `Partner ${row.id}`,
        title_hi: null,
        url: row.link,
        category: "legacy-partner",
        sort_order: partnerOrder++,
        is_external: true,
        is_active: true,
      };
      try {
        await upsertByExact(
          supabase,
          "ccshau_related_links",
          "url",
          row.link,
          payload,
          summary.partners,
        );
      } catch (e) {
        summary.partners.skipped += 1;
        summary.errors.push(String(e.message || e));
      }
    }
    console.log(
      `✓ partners inserted=${summary.partners.inserted} updated=${summary.partners.updated} skipped=${summary.partners.skipped}`,
    );

    summary.finishedAt = new Date().toISOString();
    mkdirSync(REPORT_DIR, { recursive: true });
    const outPath = join(REPORT_DIR, "phase1-apply-latest.json");
    writeFileSync(outPath, JSON.stringify(summary, null, 2));
    console.log("\nPhase 1 complete (no wipe).");
    console.log(`Report: ${outPath}`);
    if (summary.errors.length) {
      console.log(`Errors/skips logged: ${summary.errors.length}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
