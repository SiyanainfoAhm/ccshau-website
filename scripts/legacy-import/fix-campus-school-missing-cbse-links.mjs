/**
 * Add missing Campus School Quick Links:
 *   CBSE Shiksha Shapath 2024
 *   CBSE SAFAL Online Examination 2024
 * (page-data only resolves with college_id=0; PDF-only pages)
 *
 * Usage: node fix-campus-school-missing-cbse-links.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE_DIR = join(__dirname, "reports", "hau-pages-pdf-cache");
const COLLEGE_ID = "a28d4da5-1229-4bb1-9c82-f5646335a488";
const CONFIRM = process.argv.includes("--confirm");

const ITEMS = [
  {
    legacySlug: "cbse-shiksha-shapath-2024-1",
    label_en: "CBSE Shiksha Shapath 2024",
    label_hi: "सीबीएसई शिक्षा शपथ 2024",
  },
  {
    legacySlug: "cbse-safal-online-examination-2024",
    label_en: "CBSE SAFAL Online Examination 2024",
    label_hi: "सीबीएसई सफाल परीक्षा 2024",
  },
];

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

async function fetchPageData(slug) {
  // These pages only resolve with college_id 0 on live API
  for (const collegeId of [0, 52]) {
    const res = await fetch(`https://hau.ac.in/page-data/${slug}/${collegeId}`);
    const text = await res.text();
    if (!text || text === "null" || text.startsWith("<")) continue;
    return JSON.parse(text);
  }
  return null;
}

async function ensureAzurePdf(containerClient, fileName) {
  const blobPath = `pages-pdf/${fileName}`;
  const azureUrl = `https://ccshau.blob.core.windows.net/ccshaucontainer/${blobPath}`;
  const blob = containerClient.getBlockBlobClient(blobPath);
  const exists = await blob.exists();
  if (exists) return azureUrl;

  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const legacyUrl = `https://hau.ac.in/public/pages-pdf/${fileName}`;
    const r = await fetch(legacyUrl);
    if (!r.ok) throw new Error(`PDF download failed ${fileName}: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 100) throw new Error(`PDF too small ${fileName}`);
    await writeFile(cachePath, buf);
  }

  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
  });
  return azureUrl;
}

function pdfViewerHtml(url, title) {
  return `<iframe src="${url}" title="${title}" width="100%" height="720" loading="lazy"></iframe>`;
}

async function main() {
  if (!CONFIRM) {
    console.error("Usage: node fix-campus-school-missing-cbse-links.mjs --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key || !conn) throw new Error("Missing env");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const containerName =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";
  const containerClient = BlobServiceClient.fromConnectionString(conn).getContainerClient(
    containerName,
  );

  // Load current sidebars to renumber cleanly
  const { data: existing, error: listErr } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,sort_order,is_active")
    .eq("page_id", COLLEGE_ID)
    .eq("side", "right")
    .order("sort_order");
  if (listErr) throw new Error(listErr.message);

  const report = { added: [], updated: [] };

  // Desired order matching legacy Quick Link list (subset around the missing ones)
  const desiredOrder = [
    "Faculty",
    "Home",
    "List of Head /Mistresses /Principals /Directors",
    "Mother's Day (2025) Celebrations",
    "List of Controlling officers",
    "CBSE Mandatory Disclosure",
    "Campus Achievers",
    "Pariksha pe Charcha",
    "NCC Students Services",
    "Media Gallery",
    "CBSE Shiksha Shapath 2024",
    "CBSE SAFAL Online Examination 2024",
    "CBSE Results 2023-24",
    "Har Ghar tiranga",
    "Capacity Building Program-2023",
    "Activities-2024",
    "Eye and Dental Check up Camp",
    "Society Welfare Society Seminar",
    "CALL US: 01662-255241,255462",
  ];

  for (const item of ITEMS) {
    const page = await fetchPageData(item.legacySlug);
    if (!page?.file) throw new Error(`No PDF for ${item.legacySlug}`);
    const azureUrl = await ensureAzurePdf(containerClient, page.file);
    const content_en = pdfViewerHtml(azureUrl, item.label_en);

    const { data: row, error: findErr } = await sb
      .from("ccshau_page_sidebar_items")
      .select("id")
      .eq("page_id", COLLEGE_ID)
      .eq("side", "right")
      .eq("label_en", item.label_en)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);

    const payload = {
      page_id: COLLEGE_ID,
      side: "right",
      label_en: item.label_en,
      label_hi: item.label_hi,
      href: null,
      linked_page_id: null,
      content_en,
      content_hi: null,
      sort_order: 99,
      is_active: true,
    };

    if (row?.id) {
      const { error } = await sb
        .from("ccshau_page_sidebar_items")
        .update(payload)
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      report.updated.push({ label: item.label_en, file: page.file, azureUrl });
    } else {
      const { error } = await sb.from("ccshau_page_sidebar_items").insert(payload);
      if (error) throw new Error(error.message);
      report.added.push({ label: item.label_en, file: page.file, azureUrl });
    }
    console.log("ok", item.label_en, "->", azureUrl);
  }

  // Renumber all active right sidebars to integer sort_order by desiredOrder
  const { data: all, error: allErr } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,sort_order,is_active")
    .eq("page_id", COLLEGE_ID)
    .eq("side", "right");
  if (allErr) throw new Error(allErr.message);

  const byLabel = new Map((all || []).map((r) => [r.label_en, r]));
  let order = 1;
  for (const label of desiredOrder) {
    const row = byLabel.get(label);
    if (!row) continue;
    const { error } = await sb
      .from("ccshau_page_sidebar_items")
      .update({ sort_order: order, is_active: true })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    order += 1;
    byLabel.delete(label);
  }
  // Keep any leftover active items after
  for (const row of byLabel.values()) {
    if (!row.is_active) continue;
    const { error } = await sb
      .from("ccshau_page_sidebar_items")
      .update({ sort_order: order })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    order += 1;
  }

  // Also update apply-campus-school QUICK_LINK_DEFS is done separately

  mkdirSync(join(__dirname, "reports"), { recursive: true });
  const out = join(__dirname, "reports", "fix-campus-school-missing-cbse-links.json");
  writeFileSync(out, JSON.stringify({ ...report, existingBefore: existing?.length }, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("Report:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
