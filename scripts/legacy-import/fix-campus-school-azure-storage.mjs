/**
 * Migrate Campus School hau.ac.in/storage/app/uploads links → Azure Blob.
 * Covers Quick Link "CBSE Mandatory Disclosure" Click Here PDFs + related pages.
 *
 * Usage:
 *   node fix-campus-school-azure-storage.mjs --dry-run
 *   node fix-campus-school-azure-storage.mjs --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CACHE_DIR = join(REPORT_DIR, "campus-school-storage-cache");
const COLLEGE_ID = "a28d4da5-1229-4bb1-9c82-f5646335a488";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = !CONFIRM;

const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const HAU_STORAGE_RE =
  /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^\s"'<>)\\]+)/gi;

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
  const map = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return map[e] || "application/octet-stream";
}

function sanitizeFileName(name) {
  return String(name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function collectUrls(text) {
  const urls = new Set();
  if (!text) return urls;
  const re = new RegExp(HAU_STORAGE_RE.source, "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    urls.add(m[0].replace(/[),.;]+$/, ""));
  }
  return urls;
}

function rewriteHtml(html, urlMap) {
  let next = html;
  let changed = false;
  for (const [from, to] of urlMap) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      changed = true;
    }
  }
  return { next, changed };
}

async function downloadFromHau(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 50) throw new Error("download too small");
  mkdirSync(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return buf;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const container = CONFIRM
    ? BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER)
    : null;

  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  const targets = [];

  // Sidebar quick links on campus-school root
  const { data: sidebars, error: sbErr } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,content_en,content_hi")
    .eq("page_id", COLLEGE_ID);
  if (sbErr) throw new Error(sbErr.message);
  for (const row of sidebars || []) {
    targets.push({
      table: "ccshau_page_sidebar_items",
      id: row.id,
      label: row.label_en,
      fields: {
        content_en: row.content_en || "",
        content_hi: row.content_hi || "",
      },
    });
  }

  // Pages under campus-school tree
  const { data: pages, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id,slug,content_en,content_hi")
    .or(`id.eq.${COLLEGE_ID},college_root_id.eq.${COLLEGE_ID}`);
  if (pageErr) throw new Error(pageErr.message);
  for (const row of pages || []) {
    targets.push({
      table: "ccshau_pages",
      id: row.id,
      label: row.slug,
      fields: {
        content_en: row.content_en || "",
        content_hi: row.content_hi || "",
      },
    });
  }

  // Faculty photos assigned to campus-school
  const { data: assignments } = await sb
    .from("ccshau_faculty_assignments")
    .select("person_id")
    .eq("page_id", COLLEGE_ID)
    .eq("is_active", true);
  const personIds = [...new Set((assignments || []).map((a) => a.person_id).filter(Boolean))];
  if (personIds.length) {
    const { data: people } = await sb
      .from("ccshau_faculty_people")
      .select("id,name_en,image_path")
      .in("id", personIds);
    for (const row of people || []) {
      targets.push({
        table: "ccshau_faculty_people",
        id: row.id,
        label: row.name_en,
        fields: { image_path: row.image_path || "" },
      });
    }
  }

  const allUrls = new Set();
  for (const t of targets) {
    for (const val of Object.values(t.fields)) {
      for (const u of collectUrls(val)) allUrls.add(u);
    }
  }

  console.log(
    DRY_RUN ? "dry-run" : "apply",
    "campus-school hau storage URLs:",
    allUrls.size,
  );

  const urlMap = [];
  const report = {
    mode: CONFIRM ? "apply" : "dry-run",
    urls: {},
    rewrittenRows: 0,
    uploaded: 0,
    failed: [],
  };

  for (const hauUrl of allUrls) {
    const fileName = sanitizeFileName(basename(new URL(hauUrl).pathname));
    const blobPath = `legacy-storage/campus-school/${fileName}`;
    const stored = `${CONTAINER}/${blobPath}`;
    const publicUrl = azurePublicUrl(stored);
    const cachePath = join(CACHE_DIR, fileName);

    try {
      let buf;
      if (existsSync(cachePath)) {
        buf = await readFile(cachePath);
      } else {
        buf = await downloadFromHau(hauUrl, cachePath);
      }

      if (CONFIRM) {
        await container.getBlockBlobClient(blobPath).uploadData(buf, {
          blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
        });
        report.uploaded += 1;
      }

      urlMap.push([hauUrl, publicUrl]);
      report.urls[hauUrl] = { status: CONFIRM ? "uploaded" : "planned", publicUrl, bytes: buf.length };
      console.log((CONFIRM ? "uploaded" : "plan"), fileName, "->", publicUrl);
    } catch (e) {
      report.failed.push({ url: hauUrl, error: e.message });
      console.error("FAIL", fileName, e.message);
    }
  }

  if (urlMap.length) {
    for (const target of targets) {
      const patch = {};
      let changed = false;
      for (const [col, val] of Object.entries(target.fields)) {
        const r = rewriteHtml(val, urlMap);
        if (r.changed) {
          patch[col] = r.next;
          changed = true;
        }
      }
      if (!changed) continue;
      report.rewrittenRows += 1;
      if (CONFIRM) {
        const { error } = await sb.from(target.table).update(patch).eq("id", target.id);
        if (error) {
          report.failed.push({
            table: target.table,
            id: target.id,
            label: target.label,
            error: error.message,
          });
        } else {
          console.log("rewrote", target.table, target.label);
        }
      } else {
        console.log("would rewrite", target.table, target.label, Object.keys(patch));
      }
    }
  }

  const out = join(REPORT_DIR, "fix-campus-school-azure-storage.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        urls: allUrls.size,
        uploaded: report.uploaded,
        rewrittenRows: report.rewrittenRows,
        failed: report.failed.length,
        report: out,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
