/**
 * Sync PG Proforma with legacy:
 * https://hau.ac.in/page-data/p-g-proforma/25
 *
 * Usage: node sync-pg-proforma.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CACHE = join(__dirname, "reports/pg-proforma-cache");
const CONFIRM = process.argv.includes("--confirm");
const LEGACY_API = "https://hau.ac.in/page-data/p-g-proforma/25";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const LOCAL_SEMINAR = "/pages/pg-studies/seminar-registration";

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

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".rtf": "application/rtf",
    }[e] || "application/octet-stream"
  );
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function ensureFile(containerClient, fileUrl) {
  const normalized = fileUrl.replace("https://www.hau.ac.in/", "https://hau.ac.in/");
  const fileName = basename(new URL(normalized).pathname);
  const blobPath = `pages/pg-studies/proforma/${fileName}`;
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
    const candidates = [
      normalized,
      normalized.replace("https://hau.ac.in/", "https://www.hau.ac.in/"),
      normalized.replace("https://www.hau.ac.in/", "https://hau.ac.in/"),
    ];
    let lastErr = null;
    for (const candidate of [...new Set(candidates)]) {
      try {
        const r = await fetch(candidate, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "*/*",
            Referer: "https://hau.ac.in/college/pg-studies",
          },
        });
        if (!r.ok) {
          lastErr = new Error(`fetch ${candidate}: ${r.status}`);
          continue;
        }
        buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 200) {
          lastErr = new Error(`file too small ${candidate}`);
          continue;
        }
        await writeFile(cachePath, buf);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr || !buf) throw lastErr || new Error(`fetch failed ${normalized}`);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  return { stored, publicUrl, fileName };
}

function buildCleanHtml(items, seminarHref) {
  const rows = items
    .map((item, index) => {
      const n = index + 1;
      if (item.kind === "seminar") {
        return `<tr>
<td class="align-top pr-3 font-semibold">${n}.</td>
<td><strong><a href="${seminarHref}">${item.label}</a></strong></td>
</tr>`;
      }
      const desc = item.description ? ` ${item.description}` : "";
      return `<tr>
<td class="align-top pr-3 font-semibold">${n}.</td>
<td><strong><a class="fr-file" href="${item.href}" target="_blank" rel="noopener noreferrer">${item.label}</a></strong>${desc}</td>
</tr>`;
    })
    .join("\n");

  return `
<p><strong>PG Proforma</strong></p>
<table class="w-full border-collapse text-sm">
<tbody>
${rows}
</tbody>
</table>
`.trim();
}

function parseLegacyItems(html) {
  const items = [];
  const rowRe =
    /<tr[^>]*>\s*<td[^>]*>\s*<strong>\s*(\d+)\.[\s\S]*?<\/strong>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const cell = m[2];
    const fileLink = cell.match(
      /href="(https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/[^"]+)"[^>]*>\s*(?:<strong>)?([^<]+?)(?:<\/strong>)?\s*<\/a>/i,
    );
    const seminarLink = cell.match(
      /href="(https?:\/\/(?:www\.)?hau\.ac\.in\/registration\/[^"]+|\/pages\/pg-studies\/seminar-registration)"[^>]*>\s*([^<]+?)\s*<\/a>/i,
    );
    if (seminarLink) {
      items.push({
        kind: "seminar",
        label: seminarLink[2].replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
      });
      continue;
    }
    if (!fileLink) continue;
    const label = fileLink[2].replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    const after = cell
      .replace(/<a[\s\S]*?<\/a>/i, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    items.push({
      kind: "file",
      href: fileLink[1],
      label,
      description: after,
    });
  }
  return items;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const legacy = await (await fetch(LEGACY_API)).json();
  const items = parseLegacyItems(legacy.page_content || "");
  if (items.length < 15) {
    throw new Error(`Expected ~16 proforma items, got ${items.length}`);
  }

  console.log({
    mode: CONFIRM ? "apply" : "dry-run",
    count: items.length,
    labels: items.map((i) => i.label),
  });

  let finalItems = items;
  if (CONFIRM) {
    const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
      CONTAINER,
    );
    finalItems = [];
    for (const item of items) {
      if (item.kind === "seminar") {
        finalItems.push(item);
        continue;
      }
      try {
        const uploaded = await ensureFile(container, item.href);
        console.log("uploaded", uploaded.fileName);
        finalItems.push({ ...item, href: uploaded.publicUrl });
      } catch (err) {
        console.warn("keep legacy url:", item.label, err.message);
        finalItems.push(item);
      }
    }
  }

  const contentEn = buildCleanHtml(finalItems, LOCAL_SEMINAR);
  const contentHi = contentEn; // forms are English filenames on legacy too

  if (!CONFIRM) {
    console.log(contentEn.slice(0, 800));
    console.log("Pass --confirm to upload and update DB");
    return;
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id")
    .eq("slug", "pg-proforma")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error("pg-proforma missing");

  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      content_en: contentEn,
      content_hi: contentHi,
      excerpt_en: "Downloadable PG proforma and examination forms.",
      excerpt_hi: "डाउनलोड योग्य पीजी प्रपत्र और परीक्षा फॉर्म।",
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

  await sb
    .from("ccshau_pages")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("slug", "p-g-proforma");

  console.log("done", { items: finalItems.length });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
