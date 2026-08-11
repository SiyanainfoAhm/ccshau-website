/**
 * Fix Teaching Section HOD Dr. Surender Kumar Pahuja specialization/details
 * from legacy MySQL → Supabase (same pattern as Bajra HOD).
 *
 * Usage:
 *   node fix-teaching-hod-pahuja.mjs
 *   node fix-teaching-hod-pahuja.mjs --confirm
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

const { data: pages } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, college_root_id")
  .ilike("slug", "%teaching%")
  .eq("status", "published");
console.log("Teaching-ish pages:", pages);

const page = (pages || []).find(
  (p) =>
    p.slug === "hisar-teaching-section" ||
    /teaching section/i.test(p.title_en || ""),
);
if (!page) throw new Error("Teaching Section page not found");

const { data: staff } = await sb
  .from("ccshau_page_staff")
  .select(
    "id, name_en, designation_en, member_type, staff_slug, specialization_en, detail_content_en, qualification_en, email, sort_order, is_active",
  )
  .eq("page_id", page.id)
  .order("sort_order");

console.log("\nStaff on Teaching Section:");
for (const s of staff || []) {
  console.log({
    id: s.id,
    name: s.name_en,
    type: s.member_type,
    slug: s.staff_slug,
    desig: s.designation_en,
    email: s.email,
    specLen: (s.specialization_en || "").length,
    detailLen: (s.detail_content_en || "").length,
  });
}

const hod =
  (staff || []).find(
    (s) =>
      s.member_type === "hod" &&
      /surender|pahuja/i.test(s.name_en || ""),
  ) ||
  (staff || []).find((s) => /surender|pahuja/i.test(s.name_en || ""));

if (!hod) throw new Error("Dr. Surender Kumar Pahuja not found on Teaching Section staff");
console.log("\nTarget HOD:", hod);

let legacyUserId = null;
const m = String(hod.staff_slug || "").match(/legacy-user-(\d+)/i);
if (m) legacyUserId = Number(m[1]);

async function loadUser(id) {
  const [rows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization, qualification,
            other_activity, contact_number, role_id, college_id, status
     FROM users WHERE id = ?`,
    [id],
  );
  return rows[0] || null;
}

const shell = legacyUserId ? await loadUser(legacyUserId) : null;
console.log("\nShell legacy user:", shell && {
  id: shell.id,
  name: `${shell.first_name} ${shell.last_name || ""}`.trim(),
  email: shell.email,
  desig: shell.designation,
  specLen: (shell.specialization || "").length,
  otherLen: (shell.other_activity || "").length,
  qual: shell.qualification,
});

// Teaching Section dept
const [depts] = await conn.query(
  `SELECT id, college_id, department_name FROM hau_college_departments
   WHERE department_name LIKE '%Teaching%' AND college_id = 2`,
);
console.log("\nTeaching depts:", depts);
const deptId = depts[0]?.id;

const [deptLinks] = deptId
  ? await conn.query(
      `SELECT ud.user_id, ud.department_id, u.first_name, u.last_name, u.email, u.designation,
              CHAR_LENGTH(IFNULL(u.specialization,'')) spec_len,
              CHAR_LENGTH(IFNULL(u.other_activity,'')) other_len,
              u.specialization, u.qualification
       FROM hau_user_departments ud
       JOIN users u ON u.id = ud.user_id
       WHERE ud.department_id = ?
       ORDER BY other_len DESC, u.id`,
      [deptId],
    )
  : [[]];
console.log("\nUsers linked to Teaching Section:");
for (const r of deptLinks) {
  console.log({
    id: r.user_id,
    name: `${r.first_name} ${r.last_name || ""}`.trim(),
    email: r.email,
    desig: r.designation,
    specLen: r.spec_len,
    otherLen: r.other_len,
    spec: r.specialization,
    qual: r.qualification,
  });
}

// Name search for Pahuja / Surender
const [nameHits] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, role_id, status,
          specialization, qualification,
          CHAR_LENGTH(IFNULL(other_activity,'')) other_len
   FROM users
   WHERE first_name LIKE '%Pahuja%'
      OR last_name LIKE '%Pahuja%'
      OR first_name LIKE '%Surender%Pahuja%'
      OR CONCAT(IFNULL(first_name,''),' ',IFNULL(last_name,'')) LIKE '%Surender%Pahuja%'
      OR email LIKE '%pahuja%'
   ORDER BY other_len DESC`,
);
console.log("\nName/email Pahuja hits:", nameHits.map((r) => ({
  id: r.id,
  name: `${r.first_name} ${r.last_name || ""}`.trim(),
  email: r.email,
  desig: r.designation,
  role: r.role_id,
  spec: r.specialization,
  qual: r.qualification,
  otherLen: r.other_len,
})));

// Pick best source: prefer shell if it has content; else richest matching profile in dept / name hits
function score(u) {
  if (!u) return -1;
  return (
    (String(u.specialization || "").trim() ? 10 : 0) +
    (String(u.other_activity || "").trim() ? Math.min(50, String(u.other_activity).length / 1000) : 0) +
    (String(u.qualification || "").trim() ? 5 : 0)
  );
}

let source = null;
if (shell && score(shell) > 0) {
  source = shell;
} else {
  // Load full rows for candidates
  const candidateIds = [
    ...new Set([
      ...deptLinks.filter((r) => /surender|pahuja/i.test(`${r.first_name} ${r.last_name} ${r.email}`)).map((r) => r.user_id),
      ...nameHits.map((r) => r.id),
      ...deptLinks.filter((r) => r.other_len > 0 || (r.specialization || "").trim()).map((r) => r.user_id),
    ]),
  ];
  let best = null;
  let bestScore = -1;
  for (const id of candidateIds) {
    const u = await loadUser(id);
    if (!u) continue;
    const nameMatch = /surender|pahuja/i.test(
      `${u.first_name} ${u.last_name || ""} ${u.email || ""}`,
    );
    const s = score(u) + (nameMatch ? 100 : 0);
    console.log("candidate", id, "score", s, "nameMatch", nameMatch);
    if (s > bestScore) {
      bestScore = s;
      best = u;
    }
  }
  source = best;
}

if (!source || score(source) <= 0) {
  console.log("\nNo usable legacy profile content found.");
  await conn.end();
  process.exit(1);
}

console.log("\nChosen source:", {
  id: source.id,
  name: `${source.first_name} ${source.last_name || ""}`.trim(),
  email: source.email,
  designation: source.designation,
  specialization: source.specialization,
  qualification: source.qualification,
  otherLen: String(source.other_activity || "").length,
  otherPreview: String(source.other_activity || "").slice(0, 300),
});

const patch = {};
if (String(source.specialization || "").trim()) {
  patch.specialization_en = String(source.specialization).trim();
}
if (String(source.other_activity || "").trim()) {
  patch.detail_content_en = String(source.other_activity).trim();
}
if (String(source.qualification || "").trim()) {
  patch.qualification_en = String(source.qualification).trim();
}

const summary = {
  mode: CONFIRM ? "apply" : "dry-run",
  page: { id: page.id, slug: page.slug },
  hod: {
    id: hod.id,
    name: hod.name_en,
    staff_slug: hod.staff_slug,
    beforeSpec: hod.specialization_en,
    beforeDetailLen: (hod.detail_content_en || "").length,
  },
  source: {
    legacyUserId: source.id,
    email: source.email,
    specialization: source.specialization,
    qualification: source.qualification,
    detailLen: String(source.other_activity || "").length,
  },
  patchKeys: Object.keys(patch),
};

if (!Object.keys(patch).length) {
  summary.status = "no-content";
} else if (!CONFIRM) {
  summary.status = "would-update";
  console.log("\nDry-run. Pass --confirm to apply.");
} else {
  const { error } = await sb
    .from("ccshau_page_staff")
    .update(patch)
    .eq("id", hod.id);
  if (error) throw new Error(error.message);
  const { data: after } = await sb
    .from("ccshau_page_staff")
    .select("specialization_en, detail_content_en, qualification_en")
    .eq("id", hod.id)
    .single();
  summary.status = "updated";
  summary.after = {
    specialization_en: after.specialization_en,
    detailLen: (after.detail_content_en || "").length,
    qualification_en: after.qualification_en,
  };
  console.log("\nUpdated Teaching Section HOD.");
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-teaching-hod-pahuja-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("Report:", out);

await conn.end();
