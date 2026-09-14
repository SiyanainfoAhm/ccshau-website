#!/usr/bin/env node
/**
 * Remap footer/quick-link HAU.ac.in URLs to internal CMS routes.
 * Uploads Calendar / Telephone Directory / ICAR PDFs to Azure.
 * Creates missing ICAR Ranking page if needed.
 *
 *   node scripts/legacy-import/fix-hau-quicklinks-internal.mjs
 *   node scripts/legacy-import/fix-hau-quicklinks-internal.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const UPLOADS =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";
const STORAGE_UPLOADS =
  process.env.LEGACY_STORAGE_UPLOADS?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\uploads\\uploads";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const ACCOUNT =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() ||
  process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() ||
  "ccshau";
const AZURE_PUBLIC = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}`;

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient, StorageSharedKeyCredential } = requireFromWeb("@azure/storage-blob");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function getBlobService() {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (cs) return BlobServiceClient.fromConnectionString(cs);
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (accountName && accountKey) {
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(accountName, accountKey),
    );
  }
  throw new Error("Azure Storage credentials missing.");
}

function contentType(fileName) {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

const PDFS = [
  {
    key: "university-calendar-2026",
    local: join(UPLOADS, "notification-documents/130/1767779490.pdf"),
    blob: "notification-documents/130/1767779490.pdf",
  },
  {
    key: "telephone-directory",
    local: join(UPLOADS, "notification-documents/54/1724927492.pdf"),
    blob: "notification-documents/54/1724927492.pdf",
  },
  {
    key: "icar-ranking-2018",
    local: join(STORAGE_UPLOADS, "ooOjUAzZAvebuhU8rl3Vlah5spO9gpq4VCku4dCC.pdf"),
    blob: "legacy-storage/ooOjUAzZAvebuhU8rl3Vlah5spO9gpq4VCku4dCC.pdf",
  },
];

/** @type {{ id: string, label: string, href: string, pageId: string | null, openInNewTab: boolean }[]} */
const MENU_FIXES = [
  {
    id: "64e5bab1-47de-4803-8e92-7f234cd8d2f9",
    label: "Online Fee Submission",
    href: "/pages/onlinefee",
    pageId: "8013c863-2b77-4571-bc29-49b454fbaa26",
    openInNewTab: false,
  },
  {
    id: "5639efac-f7da-403a-be44-3717a42169ea",
    label: "हरियाणा खेती",
    href: "/pages/haryanakheti",
    pageId: "f1c8d46d-8a8f-4553-a186-58b3045b491b",
    openInNewTab: false,
  },
  {
    id: "132c1270-ad0c-4679-8b77-fb9f52aae8d0",
    label: "Land Scape Unit",
    href: "/pages/landscape-unit",
    pageId: "bd95c754-3bca-4f6f-b6d9-31786199ab47",
    openInNewTab: false,
  },
  {
    id: "3d0baa9e-ad27-4854-ba15-a0ac90ae36cf",
    label: "Public Relations Office",
    href: "/pages/pro",
    pageId: "60e38290-8ce7-41a3-8850-89ae6c873842",
    openInNewTab: false,
  },
  {
    id: "67238b59-cf3f-4dc7-9302-2bbe915ef042",
    label: "Technical Publication & Information Cell (TPIC)",
    href: "/college/publication-cell",
    pageId: "c0228b8b-5c86-428a-88ce-299ebd0881f7",
    openInNewTab: false,
  },
  {
    id: "ddc325e0-e359-40a7-bc15-1485df04733b",
    label: "Database",
    href: "/pages/database",
    pageId: "4d78194d-3865-46a8-b40c-24069e2fe0ed",
    openInNewTab: false,
  },
  {
    id: "8a7921eb-4e32-418b-84f4-9d74e29be2ff",
    label: "HAUTA",
    href: "/pages/h-a-u-t-a",
    pageId: "26e9fd23-0170-4084-9217-68b6e04e4900",
    openInNewTab: false,
  },
  {
    id: "cd1bdb30-5197-4c6f-a372-ac68d33b88a2",
    label: "Retiree Corner",
    href: "/pages/retiree-corner",
    pageId: "cbc0b57f-c2c6-40ed-80c1-ced8e6f3b354",
    openInNewTab: false,
  },
  {
    id: "07977d6f-bc83-4a4a-af67-5981fb9a169d",
    label: "ABIC",
    href: "/college/agribusiness-incubation-centre",
    pageId: "5b0d06ca-68be-460d-b9cf-83b952c8ca30",
    openInNewTab: false,
  },
  {
    id: "82242c72-ea32-44f9-a1cb-d4de2616894a",
    label: "Farm Machinery Testing Centre",
    href: "/pages/farm-machinery-testing-centre-1",
    pageId: "bda0dae4-264a-4307-a103-52b81ca6e02d",
    openInNewTab: false,
  },
  {
    id: "efc4ca57-7cf7-4f14-bf8b-760731c0a44f",
    label: "ICAR Ranking",
    href: "/pages/icar",
    pageId: null, // filled after ensureIcarPage
    openInNewTab: false,
  },
  {
    id: "bd41520d-6c25-4609-b661-b862248b8675",
    label: "University Calendar 2026",
    href: `${AZURE_PUBLIC}/notification-documents/130/1767779490.pdf`,
    pageId: null,
    openInNewTab: true,
  },
  {
    id: "2850012e-21d8-4ad7-aa5a-157e197e1ac3",
    label: "Telephone Directory",
    href: `${AZURE_PUBLIC}/notification-documents/54/1724927492.pdf`,
    pageId: null,
    openInNewTab: true,
  },
  {
    id: "7bf1256a-2c10-47df-baf4-b95673fafe49",
    label: "Online Admission 2026–27",
    href: "/news/online-admission-2026-27",
    pageId: null,
    openInNewTab: false,
  },
  {
    id: "0fce1b8c-6ffb-4834-8646-9e1a6a5e3921",
    label: "Online Admission",
    href: "/news/online-admission-2026-27",
    pageId: null,
    openInNewTab: false,
  },
  {
    id: "61369460-a150-4aef-ba3c-4123335ff2a2",
    label: "University Committees",
    href: "/pages/university-committees",
    pageId: "8dd170b9-fcb6-463c-b07e-77c3adfe85e4",
    openInNewTab: false,
  },
];

async function uploadPdfs() {
  const results = [];
  for (const pdf of PDFS) {
    const existsLocal = existsSync(pdf.local);
    results.push({
      key: pdf.key,
      blob: pdf.blob,
      url: `${AZURE_PUBLIC}/${pdf.blob}`,
      local: pdf.local,
      existsLocal,
      status: existsLocal ? "planned" : "missing-local",
    });
  }
  if (!APPLY) return results;

  const container = getBlobService().getContainerClient(CONTAINER);
  for (const row of results) {
    if (row.status === "missing-local") continue;
    const pdf = PDFS.find((p) => p.key === row.key);
    const blob = container.getBlockBlobClient(pdf.blob);
    if (await blob.exists()) {
      row.status = "exists";
      continue;
    }
    const buf = await readFile(pdf.local);
    await blob.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentType(pdf.blob) },
    });
    row.status = "uploaded";
    row.bytes = buf.length;
  }
  return results;
}

async function ensureIcarPage(icarPdfUrl) {
  const { data: existing } = await supabase
    .from("ccshau_pages")
    .select("id, slug, status")
    .eq("slug", "icar")
    .maybeSingle();

  const contentEn = `<p><a class="fr-file" href="${icarPdfUrl}" target="_blank" rel="noopener noreferrer"><span style="font-size:18px"><strong>ICAR RANKING - 2018</strong></span></a></p>`;
  const contentHi = `<p><a class="fr-file" href="${icarPdfUrl}" target="_blank" rel="noopener noreferrer"><span style="font-size:18px"><strong>आईसीएआर रैंकिंग - 2018</strong></span></a></p>`;

  if (existing) {
    if (!APPLY) return { id: existing.id, status: "exists", action: "would-update-content" };
    const { error } = await supabase
      .from("ccshau_pages")
      .update({
        title_en: "ICAR Ranking",
        title_hi: "आईसीएआर रैंकिंग",
        content_en: contentEn,
        content_hi: contentHi,
        excerpt_en: "ICAR Ranking for CCS HAU.",
        excerpt_hi: "सीसीएस एचएयू के लिए आईसीएआर रैंकिंग।",
        status: "published",
        published_at: existing.status === "published" ? undefined : new Date().toISOString(),
        page_type: "standard",
        layout_template: "standard",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id, status: "updated" };
  }

  if (!APPLY) return { id: null, status: "missing", action: "would-create" };

  const { data, error } = await supabase
    .from("ccshau_pages")
    .insert({
      slug: "icar",
      title_en: "ICAR Ranking",
      title_hi: "आईसीएआर रैंकिंग",
      content_en: contentEn,
      content_hi: contentHi,
      excerpt_en: "ICAR Ranking for CCS HAU.",
      excerpt_hi: "सीसीएस एचएयू के लिए आईसीएआर रैंकिंग।",
      status: "published",
      published_at: new Date().toISOString(),
      page_type: "standard",
      layout_template: "standard",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id, status: "created" };
}

async function main() {
  console.log({ mode: APPLY ? "APPLY" : "dry-run", azurePublic: AZURE_PUBLIC });

  const pdfResults = await uploadPdfs();
  console.log("pdfs:", pdfResults);

  const icarPdfUrl = `${AZURE_PUBLIC}/legacy-storage/ooOjUAzZAvebuhU8rl3Vlah5spO9gpq4VCku4dCC.pdf`;
  const icarPage = await ensureIcarPage(icarPdfUrl);
  console.log("icar page:", icarPage);

  const icarMenu = MENU_FIXES.find((m) => m.label === "ICAR Ranking");
  if (icarMenu && icarPage.id) icarMenu.pageId = icarPage.id;

  const menuReport = [];
  for (const fix of MENU_FIXES) {
    const { data: before } = await supabase
      .from("ccshau_menu_items")
      .select("id, label_en, href, page_id, open_in_new_tab")
      .eq("id", fix.id)
      .maybeSingle();

    const patch = {
      href: fix.href,
      page_id: fix.pageId,
      open_in_new_tab: fix.openInNewTab,
      updated_at: new Date().toISOString(),
    };

    menuReport.push({
      id: fix.id,
      label: fix.label,
      before: before ?? null,
      after: patch,
    });

    if (!APPLY) continue;
    if (!before) {
      console.warn("menu missing:", fix.label, fix.id);
      continue;
    }
    const { error } = await supabase.from("ccshau_menu_items").update(patch).eq("id", fix.id);
    if (error) throw error;
    console.log(`updated menu: ${fix.label} → ${fix.href}`);
  }

  mkdirSync(join(__dirname, "reports"), { recursive: true });
  const reportPath = join(__dirname, "reports/fix-hau-quicklinks-internal.json");
  writeFileSync(
    reportPath,
    JSON.stringify({ mode: APPLY ? "APPLY" : "dry-run", pdfResults, icarPage, menuReport }, null, 2),
  );
  console.log("wrote", reportPath);
  if (!APPLY) console.log("Dry-run complete. Pass --apply to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
