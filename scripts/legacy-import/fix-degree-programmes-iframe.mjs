/**
 * Point college-wise-degree-programmes at a same-origin PDF URL so the
 * browser can embed it in an iframe (Azure cross-origin PDFs often render blank).
 *
 * Usage: node fix-degree-programmes-iframe.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const PAGE_SLUG = "college-wise-degree-programmes";
const LOCAL_PDF = "/documents/college-wise-degree-programmes.pdf";
const AZURE_PDF =
  "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/1697605726.pdf";
const SOURCE_PDF = join(ROOT, "apps/web/public/1697605726.pdf");
const TARGET_PDF = join(
  ROOT,
  "apps/web/public/documents/college-wise-degree-programmes.pdf",
);

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

function pdfViewerHtml(src, title) {
  // Keep HTML PDF-primary so PublicPdfViewer replaces it with the dedicated embed.
  return `<iframe src="${src}" title="${title}" width="100%" height="720" loading="lazy"></iframe>`;
}

async function main() {
  console.log({
    mode: CONFIRM ? "apply" : "dry-run",
    embedSrc: LOCAL_PDF,
    azure: AZURE_PDF,
  });

  if (CONFIRM) {
    mkdirSync(dirname(TARGET_PDF), { recursive: true });
    if (existsSync(SOURCE_PDF) && !existsSync(TARGET_PDF)) {
      copyFileSync(SOURCE_PDF, TARGET_PDF);
      console.log("copied local pdf ->", TARGET_PDF);
    } else if (existsSync(TARGET_PDF)) {
      console.log("local pdf already present");
    } else if (!existsSync(SOURCE_PDF)) {
      console.warn("warning: no local PDF found; rely on Next rewrite to Azure");
    }
  }

  const contentEn = pdfViewerHtml(LOCAL_PDF, "College wise degree programmes");
  const contentHi = pdfViewerHtml(LOCAL_PDF, "महाविद्यालयवार डिग्री कार्यक्रम");
  console.log(contentEn);

  if (!CONFIRM) {
    console.log("Pass --confirm to update DB and copy PDF");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id")
    .eq("slug", PAGE_SLUG)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error(`${PAGE_SLUG} missing`);

  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      content_en: contentEn,
      content_hi: contentHi,
      excerpt_en: "College-wise degree programmes at CCS HAU.",
      excerpt_hi: "सीसीएस एचएयू में महाविद्यालयवार डिग्री कार्यक्रम।",
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (upErr) throw new Error(upErr.message);

  console.log("done", { pageId: page.id, src: LOCAL_PDF });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
