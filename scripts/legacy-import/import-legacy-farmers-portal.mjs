#!/usr/bin/env node
/**
 * Import Farmers' Portal event PDFs (legacy https://hau.ac.in/event/MQ==)
 * to Azure and generate content module for /farmers-portal.
 *
 *   node scripts/legacy-import/import-legacy-farmers-portal.mjs
 *   node scripts/legacy-import/import-legacy-farmers-portal.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const LEGACY_BASE = "https://hau.ac.in";
const CACHE = join(__dirname, "reports/farmers-portal-pdf-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const PDF_ITEMS = [
  { id: 5, title: "Success Story- Women Entrepreneur", file: "Opt4uGmweLw4Txi2zDzVY5m0Yrem2b8AtkYZ3UFa.pdf" },
  { id: 6, title: "Success Story- Horticulture & Vegetable", file: "2QdIgM33EUkSxFmKb0EybbWEAOjYhT2w5JCdPHIJ.pdf" },
  { id: 7, title: "Success Story- Mushroom Production", file: "ilk23msYA1YiS2P9EtHW8e0cimBjcOrtBJi26pfw.pdf" },
  { id: 8, title: "Success Story- Paddy Residue Management", file: "zuAP6CH2gy4iKpeQGE0SgpKhZ2n6zdgz0tfqmYn9.pdf" },
  { id: 9, title: "Success Story- Strawberry Production", file: "1WwANO4JojZ9yle80sbbSC1qFDIDfLtmm9eb9PAr.pdf" },
  { id: 15, title: "Seeds & Other Products Avalability", file: "gZFf5v2AEiwKujdeXvdpmcjPR4WecIGJ5o9A5trn.pdf" },
];

const HTML_TITLES = [
  { id: 11, title: "Soil-water Testing facility", slug: "soil-water-testing-facility" },
  { id: 12, title: "Farm Machinery Testing Centre", slug: "farm-machinery-testing-centre" },
  { id: 14, title: "Kisan Seva Kendra", slug: "kisan-seva-kendra" },
  { id: 25, title: "Discharge tubewell App", slug: "discharge-tubewell-app" },
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

function makeStubPdf(title) {
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = `BT /F1 12 Tf 50 720 Td (${escape(title.slice(0, 100))}) Tj ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

async function loadPdfBuffer(fileName, title) {
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  if (existsSync(cachePath)) {
    return { buf: await readFile(cachePath), from: cachePath, stub: false };
  }
  const url = `${LEGACY_BASE}/storage/app/uploads/event-pdf/${fileName}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/pdf,*/*",
      Referer: `${LEGACY_BASE}/event/MQ==`,
    },
  });
  if (!r.ok) {
    console.warn(`PDF missing ${fileName} → ${r.status}; using stub`);
    const buf = makeStubPdf(title);
    await writeFile(cachePath, buf);
    return { buf, from: "stub", stub: true };
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 200) {
    console.warn(`PDF too small ${fileName}; using stub`);
    const stub = makeStubPdf(title);
    await writeFile(cachePath, stub);
    return { buf: stub, from: "stub", stub: true };
  }
  await writeFile(cachePath, buf);
  return { buf, from: url, stub: false };
}

async function fetchHtml(id, title) {
  const url = `${LEGACY_BASE}/event-data/${encodeURIComponent(title)}/${id}`;
  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });
  if (!r.ok) throw new Error(`event-data ${id} → ${r.status}`);
  const json = await r.json();
  return json.event_description || "";
}

function rewriteLegacyUrls(html) {
  return html
    .replace(/https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\//gi, "https://hau.ac.in/storage/app/")
    .replace(/https?:\/\/(?:www\.)?hau\.ac\.in\/page\//gi, "/pages/")
    .replace(/https?:\/\/(?:www\.)?hau\.ac\.in\/apk\//gi, "https://hau.ac.in/apk/");
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function writeContentModule(pdfPaths, htmlBySlug) {
  const outPath = join(ROOT, "apps/web/src/lib/data/farmers-portal-content.ts");
  const body = `/* Auto-generated by scripts/legacy-import/import-legacy-farmers-portal.mjs — do not edit by hand. */

export const FARMERS_PORTAL_INTRO_EN =
  'Agriculture is the backbone of the Indian Economy"- said Mahatma Gandhi six decades ago. Even today, the situation is still the same, with almost the entire economy being sustained by agriculture, which is the mainstay of the villages. It contributes 16% of the overall GDP and accounts for employment of approximately 52% of the Indian population. Rapid growth in agriculture is essential not only for self-reliance but also to earn valuable foreign exchange.';

export const FARMERS_PORTAL_INTRO_HI =
  "कृषि भारतीय अर्थव्यवस्था की रीढ़ है\\" — महात्मा गांधी ने छह दशक पहले कहा था। आज भी लगभग पूरी अर्थव्यवस्था कृषि पर टिकी है, जो गांवों का मुख्य आधार है।";

export type FarmersPortalItem = {
  id: string;
  labelEn: string;
  labelHi?: string;
  kind: "pdf" | "html" | "external" | "page";
  /** Azure stored path (container/blob...) for PDFs */
  pdfStoredPath?: string;
  /** Inline HTML shown in the main panel */
  htmlEn?: string;
  /** Internal path or absolute external URL */
  href?: string;
  openInNewTab?: boolean;
};

export const FARMERS_PORTAL_ITEMS: FarmersPortalItem[] = [
  {
    id: "success-women-entrepreneur",
    labelEn: "Success Story- Women Entrepreneur",
    kind: "pdf",
    pdfStoredPath: ${JSON.stringify(pdfPaths[5] || "")},
  },
  {
    id: "success-horticulture-vegetable",
    labelEn: "Success Story- Horticulture & Vegetable",
    kind: "pdf",
    pdfStoredPath: ${JSON.stringify(pdfPaths[6] || "")},
  },
  {
    id: "success-mushroom-production",
    labelEn: "Success Story- Mushroom Production",
    kind: "pdf",
    pdfStoredPath: ${JSON.stringify(pdfPaths[7] || "")},
  },
  {
    id: "success-paddy-residue",
    labelEn: "Success Story- Paddy Residue Management",
    kind: "pdf",
    pdfStoredPath: ${JSON.stringify(pdfPaths[8] || "")},
  },
  {
    id: "success-strawberry",
    labelEn: "Success Story- Strawberry Production",
    kind: "pdf",
    pdfStoredPath: ${JSON.stringify(pdfPaths[9] || "")},
  },
  {
    id: "soil-water-testing-facility",
    labelEn: "Soil-water Testing facility",
    kind: "html",
    htmlEn: \`${esc(htmlBySlug["soil-water-testing-facility"] || "")}\`,
  },
  {
    id: "farm-machinery-testing-centre",
    labelEn: "Farm Machinery Testing Centre",
    kind: "html",
    htmlEn: \`${esc(htmlBySlug["farm-machinery-testing-centre"] || "")}\`,
  },
  {
    id: "e-mausam",
    labelEn: "e-Mausam",
    kind: "external",
    href: "http://www.emausamhau.gov.in/",
    openInNewTab: true,
  },
  {
    id: "kisan-seva-kendra",
    labelEn: "Kisan Seva Kendra",
    kind: "html",
    htmlEn: \`${esc(htmlBySlug["kisan-seva-kendra"] || "")}\`,
  },
  {
    id: "seeds-other-products",
    labelEn: "Seeds & Other Products Avalability",
    kind: "pdf",
    pdfStoredPath: ${JSON.stringify(pdfPaths[15] || "")},
  },
  {
    id: "farmers-advisory",
    labelEn: "Farmer's Advisory",
    kind: "page",
    href: "/pages/advisory",
    openInNewTab: true,
  },
  {
    id: "haryana-kheti",
    labelEn: "Haryana Kheti",
    kind: "page",
    href: "/pages/haryanakheti",
    openInNewTab: true,
  },
  {
    id: "discharge-tubewell-app",
    labelEn: "Discharge tubewell App",
    kind: "html",
    htmlEn: \`${esc(htmlBySlug["discharge-tubewell-app"] || "")}\`,
  },
  {
    id: "bee-keeping",
    labelEn: "Bee Keeping",
    kind: "page",
    href: "/pages/l",
    openInNewTab: true,
  },
];
`;
  writeFileSync(outPath, body, "utf8");
  console.log("wrote", outPath);
}

async function main() {
  console.log({ mode: APPLY ? "APPLY" : "dry-run" });

  const htmlBySlug = {};
  for (const item of HTML_TITLES) {
    const html = rewriteLegacyUrls(await fetchHtml(item.id, item.title));
    htmlBySlug[item.slug] = html;
    console.log("html", item.id, html.length);
  }

  const pdfPaths = {};
  if (!APPLY) {
    for (const item of PDF_ITEMS) {
      pdfPaths[item.id] = `${CONTAINER}/farmers-portal/${item.id}/${item.file}`;
    }
    writeContentModule(pdfPaths, htmlBySlug);
    console.log("Pass --apply to upload PDFs to Azure (content module already written with expected paths).");
    return;
  }

  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");
  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);

  for (const item of PDF_ITEMS) {
    const blobPath = `farmers-portal/${item.id}/${item.file}`;
    const storedPath = `${CONTAINER}/${blobPath}`;
    const blob = container.getBlockBlobClient(blobPath);
    if (!(await blob.exists())) {
      const { buf, from, stub } = await loadPdfBuffer(item.file, item.title);
      await blob.uploadData(buf, {
        blobHTTPHeaders: { blobContentType: "application/pdf" },
      });
      console.log("uploaded", item.id, from, stub ? "(stub)" : "", buf.length);
    } else {
      console.log("exists", item.id, blobPath);
    }
    pdfPaths[item.id] = storedPath;
  }

  writeContentModule(pdfPaths, htmlBySlug);
  mkdirSync(join(__dirname, "reports"), { recursive: true });
  writeFileSync(
    join(__dirname, "reports/farmers-portal-import.json"),
    JSON.stringify({ pdfPaths, htmlSlugs: Object.keys(htmlBySlug) }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
