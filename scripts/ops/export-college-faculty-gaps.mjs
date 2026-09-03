#!/usr/bin/env node
/**
 * Export faculty/staff Hindi gaps for a college (for Cursor/manual translation).
 *
 * Usage:
 *   node scripts/ops/export-college-faculty-gaps.mjs --college=college-of-agriculture-hisar
 *   node scripts/ops/export-college-faculty-gaps.mjs --college=college-of-agriculture-hisar --department=hisar-agricultural-extension-education
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const collegeSlug =
  process.argv.find((a) => a.startsWith("--college="))?.split("=")[1] ??
  "college-of-agriculture-hisar";
const deptSlug = process.argv.find((a) => a.startsWith("--department="))?.split("=")[1];

const FIELDS = [
  "name_en",
  "name_hi",
  "designation_en",
  "designation_hi",
  "specialization_en",
  "specialization_hi",
  "qualification_en",
  "qualification_hi",
  "experience_en",
  "experience_hi",
  "detail_content_en",
  "detail_content_hi",
];

function loadEnvFile(path) {
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

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function needsHi(en, hi) {
  if (!en?.trim()) return false;
  if (!hi?.trim()) return true;
  if (/\?{3,}/.test(hi)) return true;
  if (!/[\u0900-\u097F]/.test(hi)) return true;
  return false;
}

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", collegeSlug)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${collegeSlug}`);

  const { pageIds, pageById } = await resolveStaffPageIds(supabase, college.id, {
    publishedOnly: true,
  });

  let targetPageIds = pageIds;
  if (deptSlug) {
    const dept = [...pageById.values()].find((p) => p.slug === deptSlug);
    if (!dept) throw new Error(`Department not found: ${deptSlug}`);
    targetPageIds = [dept.id];
  }

  const { data: staff } = await supabase
    .from("ccshau_page_staff")
    .select(`id, page_id, staff_slug, member_type, sort_order, ${FIELDS.join(",")}`)
    .in("page_id", targetPageIds)
    .eq("is_active", true)
    .order("page_id")
    .order("sort_order");

  const rows = [];
  for (const row of staff ?? []) {
    const gaps = {};
    for (const en of [
      "name_en",
      "designation_en",
      "specialization_en",
      "qualification_en",
      "experience_en",
      "detail_content_en",
    ]) {
      const hi = en.replace("_en", "_hi");
      if (needsHi(row[en], row[hi])) gaps[hi] = row[en];
    }
    if (!Object.keys(gaps).length) continue;
    const dept = pageById.get(row.page_id);
    rows.push({
      id: row.id,
      staff_slug: row.staff_slug,
      department_slug: dept?.slug,
      department_title: dept?.title_en,
      name_en: row.name_en,
      gaps,
    });
  }

  const outDir = join(ROOT, "Documents/hindi-faculty");
  mkdirSync(outDir, { recursive: true });
  const suffix = deptSlug ? `-${deptSlug}` : "";
  const outPath = join(outDir, `${collegeSlug}${suffix}-pending.json`);

  const payload = {
    college: college.title_en,
    college_slug: collegeSlug,
    department_filter: deptSlug ?? null,
    exported_at: new Date().toISOString(),
    staff_count: rows.length,
    staff: rows,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Exported ${rows.length} staff with gaps → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
