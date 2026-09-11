#!/usr/bin/env node
/**
 * Import legacy Circular Section (hau.ac.in/circulars) into Supabase + Azure.
 *
 * - Upserts office/branch categories (legacy hau_circular)
 * - Upserts notifications as ccshau_circulars (legacy hau_circular_notifications)
 * - Uploads PDFs to Azure under circulars/{id}/{filename}
 *
 * Dry-run (default):
 *   node scripts/legacy-import/import-legacy-circulars.mjs
 *
 * Apply:
 *   node scripts/legacy-import/import-legacy-circulars.mjs --apply
 *
 * Options:
 *   --limit=N          stop after N notifications (testing)
 *   --office=1,2,4     only these legacy office ids
 *   --skip-upload      reuse existing Azure blobs / skip binary upload when path already set
 */
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SKIP_UPLOAD = process.argv.includes("--skip-upload");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || 0) || 0;
const OFFICE_FILTER = (process.argv.find((a) => a.startsWith("--office="))?.split("=")[1] || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number);

const LEGACY_BASE = "https://hau.ac.in";
const LOCAL_PDF_ROOT = join("C:/Jatin/Projects/CCHAU_mysql/uploads/uploads/circular-pdf");
const CACHE = join(__dirname, "reports/circular-pdf-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

/** Top-level offices shown as tabs on legacy /circulars */
const OFFICE_DEFS = [
  { legacy_id: 1, name_en: "REGISTRAR OFFICE", slug: "registrar-office", sort_order: 1 },
  { legacy_id: 2, name_en: "COMPTROLLER OFFICE", slug: "comptroller-office", sort_order: 2 },
  { legacy_id: 3, name_en: "STORE PURCHASE OFFICE", slug: "store-purchase-office", sort_order: 3 },
  { legacy_id: 4, name_en: "DIRECTORATE OF RESEARCH", slug: "directorate-of-research", sort_order: 4 },
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
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

function mimeFor(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function sanitizeFileName(name) {
  return basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: `${LEGACY_BASE}/circulars`,
    },
  });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return r.json();
}

async function loadPdfBuffer(relPath) {
  const fileName = basename(relPath.replace(/\\/g, "/"));
  const localPath = join(LOCAL_PDF_ROOT, fileName);
  if (existsSync(localPath)) {
    return { buf: await readFile(localPath), from: localPath };
  }

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  if (existsSync(cachePath)) {
    return { buf: await readFile(cachePath), from: cachePath };
  }

  const candidates = [
    `${LEGACY_BASE}/storage/app/${relPath.replace(/^\/+/, "")}`,
    `${LEGACY_BASE}/storage/app/uploads/circular-pdf/${fileName}`,
    `https://www.hau.ac.in/storage/app/uploads/circular-pdf/${fileName}`,
  ];

  let lastErr = null;
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/pdf,*/*",
          Referer: `${LEGACY_BASE}/circulars`,
        },
      });
      if (!r.ok) {
        lastErr = new Error(`${url} → ${r.status}`);
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 200) {
        lastErr = new Error(`${url} too small`);
        continue;
      }
      await writeFile(cachePath, buf);
      return { buf, from: url };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error(`Could not load ${fileName}`);
}

async function upsertCategory(supabase, row) {
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_circular_categories")
    .select("id")
    .eq("legacy_id", row.legacy_id)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing?.id) {
    const { error } = await supabase
      .from("ccshau_circular_categories")
      .update({
        name_en: row.name_en,
        slug: row.slug,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        is_active: true,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const id = randomUUID();
  const { error } = await supabase.from("ccshau_circular_categories").insert({
    id,
    legacy_id: row.legacy_id,
    name_en: row.name_en,
    name_hi: null,
    slug: row.slug,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
    is_active: true,
  });
  if (error) throw error;
  return id;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const officesToImport = OFFICE_FILTER.length
    ? OFFICE_DEFS.filter((o) => OFFICE_FILTER.includes(o.legacy_id))
    : OFFICE_DEFS;

  console.log({
    mode: APPLY ? "APPLY" : "dry-run",
    offices: officesToImport.map((o) => o.name_en),
    limit: LIMIT || "all",
    localPdfRoot: LOCAL_PDF_ROOT,
    localPdfExists: existsSync(LOCAL_PDF_ROOT),
  });

  const legacyIdToUuid = new Map();
  const categoryPlan = [];

  for (const office of officesToImport) {
    categoryPlan.push({ ...office, parent_legacy: null });
    const children = await fetchJson(
      `${LEGACY_BASE}/circular-children-categories/${office.legacy_id}`,
    );
    let sort = 1;
    for (const child of children) {
      categoryPlan.push({
        legacy_id: child.circular_id,
        name_en: child.circular_name,
        slug: child.circular_slug || `branch-${child.circular_id}`,
        sort_order: sort++,
        parent_legacy: office.legacy_id,
      });
    }
  }

  console.log(`Categories to upsert: ${categoryPlan.length}`);

  if (APPLY) {
    for (const cat of categoryPlan.filter((c) => !c.parent_legacy)) {
      const id = await upsertCategory(supabase, {
        legacy_id: cat.legacy_id,
        name_en: cat.name_en,
        slug: cat.slug,
        parent_id: null,
        sort_order: cat.sort_order,
      });
      legacyIdToUuid.set(cat.legacy_id, id);
    }
    for (const cat of categoryPlan.filter((c) => c.parent_legacy)) {
      const parentId = legacyIdToUuid.get(cat.parent_legacy);
      if (!parentId) throw new Error(`Missing parent for ${cat.legacy_id}`);
      const id = await upsertCategory(supabase, {
        legacy_id: cat.legacy_id,
        name_en: cat.name_en,
        slug: cat.slug,
        parent_id: parentId,
        sort_order: cat.sort_order,
      });
      legacyIdToUuid.set(cat.legacy_id, id);
    }
  } else {
    for (const cat of categoryPlan) {
      legacyIdToUuid.set(cat.legacy_id, `dry-${cat.legacy_id}`);
    }
  }

  const notificationCats = [...new Set(categoryPlan.map((c) => c.legacy_id))];
  const notifications = [];
  for (const catId of notificationCats) {
    const rows = await fetchJson(`${LEGACY_BASE}/circular-children-notification/${catId}`);
    for (const row of rows) {
      if (row.notification_status === 0) continue;
      notifications.push(row);
    }
  }

  notifications.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const selected = LIMIT > 0 ? notifications.slice(0, LIMIT) : notifications;
  console.log(`Notifications: ${notifications.length} (importing ${selected.length})`);

  if (!APPLY) {
    const sample = selected.slice(0, 5).map((n) => ({
      id: n.id,
      circular_id: n.circular_id,
      title: n.notification_title,
      file: n.notification_file,
    }));
    console.log("Sample:", sample);
    console.log("Pass --apply to upsert categories, upload PDFs to Azure, and insert circulars.");
    return;
  }

  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");
  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);

  let ok = 0;
  let reused = 0;
  let failed = 0;
  const failures = [];

  for (const n of selected) {
    const categoryId = legacyIdToUuid.get(n.circular_id);
    if (!categoryId) {
      failed++;
      failures.push({ id: n.id, error: `unknown category ${n.circular_id}` });
      continue;
    }

    try {
      const { data: existing, error: findErr } = await supabase
        .from("ccshau_circulars")
        .select("id, file_path, file_name, file_size")
        .eq("legacy_notification_id", n.id)
        .maybeSingle();
      if (findErr) throw findErr;

      let circularId = existing?.id ?? randomUUID();
      if (!existing) {
        const { error: insErr } = await supabase.from("ccshau_circulars").insert({
          id: circularId,
          title_en: n.notification_title || `Circular ${n.id}`,
          title_hi: null,
          circular_number: null,
          category_id: categoryId,
          legacy_notification_id: n.id,
          status: "published",
          published_at: n.created_at
            ? new Date(n.created_at.replace(" ", "T") + "Z").toISOString()
            : new Date().toISOString(),
        });
        if (insErr) throw insErr;
      } else {
        const { error: upErr } = await supabase
          .from("ccshau_circulars")
          .update({
            title_en: n.notification_title || existing.title_en,
            category_id: categoryId,
            status: "published",
            published_at: n.created_at
              ? new Date(n.created_at.replace(" ", "T") + "Z").toISOString()
              : undefined,
          })
          .eq("id", circularId);
        if (upErr) throw upErr;
      }

      const rel = (n.notification_file || "").replace(/^\/+/, "");
      if (!rel) {
        ok++;
        continue;
      }

      const fileName = sanitizeFileName(basename(rel));
      const blobPath = `circulars/${circularId}/${fileName}`;
      const storedPath = `${CONTAINER}/${blobPath}`;
      const blob = container.getBlockBlobClient(blobPath);

      let fileSize = existing?.file_size ?? null;
      if (SKIP_UPLOAD && existing?.file_path?.includes(blobPath)) {
        reused++;
      } else if (await blob.exists()) {
        reused++;
        fileSize = fileSize ?? (await blob.getProperties()).contentLength ?? null;
        await supabase
          .from("ccshau_circulars")
          .update({
            file_path: storedPath,
            file_name: fileName,
            file_size: fileSize,
          })
          .eq("id", circularId);
      } else {
        const { buf } = await loadPdfBuffer(rel);
        await blob.uploadData(buf, {
          blobHTTPHeaders: { blobContentType: mimeFor(fileName) },
          overwrite: true,
        });
        fileSize = buf.length;
        await supabase
          .from("ccshau_circulars")
          .update({
            file_path: storedPath,
            file_name: fileName,
            file_size: fileSize,
          })
          .eq("id", circularId);
      }

      ok++;
      if (ok % 25 === 0) {
        console.log(`Progress: ${ok}/${selected.length} (reused blobs ${reused}, failed ${failed})`);
      }
    } catch (e) {
      failed++;
      failures.push({ id: n.id, title: n.notification_title, error: String(e?.message || e) });
      console.error(`FAIL #${n.id}:`, e?.message || e);
    }
  }

  const reportPath = join(
    __dirname,
    "reports",
    `import-legacy-circulars-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  mkdirSync(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ok,
        reused,
        failed,
        total: selected.length,
        failures: failures.slice(0, 100),
        fingerprint: createHash("sha1").update(String(ok)).digest("hex").slice(0, 8),
      },
      null,
      2,
    ),
  );

  console.log({ ok, reused, failed, reportPath });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
