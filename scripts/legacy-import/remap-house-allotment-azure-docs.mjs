/**
 * Check whether House Allotment seniority docs already exist in Azure
 * under legacy-storage or similar, and rewrite sidebar links if found.
 *
 * Usage: node remap-house-allotment-azure-docs.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";

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
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

const PREFIXES = [
  "legacy-storage/",
  "pages/eo-cum-se/house-allotment/",
  "storage/app/uploads/",
  "uploads/",
];

async function findBlob(container, fileName) {
  for (const prefix of PREFIXES) {
    const path = `${prefix}${fileName}`;
    const blob = container.getBlockBlobClient(path);
    if (await blob.exists()) {
      return `https://ccshau.blob.core.windows.net/${CONTAINER}/${path}`;
    }
  }
  // list search by name ending (slow but ok for one page)
  for await (const item of container.listBlobsFlat({ prefix: "legacy-storage/" })) {
    if (item.name.endsWith(`/${fileName}`) || item.name === fileName) {
      return `https://ccshau.blob.core.windows.net/${CONTAINER}/${item.name}`;
    }
  }
  return null;
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const container = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING.trim(),
  ).getContainerClient(CONTAINER);

  const { data: page } = await sb
    .from("ccshau_pages")
    .select("id")
    .eq("slug", "ecs-house-allotment")
    .maybeSingle();
  const { data: sidebars } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,content_en")
    .eq("page_id", page.id)
    .ilike("label_en", "%seniorty%")
    .maybeSingle();

  // maybeSingle fails if multiple - use filter
  const { data: items } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,content_en")
    .eq("page_id", page.id)
    .eq("is_active", true);

  const seniority = (items || []).find((i) => /seniorty|seniority/i.test(i.label_en));
  if (!seniority) throw new Error("seniority sidebar missing");

  const urls = [
    ...String(seniority.content_en || "").matchAll(
      /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^"'\\\s>]+)/gi,
    ),
  ].map((m) => ({ full: m[0], file: m[1] }));

  console.log("files", urls.length, "mode", CONFIRM ? "apply" : "dry-run");
  const map = {};
  for (const u of urls) {
    const found = await findBlob(container, u.file);
    console.log(u.file, found ? "FOUND" : "MISSING", found || "");
    if (found) map[u.full] = found;
  }

  if (!CONFIRM) return;
  let html = seniority.content_en || "";
  for (const [from, to] of Object.entries(map)) html = html.split(from).join(to);
  const { error } = await sb
    .from("ccshau_page_sidebar_items")
    .update({ content_en: html, updated_at: new Date().toISOString() })
    .eq("id", seniority.id);
  if (error) throw new Error(error.message);
  console.log("rewrote", Object.keys(map).length, "links");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
