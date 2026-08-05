/**
 * Legacy hau_db → CCSHAU CMS import DRY-RUN
 *
 * Default mode: read-only MySQL scan + mapping report. Never writes to Supabase.
 * Live apply is intentionally not implemented in this script yet.
 *
 * Usage:
 *   cd scripts/legacy-import
 *   npm install
 *   npm run dry-run
 *
 * Optional env:
 *   LEGACY_MYSQL_HOST=127.0.0.1
 *   LEGACY_MYSQL_PORT=3306
 *   LEGACY_MYSQL_USER=root
 *   LEGACY_MYSQL_PASSWORD=
 *   LEGACY_MYSQL_DATABASE=hau_db
 *   LEGACY_UPLOADS_ROOT=C:\path\to\uploads   (optional until client provides files)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, "reports");

const config = {
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "root",
  password: process.env.LEGACY_MYSQL_PASSWORD || "",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  uploadsRoot: process.env.LEGACY_UPLOADS_ROOT || "",
};

const NEWS_CATEGORY_IDS = [5, 28, 29]; // News, Departmental news, Latest News
const JOBS_CATEGORY_ID = 4;
const TENDER_CATEGORY_ID = 3;
const MEDIA_CLIPS_CATEGORY_ID = 7;
const QUICK_LINKS_CATEGORY_ID = 6;

/** Legacy hau_college.type → our microsite / org bucket */
const COLLEGE_TYPE_MAP = {
  1: { bucket: "academic_college", target: "ccshau_pages (college / academic)" },
  2: { bucket: "directorate", target: "ccshau_pages (college / directorate)" },
  3: { bucket: "directorate", target: "ccshau_pages (college / directorate)" },
  4: { bucket: "kvk", target: "ccshau_pages (college / office portal — confirm)" },
  5: { bucket: "pg_studies", target: "ccshau_pages (special hub — confirm)" },
  6: { bucket: "campus_school", target: "ccshau_pages (office — confirm)" },
  7: { bucket: "programme", target: "ccshau_pages (office — confirm)" },
  8: { bucket: "centre", target: "ccshau_pages (office — confirm)" },
  9: { bucket: "research_station", target: "ccshau_pages (office — confirm)" },
  10: { bucket: "admin_unit", target: "ccshau_pages (office — confirm)" },
  11: { bucket: "support_office", target: "ccshau_pages (office — confirm)" },
};

const STAFF_ROLE_MAP = {
  1: { legacy: "Dean", memberType: "hod", target: "ccshau_page_staff" },
  2: { legacy: "HOD", memberType: "hod", target: "ccshau_page_staff" },
  3: { legacy: "Teaching Staff", memberType: "faculty", target: "ccshau_page_staff" },
  4: { legacy: "Non Teaching Staff", memberType: "faculty", target: "ccshau_page_staff (optional)" },
  5: { legacy: "Other", memberType: "faculty", target: "ccshau_page_staff (review)" },
};

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

function resolveUploadCandidates(rawPath) {
  if (!rawPath) return [];
  const cleaned = String(rawPath).replace(/^\/+/, "").replace(/\\/g, "/");
  const base = path.basename(cleaned);
  const candidates = [
    cleaned,
    base,
    path.posix.join("uploads", cleaned),
    path.posix.join("uploads", base),
    path.posix.join("public", cleaned),
    path.posix.join("public", "uploads", cleaned),
    path.posix.join("public", "pages-pdf", base),
    path.posix.join("uploads", "downloads-pdf", base),
    path.posix.join("uploads", "pages-pdf", base),
  ];
  return [...new Set(candidates)];
}

function fileExistsOnDisk(rawPath) {
  if (!config.uploadsRoot) {
    return { status: "uploads_root_not_set", matched: null };
  }
  if (!rawPath) return { status: "no_file_ref", matched: null };

  for (const rel of resolveUploadCandidates(rawPath)) {
    const abs = path.join(config.uploadsRoot, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return { status: "found", matched: abs };
    }
  }
  return { status: "missing", matched: null };
}

function mapSocial(rows) {
  const out = {
    social_twitter_url: null,
    social_facebook_url: null,
    social_youtube_url: null,
    social_blogger_url: null,
    social_instagram_url: null,
  };
  for (const row of rows) {
    if (Number(row.status) !== 1) continue;
    const name = String(row.social_name || "").toLowerCase();
    const link = row.social_link || null;
    if (!link) continue;
    if (name.includes("twitter") || name.includes("x.com")) out.social_twitter_url = link;
    else if (name.includes("facebook")) out.social_facebook_url = link;
    else if (name.includes("youtube")) out.social_youtube_url = link;
    else if (name.includes("blog")) out.social_blogger_url = link;
    else if (name.includes("instagram")) out.social_instagram_url = link;
  }
  return out;
}

function mapBanner(row) {
  const fileCheck = fileExistsOnDisk(row.slider_images);
  return {
    legacyId: row.id,
    target: "ccshau_banners",
    title: row.slider_title || `Banner ${row.id}`,
    image_path: row.slider_images || null,
    target_url: row.slider_link || null,
    alt_text: row.slider_title || null,
    priority: Number(row.slider_order || 0),
    is_active: Number(row.status) === 1,
    file: fileCheck,
  };
}

function mapDownload(row) {
  const fileCheck = fileExistsOnDisk(row.download_file);
  const fileName = path.basename(String(row.download_file || "file"));
  return {
    legacyId: row.id,
    target: "ccshau_downloads",
    title_en: row.title,
    title_hi: null,
    file_path: row.download_file,
    file_name: fileName,
    status: Number(row.status) === 1 ? "published" : "archived",
    published_at: row.created_at,
    file: fileCheck,
  };
}

function mapNews(row, categoryName) {
  const fileCheck = fileExistsOnDisk(row.notification_file);
  const slugBase =
    row.notification_slug ||
    slugify(row.notification_name) ||
    `notice-${row.id}`;
  return {
    legacyId: row.id,
    target: "ccshau_news",
    slug: `${slugBase}-${row.id}`,
    title_en: row.notification_name,
    title_hi: null,
    body_en: null,
    notice_type: categoryName?.toLowerCase().includes("job") ? "notice" : "news",
    category: categoryName || null,
    status: Number(row.status) === 1 ? "published" : "archived",
    published_at: row.created_at,
    is_featured: String(row.is_featured) === "1",
    attachment: row.notification_file || row.notification_link || null,
    file: fileCheck,
  };
}

function mapTender(row) {
  const fileCheck = fileExistsOnDisk(row.notification_file);
  const slugBase =
    row.notification_slug ||
    slugify(row.notification_name) ||
    `tender-${row.id}`;
  return {
    legacyId: row.id,
    target: "ccshau_tenders",
    slug: `${slugBase}-${row.id}`,
    title_en: row.notification_name,
    title_hi: null,
    description_en: null,
    category: "Tender",
    status: Number(row.status) === 1 ? "open" : "archived",
    published_at: row.created_at,
    document: row.notification_file || null,
    file: fileCheck,
  };
}

function mapCollege(row) {
  const type = Number(row.type || 0);
  const typeMeta = COLLEGE_TYPE_MAP[type] || {
    bucket: `unknown_type_${type}`,
    target: "ccshau_pages (review)",
  };
  return {
    legacyId: row.college_id,
    target: typeMeta.target,
    bucket: typeMeta.bucket,
    legacyType: type,
    title_en: row.college_name,
    title_hi: null,
    slug: row.college_slug || slugify(row.college_name) || `college-${row.college_id}`,
    status: String(row.college_status) === "1" ? "published" : "archived",
    logo: row.college_logo || null,
    banner: row.college_banner || null,
    logoFile: fileExistsOnDisk(row.college_logo),
    bannerFile: fileExistsOnDisk(row.college_banner),
  };
}

function mapDepartment(row, collegeById) {
  const college = collegeById.get(Number(row.college_id));
  return {
    legacyId: row.id,
    target: "ccshau_pages (office_portal department under college)",
    title_en: row.department_name,
    title_hi: null,
    collegeLegacyId: row.college_id,
    collegeTitle: college?.college_name || null,
    collegeSlug: college?.college_slug || null,
    status: String(row.department_status) === "1" ? "published" : "archived",
    description: row.department_description || null,
  };
}

function mapStaffUser(row, roleById, collegeById) {
  const roleId = Number(row.role_id);
  const roleMeta = STAFF_ROLE_MAP[roleId] || {
    legacy: `role_${roleId}`,
    memberType: "faculty",
    target: "ccshau_page_staff (review)",
  };
  const college = collegeById.get(Number(row.college_id));
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return {
    legacyId: row.id,
    target: roleMeta.target,
    memberType: roleMeta.memberType,
    legacyRole: roleById.get(roleId) || roleMeta.legacy,
    name_en: name || row.email || `user-${row.id}`,
    name_hi: null,
    email: row.email || null,
    designation_en: row.designation || null,
    specialization_en: row.specialization || null,
    qualification_en: row.qualification || null,
    collegeLegacyId: row.college_id,
    collegeTitle: college?.college_name || null,
    sort_order: Number(row.view_order || 0),
    status: String(row.status) === "1" ? "active" : "inactive",
    photo: row.profile_image || null,
    photoFile: fileExistsOnDisk(row.profile_image),
  };
}

function mapCmsAdmin(row) {
  return {
    legacyId: row.id,
    target: "Supabase Auth + ccshau_profiles (manual invite — no password copy)",
    email: row.email,
    name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
    collegeLegacyId: row.college_id,
    roleId: row.role_id,
    status: String(row.status),
    importPasswords: false,
  };
}

function summarizeFiles(items) {
  const summary = { found: 0, missing: 0, no_file_ref: 0, uploads_root_not_set: 0 };
  for (const item of items) {
    const checks = [item.file, item.logoFile, item.bannerFile, item.photoFile].filter(Boolean);
    if (checks.length === 0) {
      summary.no_file_ref += 1;
      continue;
    }
    // One status per item (worst → best priority for reporting).
    const statuses = checks.map((c) => c.status);
    let status = "found";
    if (statuses.includes("uploads_root_not_set")) status = "uploads_root_not_set";
    else if (statuses.includes("missing")) status = "missing";
    else if (statuses.every((s) => s === "no_file_ref")) status = "no_file_ref";
    else if (statuses.includes("found")) status = "found";
    else status = "missing";
    summary[status] += 1;
  }
  return summary;
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    dateStrings: true,
  });

  try {
    const [socialRows] = await conn.query(
      "SELECT id, social_name, social_link, status FROM hau_social ORDER BY id",
    );
    const [bannerRows] = await conn.query(
      `SELECT id, slider_title, slider_images, slider_link, slider_order, status
       FROM hau_slider_detail WHERE status = 1 ORDER BY slider_order, id`,
    );
    const [downloadRows] = await conn.query(
      `SELECT id, title, download_file, status, created_at
       FROM hau_downloads WHERE status = 1 ORDER BY id`,
    );
    const [categoryRows] = await conn.query(
      "SELECT category_id, category_name FROM hau_notification_category",
    );
    const categoryById = new Map(
      categoryRows.map((r) => [Number(r.category_id), r.category_name]),
    );

    const newsCatList = [...NEWS_CATEGORY_IDS, JOBS_CATEGORY_ID].join(",");
    const [newsRows] = await conn.query(
      `SELECT id, category_id, notification_name, notification_slug, notification_link,
              notification_file, is_featured, status, created_at
       FROM hau_notifications
       WHERE status = 1 AND category_id IN (${newsCatList})
       ORDER BY id DESC`,
    );
    const [tenderRows] = await conn.query(
      `SELECT id, category_id, notification_name, notification_slug, notification_link,
              notification_file, is_featured, status, created_at
       FROM hau_notifications
       WHERE status = 1 AND category_id = ?
       ORDER BY id DESC`,
      [TENDER_CATEGORY_ID],
    );
    const [mediaClipRows] = await conn.query(
      `SELECT COUNT(*) AS c FROM hau_notifications WHERE status = 1 AND category_id = ?`,
      [MEDIA_CLIPS_CATEGORY_ID],
    );
    const [quickLinkRows] = await conn.query(
      `SELECT COUNT(*) AS c FROM hau_notifications WHERE status = 1 AND category_id = ?`,
      [QUICK_LINKS_CATEGORY_ID],
    );

    const [collegeRows] = await conn.query(
      `SELECT college_id, college_name, college_slug, type, college_logo, college_banner, college_status
       FROM hau_college WHERE college_status = '1' ORDER BY type, college_id`,
    );
    const collegeById = new Map(collegeRows.map((r) => [Number(r.college_id), r]));

    const [departmentRows] = await conn.query(
      `SELECT id, department_name, college_id, department_description, department_status
       FROM hau_college_departments WHERE department_status = '1' ORDER BY college_id, id`,
    );

    const [staffRoleRows] = await conn.query(
      `SELECT id, name, slug FROM college_user_roles ORDER BY id`,
    );
    const roleById = new Map(
      staffRoleRows.map((r) => [Number(r.id), r.name || r.slug]),
    );

    const [staffRows] = await conn.query(
      `SELECT id, view_order, status, role_id, college_id, email, first_name, last_name,
              designation, specialization, qualification, profile_image
       FROM users WHERE status = '1' ORDER BY role_id, view_order, id`,
    );

    const [adminRows] = await conn.query(
      `SELECT id, role_id, college_id, email, first_name, last_name, status
       FROM admins ORDER BY id`,
    );

    const social = mapSocial(socialRows);
    const banners = bannerRows.map(mapBanner);
    const downloads = downloadRows.map(mapDownload);
    const news = newsRows.map((row) =>
      mapNews(row, categoryById.get(Number(row.category_id)) || null),
    );
    const tenders = tenderRows.map(mapTender);
    const colleges = collegeRows.map(mapCollege);
    const departments = departmentRows.map((row) => mapDepartment(row, collegeById));
    const faculty = staffRows.map((row) => mapStaffUser(row, roleById, collegeById));
    const cmsAdmins = adminRows.map(mapCmsAdmin);

    const collegesByBucket = {};
    for (const c of colleges) {
      collegesByBucket[c.bucket] = (collegesByBucket[c.bucket] || 0) + 1;
    }
    const facultyByRole = {};
    for (const f of faculty) {
      facultyByRole[f.legacyRole] = (facultyByRole[f.legacyRole] || 0) + 1;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode: "dry-run",
      writesToLive: false,
      source: {
        host: config.host,
        port: config.port,
        database: config.database,
        uploadsRoot: config.uploadsRoot || null,
      },
      counts: {
        socialLinksMapped: Object.values(social).filter(Boolean).length,
        banners: banners.length,
        downloads: downloads.length,
        newsAndJobs: news.length,
        tenders: tenders.length,
        mediaClipsDeferred: Number(mediaClipRows[0]?.c || 0),
        quickLinksDeferred: Number(quickLinkRows[0]?.c || 0),
        collegesActive: colleges.length,
        collegesByBucket,
        departmentsActive: departments.length,
        facultyStaffActive: faculty.length,
        facultyByRole,
        cmsAdminsTotal: cmsAdmins.length,
        cmsAdminsActive: cmsAdmins.filter((a) => a.status === "1").length,
      },
      fileChecks: {
        banners: summarizeFiles(banners),
        downloads: summarizeFiles(downloads),
        newsAndJobs: summarizeFiles(news),
        tenders: summarizeFiles(tenders),
        colleges: summarizeFiles(colleges),
        facultyPhotos: summarizeFiles(faculty),
      },
      mapped: {
        siteSettingsSocial: social,
        banners: banners.slice(0, 10),
        downloads: downloads.slice(0, 10),
        newsAndJobs: news.slice(0, 10),
        tenders: tenders.slice(0, 10),
        colleges: colleges.slice(0, 15),
        departments: departments.slice(0, 15),
        faculty: faculty.slice(0, 15),
        cmsAdmins: cmsAdmins.slice(0, 10),
      },
      notes: [
        "This report is dry-run only. No Supabase / live database writes were performed.",
        "Hindi fields are left null on first pass (as agreed).",
        "Colleges type 1 → academic; types 2–3 → directorate; 4–11 need confirmation labels.",
        "Faculty/staff come from legacy users table (Dean/HOD/Teaching/Non-teaching roles).",
        "CMS admins: emails/roles only — passwords will NOT be imported (Supabase Auth invite/reset).",
        "Media clips and quick-links are counted but deferred to a later phase.",
        "Set LEGACY_UPLOADS_ROOT when client provides upload files to re-run file checks.",
        "Live apply requires an explicit separate command after you review this report.",
      ],
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = path.join(REPORT_DIR, `dry-run-${stamp}.json`);
    const mdPath = path.join(REPORT_DIR, `dry-run-${stamp}.md`);
    const latestJson = path.join(REPORT_DIR, "dry-run-latest.json");
    const latestMd = path.join(REPORT_DIR, "dry-run-latest.md");

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(latestJson, JSON.stringify(report, null, 2));

    const md = [
      `# Legacy import dry-run`,
      ``,
      `- Generated: ${report.generatedAt}`,
      `- Mode: **dry-run** (no live writes)`,
      `- MySQL: \`${config.host}:${config.port}/${config.database}\``,
      `- Uploads root: \`${config.uploadsRoot || "(not set — client files pending)"}\``,
      ``,
      `## Counts — content`,
      ``,
      `| Entity | Count |`,
      `|---|---:|`,
      `| Social links mapped | ${report.counts.socialLinksMapped} |`,
      `| Banners | ${report.counts.banners} |`,
      `| Downloads | ${report.counts.downloads} |`,
      `| News + Jobs | ${report.counts.newsAndJobs} |`,
      `| Tenders | ${report.counts.tenders} |`,
      `| Media clips (deferred) | ${report.counts.mediaClipsDeferred} |`,
      `| Quick links (deferred) | ${report.counts.quickLinksDeferred} |`,
      ``,
      `## Counts — org structure & people`,
      ``,
      `| Entity | Count |`,
      `|---|---:|`,
      `| Colleges / units (active) | ${report.counts.collegesActive} |`,
      `| Departments (active) | ${report.counts.departmentsActive} |`,
      `| Faculty / staff (active users) | ${report.counts.facultyStaffActive} |`,
      `| CMS admins (total) | ${report.counts.cmsAdminsTotal} |`,
      `| CMS admins (status=1) | ${report.counts.cmsAdminsActive} |`,
      ``,
      `### Colleges by bucket`,
      ``,
      "```json",
      JSON.stringify(collegesByBucket, null, 2),
      "```",
      ``,
      `### Faculty / staff by legacy role`,
      ``,
      "```json",
      JSON.stringify(facultyByRole, null, 2),
      "```",
      ``,
      `## File checks`,
      ``,
      `Uploads folder is ${config.uploadsRoot ? "set" : "**not set**"} — attachment status will be \`uploads_root_not_set\` until client shares files.`,
      ``,
      "```json",
      JSON.stringify(report.fileChecks, null, 2),
      "```",
      ``,
      `## Social mapping preview`,
      ``,
      "```json",
      JSON.stringify(social, null, 2),
      "```",
      ``,
      `## College preview (first 15)`,
      ``,
      "```json",
      JSON.stringify(report.mapped.colleges, null, 2),
      "```",
      ``,
      `## Department preview (first 15)`,
      ``,
      "```json",
      JSON.stringify(report.mapped.departments, null, 2),
      "```",
      ``,
      `## Faculty preview (first 15)`,
      ``,
      "```json",
      JSON.stringify(report.mapped.faculty, null, 2),
      "```",
      ``,
      `## CMS admin note`,
      ``,
      `Passwords will **not** be imported. Active CMS admins in legacy with status=1: **${report.counts.cmsAdminsActive}**. Create fresh Supabase Auth users / invite reset at apply time.`,
      ``,
      `## Next steps`,
      ``,
      `1. Review this report.`,
      `2. Wait for client upload files → set \`LEGACY_UPLOADS_ROOT\` → re-run dry-run.`,
      `3. Only after approval, run a separate **import to live** command (not enabled here).`,
      ``,
    ].join("\n");

    fs.writeFileSync(mdPath, md);
    fs.writeFileSync(latestMd, md);

    console.log("Dry-run complete. No live database writes.");
    console.log(`Report: ${latestMd}`);
    console.log("Content counts:", JSON.stringify({
      socialLinksMapped: report.counts.socialLinksMapped,
      banners: report.counts.banners,
      downloads: report.counts.downloads,
      newsAndJobs: report.counts.newsAndJobs,
      tenders: report.counts.tenders,
    }, null, 2));
    console.log("Org / people counts:", JSON.stringify({
      collegesActive: report.counts.collegesActive,
      collegesByBucket: report.counts.collegesByBucket,
      departmentsActive: report.counts.departmentsActive,
      facultyStaffActive: report.counts.facultyStaffActive,
      facultyByRole: report.counts.facultyByRole,
      cmsAdminsTotal: report.counts.cmsAdminsTotal,
      cmsAdminsActive: report.counts.cmsAdminsActive,
    }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Dry-run failed:", err.message);
  process.exit(1);
});
