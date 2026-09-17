/**
 * Fix Controller of Examination layout + Azure photo.
 * Usage: node fix-coe-layout.mjs --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT = join(__dirname, "reports");
const CACHE = join(REPORT, "coe-cache");
const CONFIRM = process.argv.includes("--confirm");
const LEGACY_IMG =
  "https://hau.ac.in/storage/app/uploads/2QC3I5u7Zo0RRcz65y7TM7n1zPAuMOU3V0BcvHdF.jpeg";
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
const sanitizeHtml = requireFromWeb("sanitize-html");

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    }[e] || "application/octet-stream"
  );
}

async function ensureAzureImage(containerClient, imageUrl) {
  const fileName = basename(new URL(imageUrl).pathname);
  const blobPath = `pages/registrar-office/controller-of-examination/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) return publicUrl;

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const r = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) {
      console.warn(`image fetch ${r.status} — continuing without photo file`);
      return null;
    }
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) {
      console.warn("image too small — continuing without photo file");
      return null;
    }
    await writeFile(cachePath, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
  });
  return publicUrl;
}

function buildBodyHtml(imageUrl) {
  const photoInner = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="Dr. Surender Kumar Sharma, Controller of Examinations" width="400" height="250" loading="lazy" />`
    : `<div class="coe-officer__photo-placeholder" aria-hidden="true">Photo</div>`;

  const raw = `
<p><strong>CONTROLLER OF EXAMINATIONS</strong></p>
<div class="coe-officer">
  <div class="coe-officer__photo">
    ${photoInner}
    <p class="coe-officer__name"><strong>Dr. Surender Kumar Sharma</strong></p>
    <p class="coe-officer__role"><strong>CONTROLLER OF EXAMINATIONS</strong></p>
  </div>
  <div class="coe-officer__contact">
    <p class="coe-officer__contact-title"><strong>Mailing Address :</strong></p>
    <p>Room No.102, Fletcher Bhawan,</p>
    <p>CCS Haryana Agricultural University,</p>
    <p>Hisar-125004</p>
    <p>Phone No. 91-1662-255310</p>
    <p>Email Id. <a href="mailto:coe@hau.ac.in">coe@hau.ac.in</a></p>
  </div>
</div>
<p style="text-align:justify">The office of Controller of Examinations came in to existence in CCS HAU, Hisar in the year 1999 when external examination system was implemented for B.Sc.(Hons.) Ag. -4yr, B.Sc.(Hons.) Ag. - 6(2+4) yr, B.Sc.(Hons.) C.Sc. - 4yr, B.Sc.(Hons.) Phy.Sc. -4yr, B.Sc.(Hons.) Life Sc. - 4yr, B.Tech. (Agril. Engg.), B.Tech. (Biotechnology), B.F.Sc. and MBA programmes. Responsible for conduct of Entrance Tests for admission to various UG and PG programmes. It also coordinates with the Central Flying Squad and high powered committee of UMC including following jobs relating to final examinations as well as ET :-</p>
<p><strong>Secrecy</strong></p>
<ul>
  <li>Paper setting</li>
  <li>Typing</li>
  <li>Proof reading</li>
  <li>Printing</li>
  <li>Set making</li>
</ul>
<p><strong>Conduct</strong></p>
<ul>
  <li>UG and PG Entrance Tests</li>
  <li>External examinations of
    <ol>
      <li>B.Sc.(Hons.) Ag. - 4 yr</li>
      <li>B.Sc.(Hons.) Ag. – 6(2+4) yr</li>
      <li>B.Sc.(Hons.) C.Sc. - 4 yr</li>
      <li>B.Sc.(Hons.) Phy.Sc. - 4 yr</li>
      <li>B.Sc.(Hons.) Life.Sc. - 4 yr</li>
      <li>B.Tech. (Agril. Engg.)</li>
      <li>B.Tech. (Biotechnology)</li>
      <li>B.F.Sc.</li>
      <li>MBA</li>
    </ol>
  </li>
</ul>
<p><strong>Result</strong></p>
<ul>
  <li>Evaluation of Answer/OMR sheets</li>
  <li>Compilation/Tabulation of result</li>
</ul>
<p><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/VNAnr9xSARRHWdjuAirucud8gwwu947SK5MH7nmP.pdf"><strong>Hon'ble Vice-Chancellor, Dr. B.R. Kamboj, Monitoring the Entrance Test-2025</strong></a></p>
`.trim();

  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "section",
      "div",
      "span",
      "h2",
      "h3",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class", "id", "style", "aria-hidden"],
      a: ["href", "class", "title", "target", "rel"],
      img: ["src", "alt", "class", "loading", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let imageUrl = null;
  if (CONFIRM) {
    const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
      CONTAINER,
    );
    imageUrl = await ensureAzureImage(container, LEGACY_IMG);
  }
  console.log("image", imageUrl || "(placeholder — legacy file is 404)");

  const contentEn = buildBodyHtml(imageUrl);
  mkdirSync(REPORT, { recursive: true });
  writeFileSync(join(REPORT, "coe-fixed-content.html"), contentEn);

  if (!CONFIRM) {
    console.log("dry-run only; pass --confirm to write");
    return;
  }

  const { data: page, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id,slug")
    .eq("slug", "controller-of-examination")
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (page?.id) {
    const { error } = await sb
      .from("ccshau_pages")
      .update({
        content_en: contentEn,
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);
    if (error) throw new Error(error.message);
    console.log("updated page", page.id);
  }

  const { data: registrar } = await sb
    .from("ccshau_pages")
    .select("id")
    .eq("slug", "registrar-office")
    .maybeSingle();

  if (registrar?.id) {
    const { data: items, error: sideErr } = await sb
      .from("ccshau_page_sidebar_items")
      .select("id,label_en,content_en,href")
      .eq("page_id", registrar.id)
      .ilike("label_en", "%Controller of Examination%");
    if (sideErr) throw new Error(sideErr.message);

    for (const item of items || []) {
      const { error } = await sb
        .from("ccshau_page_sidebar_items")
        .update({
          content_en: contentEn,
          href: null,
          linked_page_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
      console.log("updated sidebar", item.id, item.label_en);
    }
  }

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
