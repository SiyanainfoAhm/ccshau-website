/**
 * Inspect legacy user 480 (anilbajra) vs HOD 663 and apply to Bajra HOD staff.
 *
 * Usage:
 *   node fix-bajra-hod-anil.mjs --from-480
 *   node fix-bajra-hod-anil.mjs --from-480 --confirm
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

const [u480rows] = await conn.query(
  `SELECT id, first_name, last_name, email, designation, specialization, qualification,
          other_activity, contact_number, address, profile_image, role_id, college_id, status
   FROM users WHERE id = 480`,
);
const u480 = u480rows[0];
if (!u480) throw new Error("legacy user 480 missing");

const [deptLinks] = await conn.query(
  `SELECT * FROM hau_user_departments WHERE user_id IN (480, 663)`,
);
console.log("Dept links 480/663:", deptLinks);

console.log("\nUser 480:", {
  name: `${u480.first_name} ${u480.last_name || ""}`.trim(),
  email: u480.email,
  designation: u480.designation,
  specialization: u480.specialization,
  qualification: u480.qualification,
  otherLen: String(u480.other_activity || "").length,
  otherPreview: String(u480.other_activity || "").slice(0, 400),
});

// Is 480 already a staff row somewhere?
const { data: staff480 } = await sb
  .from("ccshau_page_staff")
  .select("id, page_id, name_en, member_type, staff_slug, specialization_en, detail_content_en")
  .eq("staff_slug", "legacy-user-480");
console.log("\nSupabase staff for legacy-user-480:", staff480);

const HOD_ID = "b87b55df-2ff2-498c-ade6-4b89c6b5dac9";
const { data: hod } = await sb
  .from("ccshau_page_staff")
  .select("*")
  .eq("id", HOD_ID)
  .single();

const patch = {
  specialization_en: String(u480.specialization || "").trim() || null,
  detail_content_en: String(u480.other_activity || "").trim() || null,
};
if (u480.qualification && String(u480.qualification).trim()) {
  patch.qualification_en = String(u480.qualification).trim();
}

const summary = {
  mode: CONFIRM ? "apply" : "dry-run",
  reason:
    "HOD account users.id=663 (bajrasec@hau.ac.in) has empty specialization/other_activity; real profile is users.id=480 (anilbajra2009@gmail.com) linked historically as Bajra scientist.",
  hod: {
    id: hod.id,
    name: hod.name_en,
    staff_slug: hod.staff_slug,
    beforeSpec: hod.specialization_en,
    beforeDetailLen: (hod.detail_content_en || "").length,
  },
  source: {
    legacyUserId: 480,
    email: u480.email,
    designation: u480.designation,
    specialization: u480.specialization,
    detailLen: (u480.other_activity || "").length,
  },
  patchPreview: {
    specialization_en: patch.specialization_en,
    detailLen: (patch.detail_content_en || "").length,
    qualification_en: patch.qualification_en || null,
  },
};

if (!CONFIRM) {
  summary.status = "would-update";
  console.log("\nDry-run. Pass --confirm to apply.");
} else {
  const { error } = await sb
    .from("ccshau_page_staff")
    .update(patch)
    .eq("id", HOD_ID);
  if (error) throw new Error(error.message);
  summary.status = "updated";

  const { data: after } = await sb
    .from("ccshau_page_staff")
    .select("id, specialization_en, detail_content_en, qualification_en")
    .eq("id", HOD_ID)
    .single();
  summary.after = {
    specialization_en: after.specialization_en,
    detailLen: (after.detail_content_en || "").length,
    qualification_en: after.qualification_en,
  };
  console.log("\nUpdated HOD from legacy user 480.");
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-bajra-hod-anil-from-480-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("Report:", out);

await conn.end();
