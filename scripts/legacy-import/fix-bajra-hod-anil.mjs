/**
 * Probe + fix Bajra Section HOD Dr Anil Kumar specialization/details
 * from legacy MySQL → Supabase.
 *
 * Usage:
 *   node fix-bajra-hod-anil.mjs
 *   node fix-bajra-hod-anil.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");

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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

// Find Bajra department page
const { data: bajraPage } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, college_root_id")
  .ilike("slug", "%bajra%")
  .eq("status", "published");
console.log("Bajra pages:", bajraPage);

const page = (bajraPage || []).find((p) =>
  /bajra/i.test(p.slug || p.title_en),
);
if (!page) throw new Error("Bajra section page not found");

const { data: staff } = await sb
  .from("ccshau_page_staff")
  .select(
    "id, name_en, designation_en, member_type, staff_slug, specialization_en, detail_content_en, email, sort_order, is_active",
  )
  .eq("page_id", page.id)
  .order("sort_order");
console.log("\nStaff on Bajra page:");
for (const s of staff || []) {
  console.log({
    id: s.id,
    name: s.name_en,
    type: s.member_type,
    slug: s.staff_slug,
    desig: s.designation_en,
    specLen: (s.specialization_en || "").length,
    detailLen: (s.detail_content_en || "").length,
    active: s.is_active,
  });
}

const anil =
  (staff || []).find(
    (s) =>
      /anil/i.test(s.name_en || "") &&
      /kumar/i.test(s.name_en || "") &&
      (s.member_type === "hod" || /head|hod/i.test(s.designation_en || "")),
  ) ||
  (staff || []).find(
    (s) => /anil/i.test(s.name_en || "") && /kumar/i.test(s.name_en || ""),
  );

if (!anil) throw new Error("Dr Anil Kumar not found on Bajra staff list");
console.log("\nTarget staff:", anil);

// Extract legacy user id from staff_slug if present
let legacyUserId = null;
const m = String(anil.staff_slug || "").match(/legacy-user-(\d+)/i);
if (m) legacyUserId = Number(m[1]);

// Search legacy users
let legacyRows = [];
if (legacyUserId) {
  const [rows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization, qualification,
            other_activity, department_id_bk, role_id, status
     FROM users WHERE id = ?`,
    [legacyUserId],
  );
  legacyRows = rows;
} else {
  const [rows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization, qualification,
            other_activity, department_id_bk, role_id, status
     FROM users
     WHERE (first_name LIKE '%Anil%' OR CONCAT(first_name,' ',IFNULL(last_name,'')) LIKE '%Anil%Kumar%')
       AND (last_name LIKE '%Kumar%' OR first_name LIKE '%Kumar%')
     LIMIT 30`,
  );
  legacyRows = rows;
}

console.log("\nLegacy user matches:", legacyRows.length);
for (const r of legacyRows) {
  console.log({
    id: r.id,
    name: `${r.first_name} ${r.last_name || ""}`.trim(),
    email: r.email,
    desig: r.designation,
    deptBk: r.department_id_bk,
    role: r.role_id,
    specLen: (r.specialization || "").length,
    otherLen: (r.other_activity || "").length,
    qual: String(r.qualification || "").slice(0, 80),
  });
}

// Also search by email if staff has email
if (anil.email) {
  const [byEmail] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization, qualification,
            other_activity, department_id_bk, role_id
     FROM users WHERE email = ?`,
    [anil.email],
  );
  console.log("\nBy staff email:", byEmail.map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name || ""}`.trim(),
    specLen: (r.specialization || "").length,
    otherLen: (r.other_activity || "").length,
  })));
  if (byEmail.length && !legacyRows.some((r) => r.id === byEmail[0].id)) {
    legacyRows = [...byEmail, ...legacyRows];
  }
}

// Prefer the matched legacy user
const legacy =
  (legacyUserId && legacyRows.find((r) => r.id === legacyUserId)) ||
  legacyRows.find(
    (r) =>
      /anil/i.test(`${r.first_name} ${r.last_name}`) &&
      (r.specialization || r.other_activity),
  ) ||
  legacyRows[0];

if (!legacy) throw new Error("No legacy user found for Dr Anil Kumar");

console.log("\nChosen legacy user:", {
  id: legacy.id,
  name: `${legacy.first_name} ${legacy.last_name || ""}`.trim(),
  specializationPreview: String(legacy.specialization || "").slice(0, 200),
  otherActivityPreview: String(legacy.other_activity || "").slice(0, 300),
});

const patch = {};
if (legacy.specialization && String(legacy.specialization).trim()) {
  patch.specialization_en = String(legacy.specialization).trim();
}
if (legacy.other_activity && String(legacy.other_activity).trim()) {
  patch.detail_content_en = String(legacy.other_activity).trim();
}
if (legacy.qualification && String(legacy.qualification).trim()) {
  // only fill if empty? user asked specialization and details
}

const summary = {
  mode: CONFIRM ? "apply" : "dry-run",
  page: { id: page.id, slug: page.slug },
  staffId: anil.id,
  staffName: anil.name_en,
  legacyUserId: legacy.id,
  before: {
    specialization_en: anil.specialization_en,
    detail_content_en: anil.detail_content_en
      ? `${String(anil.detail_content_en).slice(0, 120)}…`
      : null,
  },
  patchKeys: Object.keys(patch),
  patchPreview: {
    specialization_en: patch.specialization_en
      ? String(patch.specialization_en).slice(0, 200)
      : null,
    detail_content_en: patch.detail_content_en
      ? String(patch.detail_content_en).slice(0, 300)
      : null,
  },
};

if (!Object.keys(patch).length) {
  summary.status = "no-legacy-content";
  console.log("\nNo specialization/other_activity in legacy to copy.");
} else if (!CONFIRM) {
  summary.status = "would-update";
  console.log("\nDry-run. Pass --confirm to update Supabase.");
} else {
  const { error } = await sb
    .from("ccshau_page_staff")
    .update(patch)
    .eq("id", anil.id);
  if (error) throw new Error(error.message);
  summary.status = "updated";
  console.log("\nUpdated staff row", anil.id);
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-bajra-hod-anil-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("Report:", out);

await conn.end();
