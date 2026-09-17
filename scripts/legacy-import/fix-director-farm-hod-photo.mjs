/**
 * Upload Director Farm HOD photo (Dr. O. P. Bishnoi) to Azure and link it.
 * Source: https://hau.ac.in/storage/app/uploads/college-user/yAUZPF3Oo7tOc0LpdmjGmXGv1VbIKMXMxXthR0iD.jpeg
 * Usage: node fix-director-farm-hod-photo.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT = join(__dirname, "reports");
const CACHE = join(REPORT, "director-farm-hod-cache");
const CONFIRM = process.argv.includes("--confirm");
const LEGACY_IMG =
  "https://hau.ac.in/storage/app/uploads/college-user/yAUZPF3Oo7tOc0LpdmjGmXGv1VbIKMXMxXthR0iD.jpeg";
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

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function ensureAzureImage(containerClient, imageUrl) {
  const fileName = basename(new URL(imageUrl).pathname);
  const blobPath = `faculty/director-farm/hod/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) {
    console.log("azure already exists", publicUrl);
    return { stored, publicUrl };
  }

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
    if (!r.ok) throw new Error(`image fetch ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error("image too small");
    await writeFile(cachePath, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
  });
  console.log("uploaded", publicUrl, `(${buf.length} bytes)`);
  return { stored, publicUrl };
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

  const { data: page, error: pageErr } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,head_name_en,head_image_path")
    .eq("slug", "director-farm")
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page) throw new Error("director-farm page not found");
  console.log("page", page.id, page.title_en);

  const { data: assignments, error: aErr } = await sb
    .from("ccshau_faculty_assignments")
    .select("id,person_id,member_type,staff_slug,is_active,designation_en")
    .eq("page_id", page.id)
    .eq("is_active", true);
  if (aErr) throw new Error(aErr.message);
  console.log("assignments", assignments);

  const personIds = [...new Set((assignments || []).map((a) => a.person_id).filter(Boolean))];
  let people = [];
  if (personIds.length) {
    const { data, error } = await sb
      .from("ccshau_faculty_people")
      .select("id,name_en,image_path,email,is_active")
      .in("id", personIds);
    if (error) throw new Error(error.message);
    people = data || [];
  }
  console.log("people", people);

  // Fallback: find by name if no assignment
  if (!people.length) {
    const { data } = await sb
      .from("ccshau_faculty_people")
      .select("id,name_en,image_path,email,is_active")
      .ilike("name_en", "%Bishnoi%")
      .limit(20);
    people = data || [];
    console.log("people by name", people);
  }

  const hodAssignment =
    (assignments || []).find((a) => a.member_type === "hod") ||
    (assignments || [])[0];
  const hodPerson =
    (hodAssignment && people.find((p) => p.id === hodAssignment.person_id)) ||
    people.find((p) => /O\.?\s*P\.?\s*Bishnoi/i.test(p.name_en || "")) ||
    people[0];

  if (!hodPerson) {
    throw new Error("No faculty person found for Director Farm HOD (Dr. O. P. Bishnoi)");
  }
  console.log("target person", hodPerson);

  if (!CONFIRM) {
    console.log("dry-run only; pass --confirm to upload + write");
    return;
  }

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
    CONTAINER,
  );
  const { stored, publicUrl } = await ensureAzureImage(container, LEGACY_IMG);

  const { error: personErr } = await sb
    .from("ccshau_faculty_people")
    .update({
      image_path: stored,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hodPerson.id);
  if (personErr) throw new Error(`faculty_people: ${personErr.message}`);

  // Keep page head fields in sync for any layout that still reads them
  const { error: headErr } = await sb
    .from("ccshau_pages")
    .update({
      head_name_en: page.head_name_en || hodPerson.name_en || "Dr. O. P. Bishnoi",
      head_role_en: "Head of Department",
      head_image_path: stored,
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (headErr) console.warn("pages head update:", headErr.message);

  mkdirSync(REPORT, { recursive: true });
  writeFileSync(
    join(REPORT, "fix-director-farm-hod-photo.json"),
    JSON.stringify(
      {
        publicUrl,
        stored,
        personId: hodPerson.id,
        pageId: page.id,
        assignmentId: hodAssignment?.id ?? null,
      },
      null,
      2,
    ),
  );
  console.log("done", publicUrl);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
