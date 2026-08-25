/**
 * Sync College wise degree programmes from legacy:
 * https://hau.ac.in/page/degree-programmes
 * Legacy CMS: hau_cms id=1508, content_type=2, file=1697605726.pdf
 * Local: /college/college-wise-degree-programmes
 *
 * Usage: node sync-degree-programmes.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE = join(__dirname, "reports/hau-pages-pdf-cache");
const CONFIRM = process.argv.includes("--confirm");
const PAGE_SLUG = "college-wise-degree-programmes";
const PDF_FILE = "1697605726.pdf";
const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";
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

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

const EMBED_PDF_PATH = "/documents/college-wise-degree-programmes.pdf";

function pdfViewerHtml(title) {
  // Same-origin path (public file or Next rewrite → Azure). Cross-origin Azure
  // iframes often render blank in Chrome; PublicPdfViewer picks this up.
  return `<iframe src="${EMBED_PDF_PATH}" title="${title}" width="100%" height="720" loading="lazy"></iframe>`;
}

async function ensurePdf(containerClient) {
  const blobPath = `pages-pdf/${PDF_FILE}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) {
    return { stored, publicUrl, reused: true };
  }

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, PDF_FILE);
  const localCandidates = [
    cachePath,
    join(ROOT, "apps/web/public", PDF_FILE),
    join(ROOT, "apps/web/src/app/(site)", PDF_FILE),
    join("C:/Jatin/Projects/CCHAU_mysql/public/pages-pdf", PDF_FILE),
  ];

  let buf = null;
  let from = null;
  for (const p of localCandidates) {
    if (existsSync(p)) {
      buf = await readFile(p);
      from = p;
      break;
    }
  }

  if (!buf) {
    const r = await fetch(`${LEGACY_PDF_BASE}${PDF_FILE}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
        Referer: "https://hau.ac.in/page/degree-programmes",
      },
    });
    if (!r.ok) throw new Error(`fetch PDF ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    from = `${LEGACY_PDF_BASE}${PDF_FILE}`;
  }

  if (buf.length < 1000) throw new Error(`PDF too small (${buf.length})`);
  if (!existsSync(cachePath)) await writeFile(cachePath, buf);

  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
    overwrite: true,
  });

  return { stored, publicUrl, reused: false, from, bytes: buf.length };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  console.log({ mode: CONFIRM ? "apply" : "dry-run", page: PAGE_SLUG, pdf: PDF_FILE });

  let pdfUrl = azurePublicUrl(`${CONTAINER}/pages-pdf/${PDF_FILE}`);

  if (CONFIRM) {
    const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
      CONTAINER,
    );
    const uploaded = await ensurePdf(container);
    pdfUrl = uploaded.publicUrl;
    console.log(uploaded);
  } else {
    console.log({ plannedAzureUrl: pdfUrl });
  }

  const contentEn = pdfViewerHtml("College wise degree programmes");
  const contentHi = pdfViewerHtml("महाविद्यालयवार डिग्री कार्यक्रम");

  if (!CONFIRM) {
    console.log({ plannedAzureUrl: pdfUrl, embedSrc: EMBED_PDF_PATH });
    console.log(contentEn);
    console.log("Pass --confirm to upload PDF and update DB");
    return;
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id, layout_config")
    .eq("slug", PAGE_SLUG)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error(`${PAGE_SLUG} missing`);

  const layout_config = {
    ...(page.layout_config && typeof page.layout_config === "object"
      ? page.layout_config
      : {}),
    hero: true,
    headOfficer: false,
    contacts: false,
    staff: false,
    gallery: false,
    mainContent: true,
    leftSidebar: false,
    rightSidebar: false,
    collegeTopMenu: false,
    farmersCta: false,
    heroContactButton: false,
  };

  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      content_en: contentEn,
      content_hi: contentHi,
      excerpt_en: "College-wise degree programmes at CCS HAU.",
      excerpt_hi: "सीसीएस एचएयू में महाविद्यालयवार डिग्री कार्यक्रम।",
      meta_title: "College wise degree programmes | CCS HAU",
      meta_description:
        "College-wise degree programmes offered at Chaudhary Charan Singh Haryana Agricultural University, Hisar.",
      layout_config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (upErr) throw new Error(upErr.message);

  // Hide Phase-3 stub duplicate so only the Academics menu page is live.
  const { error: draftErr } = await sb
    .from("ccshau_pages")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("slug", "degree-programmes");
  if (draftErr) throw new Error(draftErr.message);

  for (const legacy_path of [
    "/page/degree-programmes",
    "/pages/degree-programmes",
  ]) {
    const { data: existingRedirect, error: findRedirectErr } = await sb
      .from("ccshau_url_redirects")
      .select("id")
      .eq("legacy_path", legacy_path)
      .maybeSingle();
    if (findRedirectErr) throw new Error(findRedirectErr.message);
    const redirectRow = {
      legacy_path,
      new_path: `/college/${PAGE_SLUG}`,
      redirect_type: 301,
      is_active: true,
      notes: "Legacy Degree Programmes → college-wise-degree-programmes",
      updated_at: new Date().toISOString(),
    };
    if (existingRedirect?.id) {
      const { error } = await sb
        .from("ccshau_url_redirects")
        .update(redirectRow)
        .eq("id", existingRedirect.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("ccshau_url_redirects").insert(redirectRow);
      if (error) throw new Error(error.message);
    }
  }

  console.log("done", { pageId: page.id, pdfUrl });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
