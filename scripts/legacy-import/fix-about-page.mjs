/**
 * Fix /pages/about — legacy hau.ac.in/page/home content (gate image + HAU history).
 * Wrong content was imported from about-us-3 (Horticulture department).
 *
 * Usage: node scripts/legacy-import/fix-about-page.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

const ABOUT_IMAGE_STORED = "ccshaucontainer/legacy-images/home-about-hau.jpg";

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
  const req = createRequire(join(ROOT, "apps/web/package.json"));
  return req(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");
const sanitizeHtml = loadFromWeb("sanitize-html");

const SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "span",
    "div",
    "section",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "style", "title"],
    a: ["href", "name", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "width", "height", "class", "loading", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
};

function decodeLegacyEntities(html) {
  return String(html || "")
    .replace(/&amp;#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;quot;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;apos;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;amp;/g, "&");
}

function prepareHtml(raw) {
  const decoded = decodeLegacyEntities(raw);
  return sanitizeHtml(decoded, SANITIZE_OPTIONS);
}

async function main() {
  if (!CONFIRM) {
    console.error("Usage: node scripts/legacy-import/fix-about-page.mjs --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    user: process.env.LEGACY_MYSQL_USER || "root",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  const [rows] = await conn.query(
    `SELECT page_title, page_content FROM hau_cms WHERE page_slug = 'home' AND page_status = '1' LIMIT 1`,
  );
  await conn.end();

  if (!rows[0]?.page_content) {
    throw new Error("Legacy home page not found in hau_cms");
  }

  const row = rows[0];
  const contentEn = prepareHtml(row.page_content);
  const excerptEn =
    "Chaudhary Charan Singh Haryana Agricultural University, popularly known as HAU, is one of Asia's biggest agricultural universities, located at Hisar in Haryana.";

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en")
    .eq("slug", "about")
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!existing?.id) throw new Error("ccshau_pages row with slug=about not found");

  const { error } = await supabase
    .from("ccshau_pages")
    .update({
      title_en: "About Us",
      content_en: contentEn,
      excerpt_en: excerptEn,
      featured_image_path: ABOUT_IMAGE_STORED,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) throw new Error(error.message);

  console.log("✓ Updated about page from legacy home");
  console.log(`  previous content length: ${String(existing.content_en ?? "").length}`);
  console.log(`  new content length: ${contentEn.length}`);
  console.log(`  featured image: ${ABOUT_IMAGE_STORED}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
