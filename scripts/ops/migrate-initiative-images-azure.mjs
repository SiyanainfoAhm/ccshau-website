#!/usr/bin/env node
/**
 * Migrate ccshau_homepage_initiatives.image_path from hau.ac.in → Azure.
 *
 *   node scripts/ops/migrate-initiative-images-azure.mjs
 *   node scripts/ops/migrate-initiative-images-azure.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/initiative-image-cache");
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
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

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    }[e] || "application/octet-stream"
  );
}

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function isHauUrl(path) {
  return /^https?:\/\/(?:www\.)?hau\.ac\.in\//i.test(path ?? "");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: rows, error } = await supabase
    .from("ccshau_homepage_initiatives")
    .select("id, title_en, image_path, sort_order")
    .like("image_path", "%https://hau.ac.in/%")
    .order("sort_order");
  if (error) throw error;

  // Also catch http:// and any hau.ac.in without requiring https in LIKE
  const { data: allRows, error: allErr } = await supabase
    .from("ccshau_homepage_initiatives")
    .select("id, title_en, image_path, sort_order")
    .order("sort_order");
  if (allErr) throw allErr;

  const targets = (allRows ?? []).filter((r) => isHauUrl(r.image_path));
  console.log(`initiatives total=${allRows?.length ?? 0}, HAU urls=${targets.length}`);
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  for (const r of targets) console.log(`  ${r.sort_order ?? "-"} ${r.title_en}: ${r.image_path}`);

  if (!targets.length) return;
  if (!APPLY) {
    console.log("Pass --apply to upload + update.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  mkdirSync(CACHE, { recursive: true });

  let updated = 0;
  let failed = 0;

  for (const row of targets) {
    try {
      const sourceUrl = row.image_path.trim();
      const fileName = basename(new URL(sourceUrl).pathname);
      const blobPath = `homepage/initiatives/${row.id}/${fileName}`;
      const stored = `${CONTAINER}/${blobPath}`;
      const publicUrl = azurePublicUrl(stored);
      const blob = container.getBlockBlobClient(blobPath);

      if (!(await blob.exists())) {
        const cachePath = join(CACHE, `${row.id}-${fileName.replace(/[\\/]/g, "_")}`);
        let buf;
        if (existsSync(cachePath)) {
          buf = readFileSync(cachePath);
        } else {
          const r = await fetch(sourceUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              Accept: "image/*,*/*",
              Referer: "https://hau.ac.in/",
            },
          });
          if (!r.ok) throw new Error(`fetch ${r.status}`);
          buf = Buffer.from(await r.arrayBuffer());
          if (buf.length < 200) throw new Error(`too small (${buf.length})`);
          await writeFile(cachePath, buf);
        }
        await blob.uploadData(buf, {
          blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
          overwrite: true,
        });
        console.log(`  uploaded ${row.title_en} (${buf.length}b) → ${publicUrl}`);
      } else {
        console.log(`  reused ${row.title_en} → ${publicUrl}`);
      }

      const { error: upErr } = await supabase
        .from("ccshau_homepage_initiatives")
        .update({ image_path: stored })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
      updated++;
      console.log(`  DB ${row.title_en} → ${stored}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${row.title_en}: ${e.message}`);
    }
  }

  const { data: remaining } = await supabase
    .from("ccshau_homepage_initiatives")
    .select("id, title_en, image_path");
  const left = (remaining ?? []).filter((r) => isHauUrl(r.image_path));
  console.log(`\nSummary: updated=${updated} failed=${failed} remaining HAU=${left.length}`);
  for (const r of left) console.log(`  leftover: ${r.title_en} ${r.image_path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
