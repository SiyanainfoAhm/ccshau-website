/**
 * Phase 3 — Backfill faculty_people + faculty_assignments from page_staff.
 * Match only on legacy-user-{id}, then email+same name. Name-only stays 1:1.
 *
 * Usage:
 *   node backfill-faculty-people.mjs
 *   node backfill-faculty-people.mjs --college=college-of-agriculture-hisar
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaffPageIds } from "./faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

const COLLEGE_SLUG = argValue("--college") || "college-of-agriculture-hisar";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

function loadFromWeb(name) {
  return createRequire(join(ROOT, "apps/web/package.json"))(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function legacyUserId(slug) {
  const m = String(slug || "").match(/^legacy-user-(\d+)$/i);
  return m ? m[1] : null;
}

function richness(row) {
  return (
    String(row.detail_content_en || "").length +
    (row.image_path ? 1000 : 0) +
    (row.email ? 100 : 0) +
    String(row.qualification_en || "").length
  );
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(supabase, preferred) {
  const base = slugify(preferred) || `faculty-${Date.now()}`;
  for (let i = 0; i < 30; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await supabase
      .from("ccshau_faculty_people")
      .select("id")
      .eq("global_slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", COLLEGE_SLUG)
    .eq("page_type", "college")
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college) throw new Error(`College not found: ${COLLEGE_SLUG}`);

  const { pageIds, includesRootStaff } = await resolveStaffPageIds(supabase, college.id);
  if (!pageIds.length) {
    console.log("No staff-bearing pages.");
    return;
  }
  if (includesRootStaff) {
    console.log("Including root page staff (research-station style).");
  }

  const { data: staffRows, error: staffErr } = await supabase
    .from("ccshau_page_staff")
    .select("*")
    .in("page_id", pageIds)
    .eq("is_active", true);
  if (staffErr) throw new Error(staffErr.message);

  const { data: existingLinks } = await supabase
    .from("ccshau_faculty_assignments")
    .select("source_staff_id")
    .in("page_id", pageIds);
  const linked = new Set(
    (existingLinks || []).map((row) => row.source_staff_id).filter(Boolean),
  );

  const pending = (staffRows || []).filter((row) => !linked.has(row.id));
  const grouped = [];
  const used = new Set();

  const byLegacy = new Map();
  for (const row of pending) {
    const id = legacyUserId(row.staff_slug);
    if (!id) continue;
    if (!byLegacy.has(id)) byLegacy.set(id, []);
    byLegacy.get(id).push(row);
  }
  for (const group of byLegacy.values()) {
    grouped.push(group);
    for (const row of group) used.add(row.id);
  }

  const byEmailName = new Map();
  for (const row of pending) {
    if (used.has(row.id)) continue;
    const email = normalizeEmail(row.email);
    const name = normalizeName(row.name_en);
    if (!email || !name) continue;
    const key = `${email}::${name}`;
    if (!byEmailName.has(key)) byEmailName.set(key, []);
    byEmailName.get(key).push(row);
  }
  for (const group of byEmailName.values()) {
    if (group.length < 2) continue;
    grouped.push(group);
    for (const row of group) used.add(row.id);
  }

  for (const row of pending) {
    if (used.has(row.id)) continue;
    grouped.push([row]);
  }

  const summary = {
    college: college.title_en,
    pending: pending.length,
    groups: grouped.length,
    peopleCreated: 0,
    peopleReused: 0,
    assignmentsCreated: 0,
    skipped: 0,
  };

  for (const group of grouped) {
    const canonical = group.slice().sort((a, b) => richness(b) - richness(a))[0];
    const legacyId = legacyUserId(canonical.staff_slug) || group.map((r) => legacyUserId(r.staff_slug)).find(Boolean) || null;
    const email = normalizeEmail(canonical.email);

    let person = null;
    if (legacyId) {
      const { data } = await supabase
        .from("ccshau_faculty_people")
        .select("*")
        .eq("legacy_user_id", legacyId)
        .maybeSingle();
      person = data;
    }
    if (!person && email) {
      const { data } = await supabase
        .from("ccshau_faculty_people")
        .select("*")
        .ilike("email", email)
        .limit(2);
      if (data?.length === 1 && normalizeName(data[0].name_en) === normalizeName(canonical.name_en)) {
        person = data[0];
      }
    }

    if (!person) {
      const globalSlug = await uniqueSlug(supabase, canonical.staff_slug || canonical.name_en);
      const { data, error } = await supabase
        .from("ccshau_faculty_people")
        .insert({
          global_slug: globalSlug,
          name_en: canonical.name_en,
          name_hi: canonical.name_hi,
          image_path: canonical.image_path,
          email,
          mobile: canonical.mobile,
          qualification_en: canonical.qualification_en,
          qualification_hi: canonical.qualification_hi,
          experience_en: canonical.experience_en,
          experience_hi: canonical.experience_hi,
          specialization_en: canonical.specialization_en,
          specialization_hi: canonical.specialization_hi,
          detail_content_en: canonical.detail_content_en,
          detail_content_hi: canonical.detail_content_hi,
          legacy_user_id: legacyId,
          is_active: true,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      person = data;
      summary.peopleCreated += 1;
    } else {
      summary.peopleReused += 1;
    }

    for (const row of group) {
      const { data: existing } = await supabase
        .from("ccshau_faculty_assignments")
        .select("id")
        .eq("person_id", person.id)
        .eq("page_id", row.page_id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("ccshau_faculty_assignments")
          .update({
            source_staff_id: row.id,
            designation_en: row.designation_en,
            designation_hi: row.designation_hi,
            member_type: row.member_type || "faculty",
            staff_slug: row.staff_slug,
            sort_order: row.sort_order ?? 0,
            is_active: row.is_active !== false,
          })
          .eq("id", existing.id);
        summary.skipped += 1;
        continue;
      }
      const { error } = await supabase.from("ccshau_faculty_assignments").insert({
        person_id: person.id,
        page_id: row.page_id,
        source_staff_id: row.id,
        designation_en: row.designation_en,
        designation_hi: row.designation_hi,
        specialization_en: null,
        specialization_hi: null,
        member_type: row.member_type || "faculty",
        staff_slug: row.staff_slug,
        sort_order: row.sort_order ?? 0,
        is_active: row.is_active !== false,
      });
      if (error) throw new Error(`${row.name_en} / ${row.page_id}: ${error.message}`);
      summary.assignmentsCreated += 1;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
