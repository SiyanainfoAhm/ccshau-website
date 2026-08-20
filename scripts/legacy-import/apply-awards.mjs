/**
 * Replace /pages/awards faculty-award HTML with the live university
 * awards gallery from https://hau.ac.in/awards (hau_awards).
 *
 * Usage:
 *   node apply-awards.mjs --dry-run
 *   node apply-awards.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const SLUG = "awards";
const LIVE_URL = "https://hau.ac.in/awards";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

const LAYOUT_CONFIG = {
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
  collegeTopMenu: false,
  showInDepartmentsMenu: true,
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

function loadFromWeb(name) {
  return createRequire(join(ROOT, "apps/web/package.json"))(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLiveOrder(html) {
  const ids = [...html.matchAll(/getAwardDetail\((\d+)\)/g)].map((m) => Number(m[1]));
  return [...new Set(ids)];
}

function awardImageUrl(path) {
  const raw = String(path || "").trim().replace(/\\/g, "/");
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const cleaned = raw.replace(/^\/+/, "").replace(/^storage\/app\//i, "");
  return `https://hau.ac.in/storage/app/${cleaned}`;
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const liveRes = await fetch(LIVE_URL);
  if (!liveRes.ok) throw new Error(`Live page fetch failed: ${liveRes.status}`);
  const liveOrder = extractLiveOrder(await liveRes.text());
  if (liveOrder.length < 10) throw new Error("Live awards list too short");

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
    charset: "utf8mb4",
  });

  const [rows] = await conn.query(
    `SELECT id, award_title, award_image, award_url, award_status
     FROM hau_awards
     WHERE award_status = 1`,
  );
  await conn.end();

  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  const items = [];
  for (const id of liveOrder) {
    const row = byId.get(id);
    if (!row) {
      console.warn(`Missing MySQL award ${id}`);
      continue;
    }
    const imageUrl = awardImageUrl(row.award_image);
    if (!imageUrl) {
      console.warn(`Award ${id} has no image`);
      continue;
    }
    items.push({
      legacyId: id,
      titleEn: decodeHtml(row.award_title),
      imageUrl,
      href: row.award_url ? String(row.award_url).trim() : null,
    });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: page, error: pageErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en")
    .eq("slug", SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page?.id) throw new Error(`Missing CMS page ${SLUG}`);

  const galleryRows = items.map((item, index) => ({
    page_id: page.id,
    image_url: item.imageUrl,
    thumbnail_url: item.imageUrl,
    title_en: item.titleEn,
    title_hi: null,
    sort_order: index + 1,
    is_active: true,
  }));

  const report = {
    slug: SLUG,
    pageId: page.id,
    liveCount: liveOrder.length,
    imported: items.map((item) => item.titleEn),
    dryRun: DRY_RUN,
  };

  if (!DRY_RUN) {
    const { error: pageUpdateErr } = await supabase
      .from("ccshau_pages")
      .update({
        title_en: "Awards",
        title_hi: "पुरस्कार",
        excerpt_en: "University awards, rankings, and institutional honours.",
        excerpt_hi: "विश्वविद्यालय पुरस्कार, रैंकिंग और संस्थागत सम्मान।",
        content_en: "",
        content_hi: "",
        layout_template: "standard",
        layout_config: LAYOUT_CONFIG,
        meta_title: "Awards",
        meta_description: "University awards, rankings, and institutional honours of CCS HAU Hisar.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);
    if (pageUpdateErr) throw new Error(pageUpdateErr.message);

    const { error: delErr } = await supabase
      .from("ccshau_page_gallery_items")
      .delete()
      .eq("page_id", page.id);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await supabase
      .from("ccshau_page_gallery_items")
      .insert(galleryRows);
    if (insErr) throw new Error(insErr.message);
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, "apply-awards.json"), JSON.stringify(report, null, 2));
  console.log(DRY_RUN ? "dry-run awards" : "apply awards");
  console.log("count", items.length);
  console.log(items.slice(0, 5).map((item) => item.titleEn).join("\n"));
  console.log("Report:", join(REPORT_DIR, "apply-awards.json"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
