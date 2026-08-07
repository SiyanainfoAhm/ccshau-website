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
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: staff } = await s
  .from("ccshau_page_staff")
  .select("id,image_path")
  .like("image_path", "legacy-pending/staff/%")
  .limit(8);
const { data: dl } = await s
  .from("ccshau_downloads")
  .select("id,file_path")
  .like("file_path", "legacy-pending/%")
  .limit(5);
const { data: pages } = await s
  .from("ccshau_pages")
  .select("id,slug,featured_image_path,logo_image_path,head_image_path")
  .or(
    "featured_image_path.like.legacy-pending/%,logo_image_path.like.legacy-pending/%,head_image_path.like.legacy-pending/%",
  )
  .limit(8);
const { data: init } = await s
  .from("ccshau_homepage_initiatives")
  .select("id,image_path")
  .like("image_path", "legacy-pending/%")
  .limit(6);

// count news/tenders pending by scanning in pages
async function countJsonPending(table, col) {
  let from = 0;
  let pending = 0;
  let rows = 0;
  for (;;) {
    const { data, error } = await s.from(table).select(`id,${col}`).range(from, from + 999);
    if (error) return { error: error.message };
    if (!data?.length) break;
    rows += data.length;
    for (const row of data) {
      for (const a of row[col] ?? []) {
        if (String(a?.path || "").startsWith("legacy-pending/")) pending += 1;
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return { rows, pending };
}

console.log(
  JSON.stringify(
    {
      staff,
      dl,
      pages,
      init,
      news: await countJsonPending("ccshau_news", "attachment_paths"),
      tenders: await countJsonPending("ccshau_tenders", "document_paths"),
    },
    null,
    2,
  ),
);
