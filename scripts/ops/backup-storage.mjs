#!/usr/bin/env node
/**
 * Inventory (and optionally download) Supabase Storage buckets for off-site backup.
 *
 * Env (or apps/web/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/ops/backup-storage.mjs
 *   node scripts/ops/backup-storage.mjs --download
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
function loadSupabaseJs() {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("@supabase/supabase-js");
    } catch {
      /* try next */
    }
  }
  throw new Error("Install @supabase/supabase-js (apps/web) before running this script.");
}
const { createClient } = loadSupabaseJs();
const BUCKETS = ["ccshau-public", "ccshau-private", "ccshau-media"];
const DOWNLOAD = process.argv.includes("--download");

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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function listAll(supabase, bucket) {
  const objects = [];
  const queue = [""];

  while (queue.length) {
    const prefix = queue.shift();
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
      if (!data?.length) break;

      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        // Folders have null id in Storage list API
        if (item.id === null) {
          queue.push(path);
        } else {
          objects.push({
            bucket,
            path,
            size: item.metadata?.size ?? null,
            updated_at: item.updated_at ?? item.created_at ?? null,
            mimetype: item.metadata?.mimetype ?? null,
          });
        }
      }

      if (data.length < 100) break;
      offset += data.length;
    }
  }

  return objects;
}

async function downloadObject(supabase, bucket, path, destFile) {
  mkdirSync(dirname(destFile), { recursive: true });
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`download ${bucket}/${path}: ${error.message}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  writeFileSync(destFile, buffer);
}

async function main() {
  if (!URL || !KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = join(ROOT, "backups", "storage", stamp);
  mkdirSync(outDir, { recursive: true });

  const all = [];
  for (const bucket of BUCKETS) {
    console.log(`Listing ${bucket}...`);
    try {
      const objs = await listAll(supabase, bucket);
      console.log(`  ${objs.length} objects`);
      all.push(...objs);
    } catch (err) {
      console.warn(`  skipped (${err instanceof Error ? err.message : err})`);
    }
  }

  const inventoryPath = join(outDir, "inventory.json");
  writeFileSync(
    inventoryPath,
    JSON.stringify(
      {
        project_url: URL,
        generated_at: new Date().toISOString(),
        buckets: BUCKETS,
        object_count: all.length,
        objects: all,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${inventoryPath}`);

  if (!DOWNLOAD) {
    console.log("Inventory only. Pass --download to copy files into backups/storage/<date>/files/");
    return;
  }

  const filesRoot = join(outDir, "files");
  let ok = 0;
  let fail = 0;
  for (const obj of all) {
    const dest = join(filesRoot, obj.bucket, obj.path);
    try {
      await downloadObject(supabase, obj.bucket, obj.path, dest);
      ok += 1;
      if (ok % 25 === 0) console.log(`  downloaded ${ok}/${all.length}`);
    } catch (err) {
      fail += 1;
      console.warn(`  fail ${obj.bucket}/${obj.path}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Download complete: ${ok} ok, ${fail} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
