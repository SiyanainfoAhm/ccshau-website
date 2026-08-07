/**
 * Count legacy-pending paths in Supabase (Phase 4 inventory).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function countLike(table, column, pattern) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .like(column, pattern);
  if (error) return { error: error.message };
  return { count };
}

async function sampleNewsAttachments() {
  const { data, error } = await supabase
    .from("ccshau_news")
    .select("id, slug, attachment_paths")
    .not("attachment_paths", "is", null)
    .limit(20);
  if (error) return { error: error.message };
  let pending = 0;
  let total = 0;
  const samples = [];
  for (const row of data ?? []) {
    const arr = Array.isArray(row.attachment_paths) ? row.attachment_paths : [];
    for (const a of arr) {
      total += 1;
      if (String(a?.path || "").startsWith("legacy-pending/")) {
        pending += 1;
        if (samples.length < 5) samples.push(a.path);
      }
    }
  }
  return { scannedRows: data?.length ?? 0, attachmentRefs: total, pendingInSample: pending, samples };
}

const checks = [
  ["ccshau_banners", "image_path", "legacy-pending/%"],
  ["ccshau_downloads", "file_path", "legacy-pending/%"],
  ["ccshau_circulars", "file_path", "legacy-pending/%"],
  ["ccshau_homepage_initiatives", "image_path", "legacy-pending/%"],
  ["ccshau_homepage_dignitaries", "image_path", "legacy-pending/%"],
  ["ccshau_pages", "featured_image_path", "legacy-pending/%"],
  ["ccshau_pages", "logo_image_path", "legacy-pending/%"],
  ["ccshau_pages", "head_image_path", "legacy-pending/%"],
  ["ccshau_media_albums", "cover_image_path", "legacy-pending/%"],
  ["ccshau_media_items", "storage_path", "legacy-pending/%"],
  ["ccshau_page_staff", "image_path", "legacy-pending/%"],
];

const out = {};
for (const [table, col, pat] of checks) {
  out[`${table}.${col}`] = await countLike(table, col, pat);
}

// tenders document_paths jsonb
{
  const { data, error } = await supabase
    .from("ccshau_tenders")
    .select("id, document_paths")
    .not("document_paths", "is", null)
    .limit(50);
  let pending = 0;
  const samples = [];
  for (const row of data ?? []) {
    for (const a of row.document_paths ?? []) {
      if (String(a?.path || "").startsWith("legacy-pending/")) {
        pending += 1;
        if (samples.length < 5) samples.push(a.path);
      }
    }
  }
  out["ccshau_tenders.document_paths(sample50)"] = {
    error: error?.message,
    pendingInSample: pending,
    samples,
  };
}

out.newsAttachmentsSample = await sampleNewsAttachments();

// college pages logo/featured from phase2 use pages table
console.log(JSON.stringify(out, null, 2));
