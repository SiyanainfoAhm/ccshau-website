/**
 * Phase 2 live import: legacy org structure → Supabase (metadata only, upsert, no wipe).
 *
 * Imports:
 *   - hau_college → ccshau_pages (college / office microsites)
 *   - hau_college_departments → department pages under {prefix}-department
 *   - users + hau_user_departments → ccshau_page_staff (+ college head_* for Deans)
 *
 * Staff roles imported: Dean (1), HOD (2), Teaching (3). Non-teaching/Other skipped.
 * Templates: type 1 academic + types 2–3 directorate → college_home;
 *            types 4–11 → office_portal roots (KVK/stations/admin — confirm later OK).
 * pg-studies: merge onto existing standard hub page (do not change page_type).
 *
 * Usage:
 *   node apply-phase2.mjs --confirm
 *
 * Env (MySQL): LEGACY_MYSQL_*
 * Env (Supabase): apps/web/.env.local — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");

const COLLEGE_HOME_LAYOUT_CONFIG = {
  hero: false,
  headOfficer: true,
  contacts: true,
  staff: false,
  gallery: false,
  newsTicker: false,
  studentCorner: false,
  mainContent: true,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

const DIRECTORATE_HOME_LAYOUT_CONFIG = {
  hero: true,
  headOfficer: true,
  contacts: true,
  staff: false,
  gallery: false,
  newsTicker: false,
  studentCorner: false,
  mainContent: true,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: true,
};

const DEPARTMENT_SUBSECTION_LAYOUT_CONFIG = {
  hero: true,
  headOfficer: false,
  contacts: false,
  staff: true,
  gallery: false,
  newsTicker: false,
  studentCorner: false,
  mainContent: true,
  leftSidebar: true,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

const DEFAULT_DEPARTMENT_SIDEBAR = [
  { labelEn: "Head of Department", labelHi: "विभागाध्यक्ष", sortOrder: 1 },
  { labelEn: "Faculty", labelHi: "संकाय", sortOrder: 2 },
  { labelEn: "Thrust Area", labelHi: "थ्रस्ट क्षेत्र", sortOrder: 3 },
  { labelEn: "Teaching and Research", labelHi: "शिक्षण और अनुसंधान", sortOrder: 4 },
  { labelEn: "Awards and Honors", labelHi: "पुरस्कार और सम्मान", sortOrder: 5 },
  { labelEn: "Infrastructure", labelHi: "अवसंरचना", sortOrder: 6 },
  { labelEn: "Alumni of the Department", labelHi: "विभाग के पूर्व छात्र", sortOrder: 7 },
  { labelEn: "Retiree of the Department", labelHi: "सेवानिवृत्त", sortOrder: 8 },
  { labelEn: "Course Structure", labelHi: "पाठ्यक्रम संरचना", sortOrder: 9 },
];

/** Prefer existing live pages when legacy slug differs. */
const SLUG_ALIASES = {
  "college-of-basic-sciences-humanities": "college-basic-sciences-humanities",
  "ic-college-of-home-science": "ic-college-of-community-science",
};

/** Prefer stable short prefixes already used in the CMS. */
const PREFIX_BY_TARGET_SLUG = {
  "college-of-agriculture-hisar": "hisar",
  "college-of-agriculture-kaul": "kaul",
  "college-of-agriculture-bawal": "bawal",
  "college-of-agricultural-engineering-and-technology": "coaet",
  "college-basic-sciences-humanities": "cbs",
  "basic-sciences-humanities": "humanities",
  "centre-of-food-science-technology": "cfst",
  "ic-college-of-community-science": "icccs",
  "college-of-fisheries-science": "cfs",
  "college-of-biotechnology": "cbt",
  "directorate-of-research": "dor",
  "directorate-of-extension-education": "dee",
  "directorate-of-students-welfare": "dsw",
  "pg-studies": "pg",
};

const STAFF_ROLES = new Set([1, 2, 3]); // Dean, HOD, Teaching

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

function loadSupabaseJs() {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("@supabase/supabase-js");
    } catch {
      /* next */
    }
  }
  throw new Error("Install @supabase/supabase-js in apps/web first.");
}

const { createClient } = loadSupabaseJs();

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeTitle(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function pendingPath(kind, legacyId, raw) {
  const base = basename(String(raw || "pending.bin").replace(/\\/g, "/")) || "pending.bin";
  return `legacy-pending/${kind}/${legacyId}/${base}`;
}

function isRealAssetPath(path) {
  if (!path) return false;
  const s = String(path);
  return !s.startsWith("legacy-pending/") && s !== "pending.bin";
}

function collegeBlueprint(type) {
  const t = Number(type);
  if (t === 1) {
    return {
      bucket: "academic_college",
      pageType: "college",
      layoutTemplate: "college_home",
      layoutConfig: COLLEGE_HOME_LAYOUT_CONFIG,
      underCollegesParent: true,
      seedDeptSection: true,
    };
  }
  if (t === 2 || t === 3) {
    return {
      bucket: "directorate",
      pageType: "college",
      layoutTemplate: "college_home",
      layoutConfig: DIRECTORATE_HOME_LAYOUT_CONFIG,
      underCollegesParent: false,
      seedDeptSection: true,
    };
  }
  if (t === 5) {
    return {
      bucket: "pg_studies",
      pageType: "standard", // keep existing /pages/pg-studies hub shape
      layoutTemplate: "office_portal",
      layoutConfig: null,
      underCollegesParent: false,
      seedDeptSection: true,
      preservePageType: true,
    };
  }
  return {
    bucket: "office_unit",
    pageType: "college",
    layoutTemplate: "office_portal",
    layoutConfig: null,
    underCollegesParent: false,
    seedDeptSection: true,
  };
}

function deriveShortPrefix(slug, legacyId) {
  if (PREFIX_BY_TARGET_SLUG[slug]) return PREFIX_BY_TARGET_SLUG[slug];
  const stop = new Set([
    "of",
    "and",
    "the",
    "for",
    "college",
    "directorate",
    "centre",
    "center",
    "krishi",
    "vigyan",
    "kendra",
    "regional",
    "research",
    "station",
  ]);
  const parts = String(slug || "")
    .split("-")
    .filter((p) => p && !stop.has(p));
  if (parts.length >= 2) {
    const acronym = parts.map((p) => p[0]).join("");
    if (acronym.length >= 2) return acronym.slice(0, 10);
  }
  const base = (parts[0] || `c${legacyId}`).slice(0, 12);
  return base || `c${legacyId}`;
}

function personName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || `Staff ${row.id}`;
}

function staffSlugFor(userId) {
  return `legacy-user-${userId}`;
}

async function main() {
  if (!CONFIRM) {
    console.error("Refusing to run without --confirm (live Supabase writes).");
    console.error("Usage: node apply-phase2.mjs --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const mysqlConfig = {
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "root",
    password: process.env.LEGACY_MYSQL_PASSWORD || "",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  };

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const summary = {
    startedAt: new Date().toISOString(),
    mode: "phase2-org-upsert",
    wipe: false,
    colleges: { inserted: 0, updated: 0, skipped: 0 },
    deptSections: { inserted: 0, updated: 0, skipped: 0 },
    departments: { inserted: 0, updated: 0, skipped: 0 },
    staff: { inserted: 0, updated: 0, skipped: 0 },
    deansHeadUpdated: 0,
    skippedStaffNoDept: 0,
    skippedStaffRole: 0,
    errors: [],
    maps: {
      collegeLegacyToPageId: {},
      deptLegacyToPageId: {},
    },
  };

  console.log("Phase 2 org import (upsert, no wipe)");
  console.log(`MySQL ${mysqlConfig.host}/${mysqlConfig.database}`);
  console.log(`Supabase ${url.replace(/^https?:\/\//, "").split("/")[0]}`);

  const conn = await mysql.createConnection(mysqlConfig);
  try {
    const { data: collegesParent, error: parentErr } = await supabase
      .from("ccshau_pages")
      .select("id")
      .eq("slug", "colleges")
      .maybeSingle();
    if (parentErr) throw new Error(`colleges parent: ${parentErr.message}`);
    if (!collegesParent?.id) {
      throw new Error('Missing "colleges" container page — run seeds first.');
    }

    const [collegeRows] = await conn.query(
      `SELECT college_id, college_name, college_slug, type, college_logo, college_banner, college_status
       FROM hau_college WHERE college_status = '1' ORDER BY type, college_id`,
    );

    const [departmentRows] = await conn.query(
      `SELECT id, department_name, college_id, department_description, department_status
       FROM hau_college_departments WHERE department_status = '1' ORDER BY college_id, id`,
    );

    const [staffRows] = await conn.query(
      `SELECT id, view_order, status, role_id, college_id, email, first_name, last_name,
              contact_number, designation, specialization, qualification, profile_image, department_id_bk
       FROM users WHERE status = '1' ORDER BY college_id, view_order, id`,
    );

    const [userDeptRows] = await conn.query(
      `SELECT user_id, college_id, department_id FROM hau_user_departments ORDER BY id`,
    );

    /** @type {Map<number, number[]>} */
    const deptsByUser = new Map();
    for (const row of userDeptRows) {
      const uid = Number(row.user_id);
      const did = row.department_id != null ? Number(row.department_id) : null;
      if (!did) continue;
      if (!deptsByUser.has(uid)) deptsByUser.set(uid, []);
      const list = deptsByUser.get(uid);
      if (!list.includes(did)) list.push(did);
    }

    /** college legacy id → { pageId, slug, prefix, blueprint } */
    const collegeState = new Map();

    // --- Colleges / units ---
    for (const row of collegeRows) {
      const legacyId = Number(row.college_id);
      const blueprint = collegeBlueprint(row.type);
      const legacySlug =
        row.college_slug || slugify(row.college_name) || `college-${legacyId}`;
      const targetSlug = SLUG_ALIASES[legacySlug] || legacySlug;
      const title = row.college_name || targetSlug;
      const prefix = deriveShortPrefix(targetSlug, legacyId);

      const logoPath = row.college_logo
        ? pendingPath("colleges", legacyId, row.college_logo)
        : null;
      const bannerPath = row.college_banner
        ? pendingPath("colleges", legacyId, row.college_banner)
        : null;

      try {
        const { data: existing, error: findErr } = await supabase
          .from("ccshau_pages")
          .select(
            "id, slug, page_type, layout_template, logo_image_path, featured_image_path, head_name_en, parent_id",
          )
          .eq("slug", targetSlug)
          .maybeSingle();
        if (findErr) throw new Error(findErr.message);

        const parentId = blueprint.underCollegesParent ? collegesParent.id : null;
        const payload = {
          slug: targetSlug,
          title_en: title,
          title_hi: null,
          excerpt_en: `${title} — CCS HAU.`,
          excerpt_hi: null,
          status: "published",
          published_at: new Date().toISOString(),
          office_cta_enabled: true,
          sort_order: legacyId,
        };

        // Do not force page_type change for pg-studies hub
        if (!blueprint.preservePageType || !existing) {
          payload.page_type = blueprint.pageType;
          payload.layout_template = blueprint.layoutTemplate;
          if (blueprint.layoutConfig) payload.layout_config = blueprint.layoutConfig;
        }

        if (blueprint.underCollegesParent) {
          payload.parent_id = parentId;
        } else if (!existing) {
          payload.parent_id = null;
        }

        if (logoPath) payload.logo_image_path = logoPath;
        if (bannerPath) payload.featured_image_path = bannerPath;

        let pageId;
        if (existing?.id) {
          const update = { ...payload };
          delete update.slug;
          if (
            existing.logo_image_path &&
            isRealAssetPath(existing.logo_image_path) &&
            logoPath
          ) {
            delete update.logo_image_path;
          }
          if (
            existing.featured_image_path &&
            isRealAssetPath(existing.featured_image_path) &&
            bannerPath
          ) {
            delete update.featured_image_path;
          }
          // Keep existing academic parent if already under colleges
          if (
            existing.parent_id &&
            blueprint.underCollegesParent &&
            existing.parent_id !== parentId
          ) {
            // leave parent as-is if already nested somewhere meaningful
            delete update.parent_id;
          }
          const { error } = await supabase
            .from("ccshau_pages")
            .update(update)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          pageId = existing.id;
          summary.colleges.updated += 1;
        } else {
          const { data: inserted, error } = await supabase
            .from("ccshau_pages")
            .insert(payload)
            .select("id")
            .single();
          if (error || !inserted?.id) throw new Error(error?.message || "insert failed");
          pageId = inserted.id;
          summary.colleges.inserted += 1;
        }

        // Ensure college_root_id = self for microsite roots (trigger may already set)
        if (!blueprint.preservePageType || blueprint.pageType === "college") {
          await supabase
            .from("ccshau_pages")
            .update({ college_root_id: pageId })
            .eq("id", pageId)
            .is("college_root_id", null);
        }

        collegeState.set(legacyId, {
          pageId,
          slug: targetSlug,
          prefix,
          blueprint,
          title,
        });
        summary.maps.collegeLegacyToPageId[String(legacyId)] = pageId;
      } catch (e) {
        summary.colleges.skipped += 1;
        summary.errors.push(`college ${legacyId} ${targetSlug}: ${e.message || e}`);
      }
    }
    console.log(
      `✓ colleges inserted=${summary.colleges.inserted} updated=${summary.colleges.updated} skipped=${summary.colleges.skipped}`,
    );

    // --- Department sections ---
    const sectionByCollegeLegacy = new Map();
    for (const [legacyId, state] of collegeState) {
      if (!state.blueprint.seedDeptSection) continue;
      try {
        const { data: children, error: childErr } = await supabase
          .from("ccshau_pages")
          .select("id, slug, title_en")
          .eq("parent_id", state.pageId);
        if (childErr) throw new Error(childErr.message);

        let section = (children || []).find(
          (c) =>
            /(^|-)department(s)?$/i.test(c.slug) ||
            /^(department|departments)$/i.test(String(c.title_en || "").trim()),
        );

        if (!section) {
          // Bawal-style bare "department" already covered; try preferred prefix slug
          const preferredSlug =
            state.slug === "college-of-agriculture-bawal"
              ? "department"
              : `${state.prefix}-department`;

          const { data: bySlug } = await supabase
            .from("ccshau_pages")
            .select("id, slug, title_en, parent_id")
            .eq("slug", preferredSlug)
            .maybeSingle();

          if (bySlug?.id && bySlug.parent_id === state.pageId) {
            section = bySlug;
          } else if (!bySlug) {
            const { data: inserted, error } = await supabase
              .from("ccshau_pages")
              .insert({
                slug: preferredSlug,
                title_en: "Department",
                title_hi: "विभाग",
                excerpt_en: `Academic departments at ${state.title}.`,
                content_en: `<p>Departments under ${state.title}.</p>`,
                parent_id: state.pageId,
                page_type: "standard",
                layout_template: "standard",
                status: "published",
                published_at: new Date().toISOString(),
                sort_order: 1,
                office_cta_enabled: true,
              })
              .select("id, slug, title_en")
              .single();
            if (error || !inserted) throw new Error(error?.message || "section insert failed");
            section = inserted;
            summary.deptSections.inserted += 1;
          } else {
            // Slug taken elsewhere — use unique slug
            const uniqueSlug = `${state.prefix}-department-${legacyId}`;
            const { data: inserted, error } = await supabase
              .from("ccshau_pages")
              .insert({
                slug: uniqueSlug,
                title_en: "Department",
                title_hi: "विभाग",
                excerpt_en: `Academic departments at ${state.title}.`,
                content_en: `<p>Departments under ${state.title}.</p>`,
                parent_id: state.pageId,
                page_type: "standard",
                layout_template: "standard",
                status: "published",
                published_at: new Date().toISOString(),
                sort_order: 1,
                office_cta_enabled: true,
              })
              .select("id, slug, title_en")
              .single();
            if (error || !inserted) throw new Error(error?.message || "section insert failed");
            section = inserted;
            summary.deptSections.inserted += 1;
          }
        } else {
          summary.deptSections.updated += 1;
        }

        sectionByCollegeLegacy.set(legacyId, section.id);
        state.sectionId = section.id;
        state.sectionSlug = section.slug;
      } catch (e) {
        summary.deptSections.skipped += 1;
        summary.errors.push(`dept-section college ${legacyId}: ${e.message || e}`);
      }
    }
    console.log(
      `✓ dept sections inserted=${summary.deptSections.inserted} reused/updated=${summary.deptSections.updated} skipped=${summary.deptSections.skipped}`,
    );

    // --- Departments ---
    for (const row of departmentRows) {
      const legacyDeptId = Number(row.id);
      const collegeLegacyId = Number(row.college_id);
      const state = collegeState.get(collegeLegacyId);
      const sectionId = sectionByCollegeLegacy.get(collegeLegacyId);
      if (!state || !sectionId) {
        summary.departments.skipped += 1;
        summary.errors.push(
          `dept ${legacyDeptId}: missing college/section for college_id=${collegeLegacyId}`,
        );
        continue;
      }

      const title = row.department_name || `Department ${legacyDeptId}`;
      const baseSlug = slugify(title) || `dept-${legacyDeptId}`;
      const preferredSlug = `${state.prefix}-${baseSlug}`.slice(0, 80);

      try {
        const { data: siblings, error: sibErr } = await supabase
          .from("ccshau_pages")
          .select("id, slug, title_en, content_en")
          .eq("parent_id", sectionId);
        if (sibErr) throw new Error(sibErr.message);

        const norm = normalizeTitle(title);
        let existing = (siblings || []).find(
          (s) => normalizeTitle(s.title_en) === norm || s.slug === preferredSlug,
        );

        if (!existing) {
          const { data: bySlug } = await supabase
            .from("ccshau_pages")
            .select("id, slug, title_en, parent_id, content_en")
            .eq("slug", preferredSlug)
            .maybeSingle();
          if (bySlug?.id) existing = bySlug;
        }

        const content =
          row.department_description && String(row.department_description).trim()
            ? String(row.department_description)
            : `<p>About ${title}.</p>`;

        const payload = {
          title_en: title,
          title_hi: null,
          excerpt_en: `${title} at ${state.title}.`,
          content_en: content,
          content_hi: null,
          parent_id: sectionId,
          page_type: "standard",
          layout_template: "office_portal",
          layout_config: DEPARTMENT_SUBSECTION_LAYOUT_CONFIG,
          status: "published",
          published_at: new Date().toISOString(),
          office_cta_enabled: true,
          sort_order: legacyDeptId,
        };

        let pageId;
        if (existing?.id) {
          const update = { ...payload };
          // Keep richer existing content if legacy description empty-ish
          if (
            existing.content_en &&
            String(existing.content_en).length > String(content).length + 40 &&
            (!row.department_description || String(row.department_description).trim().length < 40)
          ) {
            delete update.content_en;
          }
          const { error } = await supabase
            .from("ccshau_pages")
            .update(update)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          pageId = existing.id;
          summary.departments.updated += 1;
        } else {
          // Ensure unique slug
          let slug = preferredSlug;
          const { data: clash } = await supabase
            .from("ccshau_pages")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (clash?.id) slug = `${preferredSlug}-${legacyDeptId}`.slice(0, 80);

          const { data: inserted, error } = await supabase
            .from("ccshau_pages")
            .insert({ ...payload, slug })
            .select("id")
            .single();
          if (error || !inserted?.id) throw new Error(error?.message || "dept insert failed");
          pageId = inserted.id;
          summary.departments.inserted += 1;
        }

        summary.maps.deptLegacyToPageId[String(legacyDeptId)] = pageId;

        // Seed sidebar once
        const { count, error: countErr } = await supabase
          .from("ccshau_page_sidebar_items")
          .select("id", { count: "exact", head: true })
          .eq("page_id", pageId);
        if (countErr) throw new Error(countErr.message);
        if ((count ?? 0) === 0) {
          const { error: sideErr } = await supabase.from("ccshau_page_sidebar_items").insert(
            DEFAULT_DEPARTMENT_SIDEBAR.map((item) => ({
              page_id: pageId,
              side: "left",
              label_en: item.labelEn,
              label_hi: item.labelHi,
              sort_order: item.sortOrder,
              is_active: true,
            })),
          );
          if (sideErr) throw new Error(sideErr.message);
        }
      } catch (e) {
        summary.departments.skipped += 1;
        summary.errors.push(`dept ${legacyDeptId}: ${e.message || e}`);
      }
    }
    console.log(
      `✓ departments inserted=${summary.departments.inserted} updated=${summary.departments.updated} skipped=${summary.departments.skipped}`,
    );

    // --- Staff ---
    for (const row of staffRows) {
      const roleId = Number(row.role_id);
      if (!STAFF_ROLES.has(roleId)) {
        summary.skippedStaffRole += 1;
        continue;
      }

      const userId = Number(row.id);
      const name = personName(row);
      const designation =
        (row.designation && String(row.designation).trim()) ||
        (roleId === 1 ? "Dean" : roleId === 2 ? "Head of Department" : "Faculty");
      const memberType = roleId === 3 ? "faculty" : "hod";
      const imagePath = row.profile_image
        ? pendingPath("staff", userId, row.profile_image)
        : null;

      const collegeLegacyId = row.college_id != null ? Number(row.college_id) : null;
      const college = collegeLegacyId != null ? collegeState.get(collegeLegacyId) : null;

      // Deans → college head card (best-effort)
      if (roleId === 1 && college?.pageId) {
        try {
          const { data: collegePage } = await supabase
            .from("ccshau_pages")
            .select("id, head_name_en, head_image_path")
            .eq("id", college.pageId)
            .maybeSingle();
          const headUpdate = {
            head_name_en: name,
            head_role_en: designation,
            head_name_hi: null,
            head_role_hi: null,
          };
          if (imagePath) headUpdate.head_image_path = imagePath;
          if (
            collegePage?.head_image_path &&
            isRealAssetPath(collegePage.head_image_path) &&
            imagePath
          ) {
            delete headUpdate.head_image_path;
          }
          // Prefer first dean by view_order: only overwrite if empty or this is an update pass
          if (!collegePage?.head_name_en || collegePage.head_name_en === name) {
            const { error } = await supabase
              .from("ccshau_pages")
              .update(headUpdate)
              .eq("id", college.pageId);
            if (error) throw new Error(error.message);
            summary.deansHeadUpdated += 1;
          }
        } catch (e) {
          summary.errors.push(`dean head ${userId}: ${e.message || e}`);
        }
      }

      let deptIds = deptsByUser.get(userId) || [];
      if (deptIds.length === 0 && row.department_id_bk) {
        deptIds = [Number(row.department_id_bk)];
      }

      if (deptIds.length === 0) {
        summary.skippedStaffNoDept += 1;
        summary.staff.skipped += 1;
        continue;
      }

      for (const deptLegacyId of deptIds) {
        const pageId = summary.maps.deptLegacyToPageId[String(deptLegacyId)];
        if (!pageId) {
          summary.staff.skipped += 1;
          continue;
        }
        const sSlug = staffSlugFor(userId);
        const payload = {
          page_id: pageId,
          member_type: memberType,
          staff_slug: sSlug,
          name_en: name,
          name_hi: null,
          designation_en: designation.slice(0, 500),
          designation_hi: null,
          specialization_en: row.specialization || null,
          qualification_en: row.qualification || null,
          email: row.email || null,
          mobile: row.contact_number || null,
          image_path: imagePath,
          sort_order: Number(row.view_order) || userId,
          is_active: true,
        };

        try {
          const { data: existing, error: findErr } = await supabase
            .from("ccshau_page_staff")
            .select("id, image_path")
            .eq("page_id", pageId)
            .eq("staff_slug", sSlug)
            .maybeSingle();
          if (findErr) throw new Error(findErr.message);

          if (existing?.id) {
            const update = { ...payload };
            if (existing.image_path && isRealAssetPath(existing.image_path) && imagePath) {
              delete update.image_path;
            }
            const { error } = await supabase
              .from("ccshau_page_staff")
              .update(update)
              .eq("id", existing.id);
            if (error) throw new Error(error.message);
            summary.staff.updated += 1;
          } else {
            const { error } = await supabase.from("ccshau_page_staff").insert(payload);
            if (error) throw new Error(error.message);
            summary.staff.inserted += 1;
          }
        } catch (e) {
          summary.staff.skipped += 1;
          summary.errors.push(`staff ${userId} dept ${deptLegacyId}: ${e.message || e}`);
        }
      }
    }
    console.log(
      `✓ staff inserted=${summary.staff.inserted} updated=${summary.staff.updated} skipped=${summary.staff.skipped} (no-dept=${summary.skippedStaffNoDept}, role-skip=${summary.skippedStaffRole}, deans-head=${summary.deansHeadUpdated})`,
    );

    summary.finishedAt = new Date().toISOString();
    mkdirSync(REPORT_DIR, { recursive: true });
    const reportPath = join(REPORT_DIR, "phase2-apply-latest.json");
    writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log("\nPhase 2 complete (no wipe).");
    console.log(`Report: ${reportPath}`);
    if (summary.errors.length) {
      console.log(`Errors/skips logged: ${summary.errors.length}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
