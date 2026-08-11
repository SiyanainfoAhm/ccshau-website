/**
 * Deduplicate Dr. Naresh Kaushik on Bawal agriculture college faculty.
 * Keep the profile with specialization + details; mark as HOD; archive others.
 *
 * Usage:
 *   node fix-bawal-naresh-kaushik.mjs
 *   node fix-bawal-naresh-kaushik.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const PAGE_SLUG = "bawal-agriculture-college";

const { data: page, error: pageErr } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en")
  .eq("slug", PAGE_SLUG)
  .maybeSingle();
if (pageErr) throw new Error(pageErr.message);
if (!page) throw new Error(`page ${PAGE_SLUG} missing`);

const { data: staff, error: staffErr } = await sb
  .from("ccshau_page_staff")
  .select(
    "id, name_en, designation_en, member_type, staff_slug, specialization_en, detail_content_en, image_path, sort_order, is_active, email",
  )
  .eq("page_id", page.id)
  .order("sort_order");
if (staffErr) throw new Error(staffErr.message);

const naresh = (staff || []).filter((s) =>
  /naresh/i.test(s.name_en || "") && /kaushik/i.test(s.name_en || ""),
);

console.log("Page:", page.slug, page.id);
console.log("All Naresh Kaushik rows:");
for (const s of naresh) {
  console.log({
    id: s.id,
    name: s.name_en,
    type: s.member_type,
    desig: s.designation_en,
    slug: s.staff_slug,
    active: s.is_active,
    sort: s.sort_order,
    specLen: (s.specialization_en || "").length,
    detailLen: (s.detail_content_en || "").length,
    spec: s.specialization_en,
  });
}

function score(s) {
  return (
    (String(s.specialization_en || "").trim() ? 100 : 0) +
    (String(s.detail_content_en || "").trim()
      ? Math.min(50, String(s.detail_content_en).length / 500)
      : 0) +
    (s.image_path ? 5 : 0) +
    (s.is_active ? 1 : 0)
  );
}

const keep = [...naresh].sort((a, b) => score(b) - score(a))[0];
if (!keep) throw new Error("No Naresh Kaushik found");

const remove = naresh.filter((s) => s.id !== keep.id);

const summary = {
  mode: CONFIRM ? "apply" : "dry-run",
  page: { id: page.id, slug: page.slug },
  keep: {
    id: keep.id,
    name: keep.name_en,
    staff_slug: keep.staff_slug,
    beforeType: keep.member_type,
    specialization: keep.specialization_en,
    detailLen: (keep.detail_content_en || "").length,
  },
  remove: remove.map((s) => ({
    id: s.id,
    name: s.name_en,
    type: s.member_type,
    slug: s.staff_slug,
    spec: s.specialization_en,
    detailLen: (s.detail_content_en || "").length,
  })),
};

console.log("\nKEEP:", summary.keep);
console.log("REMOVE:", summary.remove);

if (!CONFIRM) {
  summary.status = "would-update";
  console.log("\nDry-run. Pass --confirm to apply.");
} else {
  // Promote keep to HOD, sort first
  const { error: keepErr } = await sb
    .from("ccshau_page_staff")
    .update({
      member_type: "hod",
      is_active: true,
      sort_order: 1,
      designation_en: keep.designation_en || "Principal",
    })
    .eq("id", keep.id);
  if (keepErr) throw new Error(`keep: ${keepErr.message}`);

  for (const s of remove) {
    const { error } = await sb
      .from("ccshau_page_staff")
      .update({ is_active: false })
      .eq("id", s.id);
    if (error) throw new Error(`deactivate ${s.id}: ${error.message}`);
  }

  // Re-number remaining active staff sort_order (keep HOD at 1)
  const { data: active } = await sb
    .from("ccshau_page_staff")
    .select("id, member_type, sort_order")
    .eq("page_id", page.id)
    .eq("is_active", true)
    .order("sort_order");

  let next = 2;
  for (const row of active || []) {
    if (row.id === keep.id) continue;
    const { error } = await sb
      .from("ccshau_page_staff")
      .update({
        sort_order: next++,
        member_type: row.member_type === "hod" ? "faculty" : row.member_type,
      })
      .eq("id", row.id);
    if (error) throw new Error(`resort ${row.id}: ${error.message}`);
  }

  summary.status = "updated";
  console.log("\nApplied: kept 1 as HOD, deactivated", remove.length);
}

mkdirSync(REPORT_DIR, { recursive: true });
const out = join(REPORT_DIR, "fix-bawal-naresh-kaushik-latest.json");
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log("Report:", out);
