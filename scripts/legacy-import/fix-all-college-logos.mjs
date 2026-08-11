/**
 * Ensure all college / directorate pages have a working Azure-hosted logo.
 * Sources: local legacy dump + hau_college.college_logo; skip already-good blob paths.
 *
 * Usage:
 *   node fix-all-college-logos.mjs           # dry-run
 *   node fix-all-college-logos.mjs --confirm # upload + update
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

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
loadEnv(join(ROOT, ".env.local"));

const UPLOADS_ROOT =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";
const LOGO_ROOT = join(UPLOADS_ROOT, "images", "college", "logo");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const SLUG_ALIASES = {
  "ic-college-of-home-science": "ic-college-of-community-science",
  "ic-college-community-science": "ic-college-of-community-science",
  "centre-food-science-technology": "centre-of-food-science-technology",
  "college-agricultural-engineering-technology":
    "college-of-agricultural-engineering-and-technology",
  "college-fisheries-science": "college-of-fisheries-science",
  "college-biotechnology": "college-of-biotechnology",
};

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  if (e === ".gif") return "image/gif";
  return "image/jpeg";
}

function isVariant(name) {
  return /_(large|medium|small|thumb)\./i.test(name);
}

function pickBestLocal(legacyId, preferredName) {
  const dir = join(LOGO_ROOT, String(legacyId));
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => !isVariant(f) && !f.endsWith("~bk280219"));
  if (!files.length) return null;
  if (preferredName) {
    const base = basename(String(preferredName).replace(/\\/g, "/"));
    const hit = files.find((f) => f === base || f.toLowerCase() === base.toLowerCase());
    if (hit) return join(dir, hit);
  }
  // Prefer jpg/png by newest-looking numeric prefix (desc)
  const sorted = files.slice().sort((a, b) => b.localeCompare(a));
  return join(dir, sorted[0]);
}

function isAzurePath(path) {
  return Boolean(path) && String(path).startsWith(`${CONTAINER}/`);
}

function isHotlink(path) {
  return /^https?:\/\//i.test(String(path || ""));
}

function extractHotlinkMeta(url) {
  // https://hau.ac.in/public/images/college/logo/{id}/{file}
  const m = String(url).match(/\/college\/logo\/(\d+)\/([^/?#]+)/i);
  if (!m) return null;
  return { legacyId: m[1], fileName: decodeURIComponent(m[2]) };
}

function blobPublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  const slash = stored.indexOf("/");
  if (slash < 0) return null;
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function urlOk(url) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "HEAD" });
    if (r.ok) return true;
    // some servers reject HEAD
    const r2 = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    return r2.ok || r2.status === 206;
  } catch {
    return false;
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: pages, error: pagesErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, page_type, layout_template, logo_image_path, status")
  .eq("page_type", "college")
  .eq("status", "published")
  .order("title_en");
if (pagesErr) throw new Error(pagesErr.message);

const pagesBySlug = new Map(pages.map((p) => [p.slug, p]));

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [legacyRows] = await conn.query(
  `SELECT college_id, college_name, college_slug, type, college_logo, college_status
   FROM hau_college
   WHERE college_status = '1'
   ORDER BY type, college_id`,
);
await conn.end();

const report = {
  mode: CONFIRM ? "apply" : "dry-run",
  totalPages: pages.length,
  legacyColleges: legacyRows.length,
  actions: [],
  skippedOk: [],
  missingLocal: [],
  unmatchedLegacy: [],
  noLogoSource: [],
};

/** Prefer matching live page for a legacy college. */
function resolvePage(legacy) {
  const rawSlug = legacy.college_slug || slugify(legacy.college_name);
  const candidates = [
    rawSlug,
    SLUG_ALIASES[rawSlug],
    slugify(legacy.college_name),
    SLUG_ALIASES[slugify(legacy.college_name)],
  ].filter(Boolean);
  for (const s of candidates) {
    if (pagesBySlug.has(s)) return pagesBySlug.get(s);
  }
  // fuzzy: page slug contains key tokens
  const tokens = slugify(legacy.college_name).split("-").filter((t) => t.length > 3);
  if (tokens.length >= 2) {
    for (const p of pages) {
      const hit = tokens.filter((t) => p.slug.includes(t)).length;
      if (hit >= Math.min(3, tokens.length)) return p;
    }
  }
  return null;
}

const touchedPageIds = new Set();

for (const legacy of legacyRows) {
  const page = resolvePage(legacy);
  if (!page) {
    report.unmatchedLegacy.push({
      id: legacy.college_id,
      name: legacy.college_name,
      slug: legacy.college_slug,
      type: legacy.type,
    });
    continue;
  }
  touchedPageIds.add(page.id);

  const current = page.logo_image_path;
  let needsFix = true;
  let reason = "unknown";

  if (isAzurePath(current)) {
    const ok = await urlOk(blobPublicUrl(current));
    if (ok) {
      report.skippedOk.push({ slug: page.slug, logo: current });
      needsFix = false;
    } else {
      reason = "azure-broken";
    }
  } else if (isHotlink(current)) {
    reason = "hotlink";
    needsFix = true;
  } else if (!current || current === "pending" || String(current).startsWith("legacy-pending/")) {
    reason = current ? "pending" : "null";
    needsFix = true;
  } else {
    // other relative path — check
    const ok = await urlOk(blobPublicUrl(current.includes("/") ? current : `${CONTAINER}/${current}`));
    if (ok) {
      report.skippedOk.push({ slug: page.slug, logo: current });
      needsFix = false;
    } else {
      reason = "other-broken";
    }
  }

  if (!needsFix) continue;

  const preferred =
    legacy.college_logo ||
    (isHotlink(current) ? extractHotlinkMeta(current)?.fileName : null);
  const local = pickBestLocal(legacy.college_id, preferred);
  if (!local) {
    report.missingLocal.push({
      slug: page.slug,
      legacyId: legacy.college_id,
      preferred,
      reason,
      current,
    });
    continue;
  }

  const fileName = basename(local);
  const blobPath = `pages/logo/${page.id}/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const action = {
    slug: page.slug,
    title: page.title_en,
    legacyId: legacy.college_id,
    reason,
    from: current,
    local,
    stored,
  };
  report.actions.push(action);

  if (CONFIRM) {
    const container = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    ).getContainerClient(CONTAINER);
    const buf = await readFile(local);
    await container.getBlockBlobClient(blobPath).uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    });
    const { error } = await sb
      .from("ccshau_pages")
      .update({ logo_image_path: stored })
      .eq("id", page.id);
    if (error) throw new Error(`${page.slug}: ${error.message}`);
    // keep in-memory page updated for duplicate alias pages
    page.logo_image_path = stored;
  }
}

// Also fix published college pages that weren't matched but have hotlinks / broken pending
for (const page of pages) {
  if (touchedPageIds.has(page.id)) continue;
  const current = page.logo_image_path;
  if (isAzurePath(current)) {
    const ok = await urlOk(blobPublicUrl(current));
    if (ok) {
      report.skippedOk.push({ slug: page.slug, logo: current, note: "unmatched-ok" });
      continue;
    }
  }
  if (isHotlink(current)) {
    const meta = extractHotlinkMeta(current);
    const local = meta ? pickBestLocal(meta.legacyId, meta.fileName) : null;
    if (!local) {
      report.missingLocal.push({
        slug: page.slug,
        reason: "unmatched-hotlink",
        current,
      });
      continue;
    }
    const fileName = basename(local);
    const blobPath = `pages/logo/${page.id}/${fileName}`;
    const stored = `${CONTAINER}/${blobPath}`;
    report.actions.push({
      slug: page.slug,
      title: page.title_en,
      reason: "unmatched-hotlink",
      from: current,
      local,
      stored,
    });
    if (CONFIRM) {
      const container = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
      ).getContainerClient(CONTAINER);
      const buf = await readFile(local);
      await container.getBlockBlobClient(blobPath).uploadData(buf, {
        blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
      });
      const { error } = await sb
        .from("ccshau_pages")
        .update({ logo_image_path: stored })
        .eq("id", page.id);
      if (error) throw new Error(`${page.slug}: ${error.message}`);
    }
    continue;
  }
  if (!current || String(current).startsWith("legacy-pending/")) {
    report.noLogoSource.push({
      slug: page.slug,
      title: page.title_en,
      logo: current,
    });
  }
}

mkdirSync(join(__dirname, "reports"), { recursive: true });
const out = join(__dirname, "reports", "fix-all-college-logos-latest.json");
writeFileSync(out, JSON.stringify(report, null, 2));

console.log(
  JSON.stringify(
    {
      mode: report.mode,
      actions: report.actions.length,
      skippedOk: report.skippedOk.length,
      missingLocal: report.missingLocal.length,
      unmatchedLegacy: report.unmatchedLegacy.length,
      noLogoSource: report.noLogoSource.length,
      report: out,
    },
    null,
    2,
  ),
);
if (report.actions.length) {
  console.log("\nWill fix:");
  for (const a of report.actions) {
    console.log(` - ${a.slug} (${a.reason}) ← ${basename(a.local)}`);
  }
}
if (report.missingLocal.length) {
  console.log("\nMissing local:");
  for (const m of report.missingLocal) console.log(` - ${m.slug}`, m);
}
if (report.noLogoSource.length) {
  console.log("\nNo logo source:");
  for (const m of report.noLogoSource) console.log(` - ${m.slug}`);
}
