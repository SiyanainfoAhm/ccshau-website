/**
 * Fix PG Studies hero banner to match legacy:
 * https://hau.ac.in/public/images/college/banner/25/1548308054.jpg
 * (POST-GRADUATE STUDIES BLOCK photo — not NAHEP banner/44)
 *
 * Usage: node fix-pg-studies-banner.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE = join(__dirname, "reports/pg-studies-cache");
const CONFIRM = process.argv.includes("--confirm");
const BANNER =
  "https://hau.ac.in/public/images/college/banner/25/1548308054.jpg";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const fileName = basename(new URL(BANNER).pathname);
  const blobPath = `pages/pg-studies/banner/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  const publicUrl = `https://${account}.blob.core.windows.net/${stored}`;

  console.log({ BANNER, stored, publicUrl, mode: CONFIRM ? "apply" : "dry-run" });

  if (!CONFIRM) {
    console.log("Pass --confirm to upload and update DB");
    return;
  }

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const r = await fetch(BANNER, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${BANNER}: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) throw new Error(`banner too small: ${buf.length}`);
    await writeFile(cachePath, buf);
  }
  console.log("bytes", buf.length);

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
    CONTAINER,
  );
  const blob = container.getBlockBlobClient(blobPath);
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "image/jpeg" },
    overwrite: true,
  });
  console.log("uploaded", publicUrl);

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("ccshau_pages")
    .update({
      featured_image_path: stored,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "pg-studies")
    .select("id, featured_image_path")
    .maybeSingle();
  if (error) throw new Error(error.message);
  console.log("db", data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
