/**
 * Fix ICCCS Extension Education HOD Dr. Monika:
 * - sort HOD first
 * - backfill specialization + details from legacy
 *
 * Usage:
 *   node fix-icccs-monika-hod.mjs
 *   node fix-icccs-monika-hod.mjs --confirm
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

const PAGE_SLUG = "science-extension-education-and-communication-management";

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

function htmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFromProfileHtml(html) {
  const text = htmlToText(html);
  const out = {};
  const spec = text.match(
    /Research Interest\/?\s*Specialization\s+(.+?)\s+Teaching Interest/i,
  );
  if (spec?.[1]) out.specialization = spec[1].trim();
  if (!out.specialization) {
    const alt = text.match(
      /(?:Area of )?Specialization[:\s]+([^|]{5,160}?)(?:\s+Teaching|\s+Career|\s+Membership|$)/i,
    );
    if (alt?.[1]) out.specialization = alt[1].trim();
  }
  const qual = text.match(
    /Academic Qualification\s+(.+?)\s+Professional Qualification/i,
  );
  if (qual?.[1]) {
    const phD = qual[1].match(/Ph\.?\s*D[^,]*/i);
    out.qualification = (phD?.[0] || qual[1].slice(0, 120)).trim();
  }
  return out;
}

function scoreUser(u) {
  if (!u) return -1;
  return (
    (String(u.specialization || "").trim() ? 10 : 0) +
    (String(u.other_activity || "").trim()
      ? Math.min(50, String(u.other_activity).length / 1000)
      : 0) +
    (String(u.qualification || "").trim() ? 5 : 0)
  );
}

const { data: page } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en")
  .eq("slug", PAGE_SLUG)
  .maybeSingle();
if (!page) throw new Error(`page ${PAGE_SLUG} missing`);

const { data: staff } = await sb
  .from("ccshau_page_staff")
  .select(
    "id, name_en, designation_en, member_type, staff_slug, specialization_en, detail_content_en, qualification_en, image_path, sort_order, is_active, email",
  )
  .eq("page_id", page.id)
  .eq("is_active", true)
  .order("sort_order");

console.log("Page:", page.slug);
console.log("Active staff:");
for (const s of staff || []) {
  console.log({
    sort: s.sort_order,
    name: s.name_en,
    type: s.member_type,
    slug: s.staff_slug,
    desig: s.designation_en,
    specLen: (s.specialization_en || "").length,
    detailLen: (s.detail_content_en || "").length,
  });
}

const hod =
  (staff || []).find(
    (s) => s.member_type === "hod" && /monika/i.test(s.name_en || ""),
  ) ||
  (staff || []).find((s) => /monika/i.test(s.name_en || ""));

if (!hod) throw new Error("Dr. Monika HOD not found");
console.log("\nTarget HOD:", {
  id: hod.id,
  name: hod.name_en,
  slug: hod.staff_slug,
  email: hod.email,
});

let shellId = null;
const m = String(hod.staff_slug || "").match(/legacy-user-(\d+)/i);
if (m) shellId = Number(m[1]);

async function loadUser(id) {
  const [rows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization, qualification,
            other_activity, profile_image, role_id, status
     FROM users WHERE id = ?`,
    [id],
  );
  return rows[0] || null;
}

const shell = shellId ? await loadUser(shellId) : null;
console.log(
  "\nShell user:",
  shell && {
    id: shell.id,
    name: `${shell.first_name} ${shell.last_name || ""}`.trim(),
    email: shell.email,
    spec: shell.specialization,
    otherLen: String(shell.other_activity || "").length,
  },
);

// Dept lookup
const [depts] = await conn.query(
  `SELECT id, college_id, department_name FROM hau_college_departments
   WHERE department_name LIKE '%Extension Education%'
     AND (department_name LIKE '%Communication%' OR department_name LIKE '%EECM%')
   ORDER BY id`,
);
console.log("\nMatching depts:", depts);

let deptUsers = [];
if (depts.length) {
  const [rows] = await conn.query(
    `SELECT ud.user_id, u.first_name, u.last_name, u.email, u.designation,
            u.specialization, CHAR_LENGTH(IFNULL(u.other_activity,'')) other_len
     FROM hau_user_departments ud
     JOIN users u ON u.id = ud.user_id
     WHERE ud.department_id IN (?)
     ORDER BY other_len DESC`,
    [depts.map((d) => d.id)],
  );
  deptUsers = rows;
  console.log(
    "Dept users named Monika:",
    deptUsers.filter((r) => /monika/i.test(`${r.first_name} ${r.last_name}`)),
  );
}

const [nameHits] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, specialization, qualification,
          CHAR_LENGTH(IFNULL(other_activity,'')) other_len
   FROM users
   WHERE first_name LIKE '%Monika%' OR last_name LIKE '%Monika%' OR email LIKE '%monika%'
   ORDER BY other_len DESC
   LIMIT 40`,
);
console.log(
  "\nMonika name hits:",
  nameHits.map((u) => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name || ""}`.trim(),
    email: u.email,
    desig: u.designation,
    spec: u.specialization,
    otherLen: u.other_len,
  })),
);

const candidateIds = [
  ...new Set([
    ...(shell ? [shell.id] : []),
    ...deptUsers
      .filter((r) => /monika/i.test(`${r.first_name} ${r.last_name} ${r.email}`))
      .map((r) => r.user_id),
    ...nameHits
      .filter((u) => /monika/i.test(`${u.first_name} ${u.last_name} ${u.email}`))
      .map((u) => u.id),
  ]),
];

let best = null;
let bestScore = -1;
for (const id of candidateIds) {
  const u = await loadUser(id);
  if (!u) continue;
  const nameMatch = /monika/i.test(
    `${u.first_name} ${u.last_name || ""} ${u.email || ""}`,
  );
  if (!nameMatch) continue;
  const s = scoreUser(u) + (nameMatch ? 100 : 0);
  console.log("candidate", id, "score", s, {
    email: u.email,
    spec: u.specialization,
    otherLen: String(u.other_activity || "").length,
  });
  if (s > bestScore) {
    bestScore = s;
    best = u;
  }
}

const summary = {
  mode: CONFIRM ? "apply" : "dry-run",
  page: { id: page.id, slug: page.slug },
  hod: {
    id: hod.id,
    name: hod.name_en,
    staff_slug: hod.staff_slug,
    beforeSort: hod.sort_order,
    beforeSpec: hod.specialization_en,
    beforeDetailLen: (hod.detail_content_en || "").length,
  },
};

const patch = {
  member_type: "hod",
  sort_order: 1,
};

if (best && scoreUser(best) > 0) {
  const extracted = extractFromProfileHtml(best.other_activity);
  const specialization =
    String(best.specialization || "").trim() || extracted.specialization || "";
  const qualification =
    String(best.qualification || "").trim() || extracted.qualification || "";
  if (specialization) patch.specialization_en = specialization;
  if (String(best.other_activity || "").trim()) {
    patch.detail_content_en = String(best.other_activity).trim();
  }
  if (qualification) patch.qualification_en = qualification;
  summary.source = {
    legacyUserId: best.id,
    email: best.email,
    name: `${best.first_name} ${best.last_name || ""}`.trim(),
    specialization: best.specialization,
    extracted,
    detailLen: String(best.other_activity || "").length,
  };
} else {
  summary.source = null;
  summary.note = "No rich legacy profile found for Monika; will still sort HOD first";
}

summary.patchKeys = Object.keys(patch);

if (!CONFIRM) {
  summary.status = "would-update";
  console.log("\nDry-run. Pass --confirm to apply.");
} else {
  const { error } = await sb
    .from("ccshau_page_staff")
    .update(patch)
    .eq("id", hod.id);
  if (error) throw new Error(error.message);

  // Push other active staff sort_order after HOD
  const others = (staff || []).filter((s) => s.id !== hod.id);
  let next = 2;
  for (const row of others.sort((a, b) => a.sort_order - b.sort_order)) {
    const nextType = row.member_type === "hod" ? "faculty" : row.member_type;
    const { error: e2 } = await sb
      .from("ccshau_page_staff")
      .update({ sort_order: next++, member_type: nextType })
      .eq("id", row.id);
    if (e2) throw new Error(e2.message);
  }

  const { data: after } = await sb
    .from("ccshau_page_staff")
    .select(
      "id, name_en, member_type, sort_order, specialization_en, detail_content_en, qualification_en",
    )
    .eq("id", hod.id)
    .single();
  summary.status = "updated";
  summary.after = {
    member_type: after.member_type,
    sort_order: after.sort_order,
    specialization_en: after.specialization_en,
    detailLen: (after.detail_content_en || "").length,
    qualification_en: after.qualification_en,
  };
  console.log("\nUpdated:", summary.after);
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-icccs-monika-hod-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("Report:", out);
await conn.end();
