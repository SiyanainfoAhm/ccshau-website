/**
 * Apply correct legacy profiles for Hisar section HODs.
 *
 * Usage:
 *   node fix-hisar-section-hods.mjs
 *   node fix-hisar-section-hods.mjs --confirm
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
  const qual = text.match(
    /Academic Qualification\s+(.+?)\s+Professional Qualification/i,
  );
  if (qual?.[1]) {
    // Prefer first degree phrase
    const phD = qual[1].match(
      /Doctorate of Philosophy[^,]*(?:,\s*University\s*\([^)]+\))?/i,
    );
    out.qualification = (phD?.[0] || qual[1].slice(0, 120)).trim();
  }
  return out;
}

const FIXES = [
  {
    label: "Pulses / Dr. Rajbir Garg",
    pageSlug: "hisar-pulses-section",
    staffSlug: "legacy-user-456",
    sourceUserId: 543,
    extractFromHtml: true,
  },
  {
    label: "Forages / Dr. Somveer Nimbal",
    pageSlug: "hisar-forages-section",
    staffSlug: "legacy-user-594",
    sourceUserId: 470,
  },
  {
    label: "Oil Seeds / Dr. Ramesh Kumar Goyal",
    pageSlug: "hisar-oil-seeds-section",
    staffSlug: "legacy-user-485",
    // No oilseeds-specific profile in legacy (shell empty; other Ramesh Goyal
    // rows are Horticulture Dean / Fruit Science — do not mis-attach).
    sourceUserId: null,
    skipReason:
      "Legacy oilseeds HOD shell (485) empty; no matching Oil Seeds profile for Dr. Ramesh Kumar Goyal (other Ramesh Goyal accounts are Hort/Dean Fruit Science).",
  },
];

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const summary = { mode: CONFIRM ? "apply" : "dry-run", results: [] };

for (const fix of FIXES) {
  console.log(`\n======== ${fix.label} ========`);
  const { data: page } = await sb
    .from("ccshau_pages")
    .select("id, slug")
    .eq("slug", fix.pageSlug)
    .maybeSingle();
  if (!page) throw new Error(`page ${fix.pageSlug} missing`);

  const { data: hod } = await sb
    .from("ccshau_page_staff")
    .select(
      "id, name_en, staff_slug, specialization_en, detail_content_en, qualification_en, image_path, email",
    )
    .eq("page_id", page.id)
    .eq("staff_slug", fix.staffSlug)
    .maybeSingle();
  if (!hod) throw new Error(`staff ${fix.staffSlug} missing`);

  const entry = {
    label: fix.label,
    hodId: hod.id,
    hodName: hod.name_en,
    before: {
      specialization_en: hod.specialization_en,
      detailLen: (hod.detail_content_en || "").length,
      qualification_en: hod.qualification_en,
      image_path: hod.image_path,
    },
  };

  if (!fix.sourceUserId) {
    entry.status = "skipped-no-legacy-profile";
    entry.skipReason = fix.skipReason;
    summary.results.push(entry);
    console.log("SKIP:", fix.skipReason);
    continue;
  }

  const [users] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization, qualification,
            other_activity, profile_image
     FROM users WHERE id = ?`,
    [fix.sourceUserId],
  );
  const src = users[0];
  if (!src) throw new Error(`legacy user ${fix.sourceUserId} missing`);

  const extracted = fix.extractFromHtml
    ? extractFromProfileHtml(src.other_activity)
    : {};

  const patch = {};
  const specialization =
    String(src.specialization || "").trim() || extracted.specialization || "";
  const qualification =
    String(src.qualification || "").trim() || extracted.qualification || "";
  if (specialization) patch.specialization_en = specialization;
  if (String(src.other_activity || "").trim()) {
    patch.detail_content_en = String(src.other_activity).trim();
  }
  if (qualification) patch.qualification_en = qualification;

  // Never invent a default staff photo.
  entry.source = {
    id: src.id,
    email: src.email,
    name: `${src.first_name} ${src.last_name || ""}`.trim(),
  };
  entry.extracted = extracted;
  entry.patchKeys = Object.keys(patch);
  entry.patchPreview = {
    specialization_en: patch.specialization_en || null,
    qualification_en: patch.qualification_en || null,
    detailLen: patch.detail_content_en
      ? String(patch.detail_content_en).length
      : 0,
  };
  entry.imageAction = "left-as-is (no default photo invented)";

  if (!Object.keys(patch).length) {
    entry.status = "no-content";
  } else if (!CONFIRM) {
    entry.status = "would-update";
  } else {
    const { error } = await sb
      .from("ccshau_page_staff")
      .update(patch)
      .eq("id", hod.id);
    if (error) throw new Error(error.message);
    const { data: after } = await sb
      .from("ccshau_page_staff")
      .select(
        "specialization_en, detail_content_en, qualification_en, image_path",
      )
      .eq("id", hod.id)
      .single();
    entry.status = "updated";
    entry.after = {
      specialization_en: after.specialization_en,
      detailLen: (after.detail_content_en || "").length,
      qualification_en: after.qualification_en,
      image_path: after.image_path,
    };
    console.log("UPDATED", entry.after);
  }

  summary.results.push(entry);
  console.log(JSON.stringify(entry, null, 2));
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-hisar-section-hods-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log("\nReport:", out);
await conn.end();
