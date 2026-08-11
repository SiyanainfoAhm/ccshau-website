/**
 * Patch remaining college logos that the main script couldn't map:
 * - college-basic-sciences-humanities (slider image)
 * - college-of-biotechnology (try download / any local)
 * - sync college-of-basic-sciences-humanities if present
 *
 * Usage: node fix-remaining-college-logos.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

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

const UPLOADS =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  if (e === ".gif") return "image/gif";
  return "image/jpeg";
}

async function downloadToCache(url, dest) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 500) return null;
    await writeFile(dest, buf);
    return dest;
  } catch {
    return null;
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const targets = [
  {
    slug: "college-basic-sciences-humanities",
    local: join(UPLOADS, "images", "sliders", "91", "1672140573.png"),
  },
  {
    // Prefer proper college logo if this slug exists
    slug: "college-of-basic-sciences-humanities",
    local: join(UPLOADS, "images", "college", "logo", "10", "1540803999.jpg"),
  },
  {
    slug: "college-of-biotechnology",
    localCandidates: [
      join(UPLOADS, "images", "college", "logo", "67", "1782193277.jpg"),
      join(__dirname, "reports", "cache", "1782193277.jpg"),
    ],
    downloadUrls: [
      "https://hau.ac.in/public/images/college/logo/67/1782193277.jpg",
      "https://www.hau.ac.in/public/images/college/logo/67/1782193277.jpg",
    ],
  },
];

const cacheDir = join(__dirname, "reports", "cache");
mkdirSync(cacheDir, { recursive: true });

const container = CONFIRM
  ? BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    ).getContainerClient(CONTAINER)
  : null;

const results = [];

for (const t of targets) {
  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id, slug, title_en, logo_image_path")
    .eq("slug", t.slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) {
    results.push({ slug: t.slug, status: "page-missing" });
    continue;
  }

  let local = t.local || null;
  if (!local && t.localCandidates) {
    local = t.localCandidates.find((p) => existsSync(p)) || null;
  }
  if (!local && t.downloadUrls) {
    const dest = join(cacheDir, basename(t.downloadUrls[0]));
    for (const u of t.downloadUrls) {
      local = await downloadToCache(u, dest);
      if (local) break;
    }
  }
  // Fallback: use college 10 logo for basic sciences duplicate
  if (!local && t.slug.includes("basic-sciences")) {
    const fallback = join(UPLOADS, "images", "college", "logo", "10", "1540803999.jpg");
    if (existsSync(fallback)) local = fallback;
  }

  if (!local || !existsSync(local)) {
    results.push({
      slug: t.slug,
      status: "no-local",
      current: page.logo_image_path,
    });
    continue;
  }

  const fileName = basename(local);
  const blobPath = `pages/logo/${page.id}/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const entry = {
    slug: t.slug,
    status: CONFIRM ? "updated" : "dry-run",
    from: page.logo_image_path,
    local,
    stored,
  };

  if (CONFIRM) {
    const buf = await readFile(local);
    await container.getBlockBlobClient(blobPath).uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    });
    const { error: upErr } = await sb
      .from("ccshau_pages")
      .update({ logo_image_path: stored })
      .eq("id", page.id);
    if (upErr) throw new Error(upErr.message);
  }
  results.push(entry);
}

writeFileSync(
  join(__dirname, "reports", "fix-remaining-college-logos-latest.json"),
  JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", results }, null, 2),
);
console.log(JSON.stringify(results, null, 2));
