/**
 * Fill Soil & Water Engineering HOD (Dr. Ajay Kumar Vashisht) specialization + details.
 * Legacy user 72 (hod-swe) is an empty shell; profile sourced from ORCID
 * https://orcid.org/0000-0002-5731-281X + Google Scholar research interests.
 * Photo from legacy user 43 (Dean account) local dump when available.
 *
 * Usage: node fix-swe-hod-ajay-vashisht.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";
const UPLOADS =
  process.env.LEGACY_STORAGE_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\uploads\\uploads";
const PHOTO_CANDIDATES = [
  join(UPLOADS, "college-user", "TPFjKGz7ycijRZPt01s8zfqOmJrZXho7sgQytNXC.jpeg"),
  join(
    "C:\\Jatin\\Projects\\CCHAU_mysql\\uploads\\uploads\\college-user",
    "TPFjKGz7ycijRZPt01s8zfqOmJrZXho7sgQytNXC.jpeg",
  ),
  join(
    "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public\\storage\\app\\uploads\\college-user",
    "TPFjKGz7ycijRZPt01s8zfqOmJrZXho7sgQytNXC.jpeg",
  ),
];

const HOD_ID = "814b2ec1-b97f-459e-8127-66b8da482d19";

const SPECIALIZATION =
  "Groundwater hydraulics, well hydraulics, spring hydrology; Irrigation and Drainage Engineering";

const QUALIFICATION = "Ph.D. (Soil and Water Engineering), Punjab Agricultural University, Ludhiana";

const DETAIL_HTML = `
<p><strong>ORCID:</strong> <a href="https://orcid.org/0000-0002-5731-281X" target="_blank" rel="noopener noreferrer">0000-0002-5731-281X</a></p>
<p><strong>Research areas:</strong> Groundwater hydraulics, well hydraulics, spring hydrology, irrigation and drainage engineering.</p>
<h3>Current role</h3>
<ul>
  <li>Dean, College of Agricultural Engineering &amp; Technology, CCS Haryana Agricultural University, Hisar (from April 2026)</li>
  <li>Head of the Department, Soil &amp; Water Engineering, COAE&amp;T, CCS HAU</li>
</ul>
<h3>Previous employment</h3>
<ul>
  <li>Professor (Irrigation and Drainage Engineering), College of Agricultural Engineering and Post Harvest Technology, Central Agricultural University, Gangtok (Jan 2010 – Apr 2026)</li>
</ul>
<h3>Education</h3>
<ul>
  <li>Ph.D. (Soil and Water Engineering), Punjab Agricultural University, Ludhiana (1999–2004)</li>
</ul>
<p>Selected publications and patents are listed on his <a href="https://orcid.org/0000-0002-5731-281X" target="_blank" rel="noopener noreferrer">ORCID profile</a>.</p>
`.trim();

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  return "image/jpeg";
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: before, error } = await sb
  .from("ccshau_page_staff")
  .select(
    "id, name_en, designation_en, member_type, specialization_en, qualification_en, detail_content_en, image_path, email",
  )
  .eq("id", HOD_ID)
  .single();
if (error) throw new Error(error.message);

const patch = {
  member_type: "hod",
  sort_order: 1,
  specialization_en: SPECIALIZATION,
  qualification_en: QUALIFICATION,
  detail_content_en: DETAIL_HTML,
};

const photoLocal = PHOTO_CANDIDATES.find((p) => existsSync(p)) || null;
const summary = {
  mode: CONFIRM ? "apply" : "dry-run",
  before,
  patch,
  photoLocal,
};

if (CONFIRM) {
  if (photoLocal && process.env.AZURE_STORAGE_CONNECTION_STRING) {
    const fileName = basename(photoLocal);
    const blobPath = `faculty/${HOD_ID}/${fileName}`;
    const container = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    ).getContainerClient(CONTAINER);
    const buf = await readFile(photoLocal);
    await container.getBlockBlobClient(blobPath).uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    });
    patch.image_path = `${CONTAINER}/${blobPath}`;
  }

  const { error: upErr } = await sb
    .from("ccshau_page_staff")
    .update(patch)
    .eq("id", HOD_ID);
  if (upErr) throw new Error(upErr.message);

  const { data: after } = await sb
    .from("ccshau_page_staff")
    .select(
      "name_en, designation_en, member_type, specialization_en, qualification_en, image_path, email",
    )
    .eq("id", HOD_ID)
    .single();
  summary.after = after;
}

mkdirSync(join(__dirname, "reports"), { recursive: true });
writeFileSync(
  join(__dirname, "reports", "fix-swe-hod-ajay-vashisht-latest.json"),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify({ mode: summary.mode, photoLocal, after: summary.after || null, patchKeys: Object.keys(patch) }, null, 2));
