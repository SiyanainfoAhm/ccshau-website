#!/usr/bin/env node
/**
 * Align Manpower Assessment Cell with legacy https://hau.ac.in/department/MjA=/NzM=
 * - HOD name Staff 237 → Dr. Yogesh Jindal + legacy photo
 * - Fill empty "List of Research Funding Agencies" sidebar from legacy page
 *
 *   node scripts/ops/fix-hrm-mpac-legacy.mjs
 *   node scripts/ops/fix-hrm-mpac-legacy.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/mpac-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const PAGE_ID = "44a44b1e-dadc-4cf7-ad28-0d82069b1b0a";
const HOD_STAFF = "b680fbce-1736-44d8-a7c0-4ca3a47200fb";
const HOD_PERSON = "205eaf58-efec-459a-adbc-e36f1e076e51";
const HOD_ASG = "afc84adc-e694-4115-87db-07a57bf6384d";
const LEGACY_PHOTO =
  "https://hau.ac.in/storage/app/uploads/college-user/OpiC1CTDHfQf6bp4GLkaS4jTwaEDt6GrKmhwJWsd.jpeg";
const FUNDING_URL = "https://hau.ac.in/page/list-of-research-funding-agencies";
const FUNDING_LABEL = "List of Research Funding Agencies";
const FUNDING_LABEL_HI = "अनुसंधान वित्त पोषण एजेंसियों की सूची";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function extractBlogContent(html) {
  const m = html.match(
    /<div class="blog-single-img">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*(?:<!--|<\/section>|<footer)/i,
  );
  if (m?.[1]) return m[1].trim();
  const m2 = html.match(/<div class="blog-single-img">([\s\S]*?)<\/div>/i);
  return (m2?.[1] ?? "").trim();
}

function extractHauFileUrls(html) {
  const urls = new Set();
  for (const m of html.matchAll(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/(?:storage\/app\/uploads|public\/)[^"'\\\s>]+/gi,
  )) {
    urls.add(m[0].replace(/&amp;/g, "&"));
  }
  return [...urls];
}

function blobPathFor(hauUrl) {
  const u = new URL(hauUrl);
  const path = u.pathname.replace(/^\/+/, "");
  if (path.startsWith("storage/app/uploads/")) {
    return `legacy-storage/${path.slice("storage/app/uploads/".length)}`;
  }
  return `legacy-storage/${path}`;
}

async function ensureAzure(container, hauUrl, { minBytes = 200 } = {}) {
  const blobPath = blobPathFor(hauUrl);
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = container.getBlockBlobClient(blobPath);
  if (await blob.exists()) {
    const props = await blob.getProperties();
    if ((props.contentLength ?? 0) >= minBytes) {
      return { publicUrl, reused: true, stored };
    }
  }

  mkdirSync(CACHE, { recursive: true });
  const fileName = basename(new URL(hauUrl).pathname) || "file.bin";
  const cacheFile = join(
    CACHE,
    `${createHash("sha1").update(hauUrl).digest("hex").slice(0, 12)}-${fileName.replace(/[\\/]/g, "_")}`,
  );
  let buf;
  if (existsSync(cacheFile) && readFileSync(cacheFile).length >= minBytes) {
    buf = readFileSync(cacheFile);
  } else {
    const r = await fetch(hauUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
        Referer: "https://hau.ac.in/department/MjA=/NzM=",
      },
    });
    if (!r.ok) throw new Error(`fetch ${r.status} ${hauUrl}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < minBytes) throw new Error(`too small ${buf.length}`);
    await writeFile(cacheFile, buf);
  }
  const ext = fileName.toLowerCase().split(".").pop();
  const ct =
    ext === "pdf"
      ? "application/pdf"
      : ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: ct },
    overwrite: true,
  });
  return { publicUrl, reused: false, bytes: buf.length, stored };
}

function rewriteUrls(html, map) {
  let out = html;
  for (const [from, to] of map) {
    out = out.split(from).join(to);
    out = out.split(from.replace(/&/g, "&amp;")).join(to);
  }
  return out;
}

function toHindiShell(html) {
  return html
    .replace(/List of Research Funding Agencies/gi, "अनुसंधान वित्त पोषण एजेंसियों की सूची")
    .replace(/e-mail:/gi, "ई-मेल:")
    .replace(/Web:/gi, "वेब:")
    .replace(/Fax:/gi, "फैक्स:")
    .replace(/Tel:/gi, "दूरभाष:")
    .replace(/Last Updated\s*:-?/gi, "अंतिम अद्यतन :-");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  console.log("\nFetching funding agencies…");
  const fundingHtml = await (
    await fetch(FUNDING_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    })
  ).text();
  const fundingContent = extractBlogContent(fundingHtml);
  if (!fundingContent || fundingContent.length < 100) {
    throw new Error("No funding agencies content");
  }
  const fundingFiles = extractHauFileUrls(fundingContent);
  console.log(`  html ${fundingContent.length} chars, files ${fundingFiles.length}`);
  console.log("  preview:", fundingContent.replace(/\s+/g, " ").slice(0, 180));
  console.log("\nWill set HOD → Dr. Yogesh Jindal + legacy photo");
  console.log(`  photo: ${LEGACY_PHOTO}`);

  if (!APPLY) {
    console.log("\nPass --apply to upload photo + update DB.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const now = new Date().toISOString();

  const photo = await ensureAzure(container, LEGACY_PHOTO, { minBytes: 2000 });
  console.log(`photo ${photo.reused ? "reuse" : "up"} ${photo.stored} (${photo.bytes ?? "exists"})`);

  const urlMap = new Map();
  for (const f of fundingFiles) {
    try {
      const res = await ensureAzure(container, f);
      urlMap.set(f, res.publicUrl);
      console.log(`  ${res.reused ? "reuse" : "up"} ${basename(f)}`);
    } catch (e) {
      console.log(`  FAIL ${f}: ${e.message}`);
      urlMap.set(f, f);
    }
  }

  const content_en = rewriteUrls(fundingContent, [...urlMap.entries()]);
  const content_hi = toHindiShell(content_en);

  // 1) HOD person + staff + assignment
  {
    const personPatch = {
      name_en: "Dr. Yogesh Jindal",
      name_hi: "डॉ. योगेश जिंदल",
      image_path: photo.stored,
      email: "admpac123@gmail.com",
      mobile: "01662255414 , 9416240941",
      specialization_en: null,
      specialization_hi: null,
      updated_at: now,
    };
    const { error } = await sb.from("ccshau_faculty_people").update(personPatch).eq("id", HOD_PERSON);
    if (error) throw error;
    console.log("OK faculty_people HOD renamed + photo");
  }
  {
    const { error } = await sb
      .from("ccshau_page_staff")
      .update({
        name_en: "Dr. Yogesh Jindal",
        name_hi: "डॉ. योगेश जिंदल",
        image_path: photo.stored,
        designation_en: "Incharge (MPAC)",
        designation_hi: "प्रभारी (एम.पी.ए.सी.)",
        email: "admpac123@gmail.com",
        mobile: "01662255414 , 9416240941",
        specialization_en: null,
        specialization_hi: null,
        updated_at: now,
      })
      .eq("id", HOD_STAFF);
    if (error) throw error;
    console.log("OK page_staff HOD");
  }
  {
    const { error } = await sb
      .from("ccshau_faculty_assignments")
      .update({
        designation_en: "Incharge (MPAC)",
        designation_hi: "प्रभारी (एम.पी.ए.सी.)",
        specialization_en: null,
        specialization_hi: null,
        member_type: "hod",
        is_active: true,
        updated_at: now,
      })
      .eq("id", HOD_ASG);
    if (error) throw error;
    console.log("OK assignment HOD");
  }

  // 2) Funding agencies sidebar
  {
    const { data: row, error } = await sb
      .from("ccshau_page_sidebar_items")
      .select("id")
      .eq("page_id", PAGE_ID)
      .eq("label_en", FUNDING_LABEL)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error(`Sidebar missing: ${FUNDING_LABEL}`);
    const { error: upErr } = await sb
      .from("ccshau_page_sidebar_items")
      .update({
        content_en,
        content_hi,
        label_hi: FUNDING_LABEL_HI,
        is_active: true,
        updated_at: now,
      })
      .eq("id", row.id);
    if (upErr) throw upErr;
    console.log(`OK ${FUNDING_LABEL} → content_en ${content_en.length}`);
  }

  const { data: person } = await sb
    .from("ccshau_faculty_people")
    .select("name_en,image_path,email")
    .eq("id", HOD_PERSON)
    .single();
  console.log("\nHOD now:", person);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
