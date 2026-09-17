/**
 * Sync PG Course Catalogue with legacy college page-data:
 * https://hau.ac.in/page-data/p-g-course-catalogue/25
 *
 * Usage: node sync-pg-course-catalogue.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE = join(__dirname, "reports/pg-catalogue-cache");
const CONFIRM = process.argv.includes("--confirm");
const LEGACY_API = "https://hau.ac.in/page-data/p-g-course-catalogue/25";
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

async function ensurePdf(containerClient, pdfUrl) {
  const fileName = basename(new URL(pdfUrl).pathname);
  const blobPath = `pages/pg-studies/course-catalogue/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) return { stored, publicUrl, fileName };

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const r = await fetch(pdfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${pdfUrl}: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 500) throw new Error(`pdf too small ${pdfUrl}`);
    await writeFile(cachePath, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
    overwrite: true,
  });
  return { stored, publicUrl, fileName };
}

function buildContent({ part1Url, part2Url }) {
  // Keep legacy misspelling "CATALOUGE" to match live HAU label.
  return `
<table class="w-full border-collapse text-sm">
<tbody>
<tr>
<td class="p-4 text-center">
<strong class="text-2xl">PG Course Catalogue</strong>
</td>
</tr>
<tr>
<td class="p-3 text-center">
<span class="text-xl font-semibold text-slate-700">GENERAL INFORMATION</span>
</td>
</tr>
<tr>
<td class="p-3 text-center">
<a class="fr-file text-xl font-semibold text-emerald-800 hover:underline" href="${part1Url}" target="_blank" rel="noopener noreferrer">NEW COURSE CATALOUGE BOOK PART - I</a>
</td>
</tr>
<tr>
<td class="p-3 text-center">
<a class="fr-file text-xl font-semibold text-emerald-800 hover:underline" href="${part2Url}" target="_blank" rel="noopener noreferrer">NEW COURSE CATALOUGE BOOK PART - II</a>
</td>
</tr>
</tbody>
</table>
`.trim();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const legacy = await (await fetch(LEGACY_API)).json();
  const links = [
    ...String(legacy.page_content || "").matchAll(
      /href="(https:\/\/hau\.ac\.in\/storage\/app\/uploads\/[^"]+\.pdf)"[^>]*>\s*([^<]*?)\s*</gi,
    ),
  ].map((m) => ({ href: m[1], label: m[2].replace(/&nbsp;/g, " ").trim() }));

  const part1 = links.find((l) => /PART\s*-\s*I\b/i.test(l.label) && !/PART\s*-\s*II/i.test(l.label));
  const part2 = links.find((l) => /PART\s*-\s*II/i.test(l.label));
  if (!part1 || !part2) {
    throw new Error(`Missing part links: ${JSON.stringify(links)}`);
  }

  console.log({
    mode: CONFIRM ? "apply" : "dry-run",
    part1: part1.href,
    part2: part2.href,
  });

  let part1Url = part1.href;
  let part2Url = part2.href;

  if (CONFIRM) {
    const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
      CONTAINER,
    );
    const a = await ensurePdf(container, part1.href);
    const b = await ensurePdf(container, part2.href);
    part1Url = a.publicUrl;
    part2Url = b.publicUrl;
    console.log({ part1Azure: part1Url, part2Azure: part2Url });
  }

  const contentEn = buildContent({ part1Url, part2Url });
  const contentHi = `
<table class="w-full border-collapse text-sm">
<tbody>
<tr><td class="p-4 text-center"><strong class="text-2xl">पीजी पाठ्यक्रम सूची</strong></td></tr>
<tr><td class="p-3 text-center"><span class="text-xl font-semibold text-slate-700">सामान्य जानकारी</span></td></tr>
<tr><td class="p-3 text-center"><a class="fr-file text-xl font-semibold text-emerald-800 hover:underline" href="${part1Url}" target="_blank" rel="noopener noreferrer">नई पाठ्यक्रम सूची पुस्तक भाग - I</a></td></tr>
<tr><td class="p-3 text-center"><a class="fr-file text-xl font-semibold text-emerald-800 hover:underline" href="${part2Url}" target="_blank" rel="noopener noreferrer">नई पाठ्यक्रम सूची पुस्तक भाग - II</a></td></tr>
</tbody>
</table>
`.trim();

  if (!CONFIRM) {
    console.log("Pass --confirm to upload PDFs and update DB");
    console.log(contentEn);
    return;
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id")
    .eq("slug", "pg-course-catalogue")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error("pg-course-catalogue missing");

  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      content_en: contentEn,
      content_hi: contentHi,
      excerpt_en: "PG Course Catalogue — General information and new course catalogue books.",
      excerpt_hi: "पीजी पाठ्यक्रम सूची — सामान्य जानकारी और नई पाठ्यक्रम सूची पुस्तकें।",
      layout_config: {
        hero: true,
        headOfficer: false,
        contacts: false,
        staff: false,
        gallery: false,
        mainContent: true,
        leftSidebar: false,
        rightSidebar: false,
        collegeTopMenu: true,
        farmersCta: false,
        heroContactButton: false,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (upErr) throw new Error(upErr.message);

  // Keep duplicate slug from competing in search / confusion
  await sb
    .from("ccshau_pages")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("slug", "p-g-course-catalogue");

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
