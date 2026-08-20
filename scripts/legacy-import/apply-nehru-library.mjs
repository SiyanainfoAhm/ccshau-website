/**
 * Copy live Nehru Library home (https://hau.ac.in/college/nehru-library)
 * onto /college/nehru-library and wire the live college nav.
 *
 * Usage:
 *   node apply-nehru-library.mjs --dry-run
 *   node apply-nehru-library.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const SLUG = "nehru-library";
const LIVE_URL = "https://hau.ac.in/college/nehru-library";
const COLLEGE_ID = "eef2c97a-5afa-481c-9658-ce61928f2e69";
const ABOUT_ID = "29107643-70a8-46b1-92fa-d0e8d66ab2ff";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

const TOP_NAV = [
  ["about-library", 1],
  ["resources", 2],
  ["library-timings-holidays", 3],
  ["digital-library", 4],
];

const ABOUT_CHILDREN = [
  ["organogram", 1],
  ["financial-status", 2],
  ["library-modernization", 3],
  ["library-patrons", 4],
  ["library-services", 5],
  ["nl-human-resources", 6],
  ["library-rules-regulations", 7],
  ["instructions-relating-to-backlog-vacancies-roster", 8],
];

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
const sanitizeHtml = loadFromWeb("sanitize-html");

const SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "h2",
    "h3",
    "h4",
    "span",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "iframe",
    "embed",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style"],
    a: ["href", "target", "rel", "class"],
    img: ["src", "alt", "title", "width", "height", "class", "style"],
    td: ["colspan", "rowspan", "class", "style", "align", "valign", "width", "bgcolor", "height"],
    th: ["colspan", "rowspan", "class", "style", "align", "valign", "width", "bgcolor"],
    table: ["border", "cellpadding", "cellspacing", "align", "bgcolor", "class", "style", "width"],
    iframe: [
      "src",
      "title",
      "width",
      "height",
      "class",
      "style",
      "allowfullscreen",
      "frameborder",
      "loading",
      "referrerpolicy",
    ],
    embed: ["src", "width", "height", "type", "class", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedIframeHostnames: [
    "hau.ac.in",
    "www.hau.ac.in",
    "google.com",
    "www.google.com",
    "maps.google.com",
  ],
};

const LEGACY_COLLEGE_ID = 54;
const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";

function stripSpamInjections(html) {
  return String(html || "")
    .replace(/<a\b[^>]*>\s*slot(?:\s+\w+)+\s*<\/a>/gi, "")
    .replace(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>\s*https?:\/\/[^<]+<\/a>/gi, "")
    .replace(/<a\b[^>]*>\s*<\/a>/gi, "");
}

function mergeLayout(existing, patch) {
  return {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...patch,
  };
}

function extractHome(pageHtml) {
  const photoUrl =
    pageHtml.match(
      /https:\/\/hau\.ac\.in\/storage\/app\/uploads\/DwZ9cKKDRpte8fCQuf2zIzvYGHoseGESAzTEzPKZ\.(?:jpe?g|png|webp)/i,
    )?.[0] ||
    pageHtml.match(
      /https:\/\/hau\.ac\.in\/storage\/app\/uploads\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)/i,
    )?.[0] ||
    null;
  const directorName =
    pageHtml.match(/Dr\.\s*Rajive Kumar Pateria/i)?.[0] || "Dr. Rajive Kumar Pateria";
  const directorRole = "University Librarian";
  const mailingAddress =
    "Nehru Library,\nCCS Haryana Agricultural University\nHisar - 125 004, INDIA";
  const office = "01662-284328, 255416";
  const email = "librarianhau@gmail.com; library@hau.ac.in";
  const aboutInner =
    pageHtml.match(/Nehru Library is a blend[\s\S]*?dissemination of information\./i)?.[0] || "";
  const aboutHtml = stripSpamInjections(
    sanitizeHtml(`<p style="text-align:justify">${aboutInner}</p>`, SANITIZE_OPTIONS),
  ).trim();
  if (!/6\.36 lakh/i.test(aboutHtml)) {
    throw new Error("Live Nehru Library about paragraph missing");
  }
  if (!photoUrl) throw new Error("Live librarian photo missing");

  const contentEn = [
    `<p class="library-elibrary"><a href="https://ccshau.refread.com/#/home" target="_blank" rel="noopener noreferrer"><strong>CCS HAU eLibrary</strong></a></p>`,
    `<div class="office-profile office-profile--wide library-officer">`,
    `<img src="${photoUrl}" alt="${directorName}, ${directorRole}" />`,
    `<div>`,
    `<p><strong>${directorName}</strong></p>`,
    `<p>${directorRole}</p>`,
    `<p>Nehru Library,<br />CCS Haryana Agricultural University<br />Hisar - 125 004, INDIA</p>`,
    `<p>Telephones : ${office}</p>`,
    `<p>E-mail : <a href="mailto:librarianhau@gmail.com">librarianhau@gmail.com</a>; <a href="mailto:library@hau.ac.in">library@hau.ac.in</a></p>`,
    `</div></div>`,
    aboutHtml,
  ].join("\n");

  return { contentEn, photoUrl, directorName, directorRole, mailingAddress, office, email };
}

async function loadHumanResourcesHtml() {
  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
    charset: "utf8mb4",
  });
  const [rows] = await conn.query(
    `SELECT page_content FROM hau_cms WHERE page_slug = 'human-resources' LIMIT 1`,
  );
  await conn.end();
  const html = stripSpamInjections(sanitizeHtml(rows[0]?.page_content || "", SANITIZE_OPTIONS)).trim();
  if (html.length < 80) throw new Error("Library Human Resources HTML missing");
  return html;
}

function cmsHtml(raw) {
  return stripSpamInjections(sanitizeHtml(String(raw || ""), SANITIZE_OPTIONS)).trim();
}

function pdfViewerHtml(fileName, title) {
  const url = `${LEGACY_PDF_BASE}${fileName}`;
  return `<iframe src="${url}" title="${title}" width="100%" height="720"></iframe>`;
}

async function fetchLivePageData(slug) {
  const res = await fetch(`https://hau.ac.in/page-data/${slug}/${LEGACY_COLLEGE_ID}`);
  if (!res.ok) throw new Error(`page-data ${slug}: ${res.status}`);
  return res.json();
}

async function fetchLiveFaculty() {
  const res = await fetch(
    `https://hau.ac.in/college/faculty/${LEGACY_COLLEGE_ID}/teaching_staff`,
  );
  if (!res.ok) throw new Error(`faculty ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

function facultyPhotoUrl(profileImage) {
  if (!profileImage) return null;
  const path = String(profileImage).replace(/^\/+/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return `https://hau.ac.in/storage/app/${path}`;
}

function personName(row) {
  return `${row.first_name || ""} ${row.last_name || ""}`.replace(/\s+/g, " ").trim();
}

async function uniqueFacultySlug(supabase, preferred) {
  const base = String(preferred || "faculty")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "faculty";
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await supabase
      .from("ccshau_faculty_people")
      .select("id")
      .eq("global_slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now()}`;
}

async function seedLibraryFaculty(supabase, pageId, userRows, confirm) {
  const summary = { created: 0, reused: 0, assigned: 0 };
  for (const row of userRows) {
    const legacyId = String(row.id);
    const staffSlug = `legacy-user-${legacyId}`;
    const name = personName(row);
    const email = row.email ? String(row.email).trim().toLowerCase() : null;
    let person = (
      await supabase.from("ccshau_faculty_people").select("*").eq("legacy_user_id", legacyId).maybeSingle()
    ).data;
    if (!person && email) {
      person = (
        await supabase.from("ccshau_faculty_people").select("*").ilike("email", email).limit(1).maybeSingle()
      ).data;
    }
    const personPayload = {
      name_en: name,
      image_path: facultyPhotoUrl(row.profile_image),
      email,
      mobile: row.contact_number || null,
      qualification_en: row.qualification || null,
      specialization_en: row.specialization || null,
      detail_content_en: row.other_activity || null,
      legacy_user_id: legacyId,
      is_active: true,
    };
    if (!confirm) {
      console.log(`  faculty ${name} — ${row.designation}`);
      continue;
    }
    if (!person) {
      const globalSlug = await uniqueFacultySlug(supabase, staffSlug);
      const { data: inserted, error } = await supabase
        .from("ccshau_faculty_people")
        .insert({ ...personPayload, global_slug: globalSlug })
        .select("*")
        .single();
      if (error) throw new Error(`person ${name}: ${error.message}`);
      person = inserted;
      summary.created += 1;
    } else {
      const { error } = await supabase.from("ccshau_faculty_people").update(personPayload).eq("id", person.id);
      if (error) throw new Error(`person update ${name}: ${error.message}`);
      summary.reused += 1;
    }
    const assignmentPayload = {
      person_id: person.id,
      page_id: pageId,
      source_staff_id: null,
      designation_en: String(row.designation || "Faculty").slice(0, 500),
      specialization_en: row.specialization || null,
      member_type: "faculty",
      staff_slug: staffSlug,
      sort_order: Number(row.view_order) || Number(row.id),
      is_active: true,
    };
    const { data: existingAssignment } = await supabase
      .from("ccshau_faculty_assignments")
      .select("id")
      .eq("person_id", person.id)
      .eq("page_id", pageId)
      .maybeSingle();
    if (existingAssignment?.id) {
      const { error } = await supabase
        .from("ccshau_faculty_assignments")
        .update(assignmentPayload)
        .eq("id", existingAssignment.id);
      if (error) throw new Error(`assignment update ${name}: ${error.message}`);
    } else {
      const { error } = await supabase.from("ccshau_faculty_assignments").insert(assignmentPayload);
      if (error) throw new Error(`assignment insert ${name}: ${error.message}`);
    }
    summary.assigned += 1;
    console.log(`  faculty ${name} — ${row.designation}`);
  }
  return summary;
}

async function enableFacultyPeoplePublic(supabase, pageId) {
  const { data: settings, error } = await supabase
    .from("ccshau_site_settings")
    .select("id, faculty_people_public_college_ids")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!settings) return;
  const current = settings.faculty_people_public_college_ids ?? [];
  if (current.includes(pageId)) return;
  const { error: updateErr } = await supabase
    .from("ccshau_site_settings")
    .update({ faculty_people_public_college_ids: [...current, pageId] })
    .eq("id", settings.id);
  if (updateErr) throw new Error(updateErr.message);
}

async function upsertSidebar(supabase, pageId, item) {
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id")
    .eq("page_id", pageId)
    .eq("side", "right")
    .eq("label_en", item.label_en)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  const row = {
    page_id: pageId,
    side: "right",
    label_en: item.label_en,
    label_hi: item.label_hi,
    href: item.href ?? null,
    linked_page_id: null,
    content_en: item.content_en ?? null,
    content_hi: item.content_hi ?? null,
    sort_order: item.sort_order,
    is_active: true,
  };
  if (existing?.id) {
    const { error } = await supabase.from("ccshau_page_sidebar_items").update(row).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("ccshau_page_sidebar_items").insert(row);
  if (error) throw new Error(error.message);
}

async function upsertContact(supabase, pageId, line) {
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_page_contact_lines")
    .select("id")
    .eq("page_id", pageId)
    .eq("label_en", line.label_en)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (existing?.id) {
    const { error } = await supabase
      .from("ccshau_page_contact_lines")
      .update({ ...line, is_active: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("ccshau_page_contact_lines").insert({
    page_id: pageId,
    ...line,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const liveRes = await fetch(LIVE_URL);
  if (!liveRes.ok) throw new Error(`Live page fetch failed: ${liveRes.status}`);
  const home = extractHome(await liveRes.text());
  const hrHtml = await loadHumanResourcesHtml();
  const [digitalPage, rulesPage, contactPage, organogramPage, facultyRows] = await Promise.all([
    fetchLivePageData("digital-library"),
    fetchLivePageData("library-rules-regulations"),
    fetchLivePageData("contact-us-9"),
    fetchLivePageData("organogram"),
    fetchLiveFaculty(),
  ]);
  const digitalHtml = cmsHtml(digitalPage.page_content);
  const contactHtml = cmsHtml(contactPage.page_content);
  if (!/google\.com\/maps\/embed/i.test(contactHtml)) {
    throw new Error("Contact Us map iframe missing after sanitize");
  }
  const organogramHtml = cmsHtml(organogramPage.page_content);
  const rulesHtml = rulesPage.file
    ? pdfViewerHtml(rulesPage.file, rulesPage.page_title || "Library Rules & Regulations")
    : cmsHtml(rulesPage.page_content);
  if (digitalHtml.length < 80) throw new Error("Digital Library HTML missing");
  if (contactHtml.length < 80) throw new Error("Contact Us HTML missing");
  if (organogramHtml.length < 80) throw new Error("Organogram HTML missing");
  if (rulesHtml.length < 40) throw new Error("Library Rules HTML missing");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, layout_config, featured_image_path")
    .eq("id", COLLEGE_ID)
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college?.id || college.slug !== SLUG) throw new Error(`Missing college ${SLUG}`);

  const slugs = [
    ...TOP_NAV.map(([slug]) => slug),
    ...ABOUT_CHILDREN.map(([slug]) => slug),
    "nl-department",
    "nehru-library-gallery",
  ];
  const { data: tree, error: treeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, parent_id, college_root_id, layout_config")
    .in("slug", slugs);
  if (treeErr) throw new Error(treeErr.message);
  const bySlug = new Map((tree || []).map((row) => [row.slug, row]));

  const layoutConfig = mergeLayout(college.layout_config, {
    hero: true,
    headOfficer: false,
    contacts: false,
    mainContent: true,
    staff: true,
    gallery: false,
    newsTicker: true,
    studentCorner: false,
    leftSidebar: false,
    rightSidebar: true,
    farmersCta: false,
    heroContactButton: true,
    collegeTopMenu: true,
  });

  const innerLayout = mergeLayout(null, {
    hero: true,
    headOfficer: false,
    contacts: false,
    mainContent: true,
    staff: false,
    gallery: false,
    newsTicker: false,
    studentCorner: false,
    leftSidebar: false,
    rightSidebar: true,
    farmersCta: false,
    heroContactButton: false,
    collegeTopMenu: true,
    showInDepartmentsMenu: true,
  });

  const quickLinks = [
    {
      label_en: "Faculty",
      label_hi: "संकाय",
      href: null,
      content_en: null,
      sort_order: 1,
    },
    {
      label_en: "Home",
      label_hi: "होम",
      href: null,
      content_en: home.contentEn,
      sort_order: 2,
    },
    {
      label_en: "Digital Library",
      label_hi: "डिजिटल पुस्तकालय",
      href: null,
      content_en: digitalHtml,
      sort_order: 3,
    },
    {
      label_en: "Library Rules & Regulations",
      label_hi: "पुस्तकालय नियम",
      href: null,
      content_en: rulesHtml,
      sort_order: 4,
    },
    {
      label_en: "Contact Us",
      label_hi: "संपर्क करें",
      href: null,
      content_en: contactHtml,
      sort_order: 5,
    },
  ];

  const contactLines = [
    {
      label_en: "Mailing Address",
      label_hi: "डाक पता",
      value_en: home.mailingAddress,
      value_hi: home.mailingAddress,
      sort_order: 1,
    },
    {
      label_en: "Office",
      label_hi: "कार्यालय",
      value_en: home.office,
      value_hi: home.office,
      sort_order: 2,
    },
    {
      label_en: "Email Id",
      label_hi: "ई-मेल आईडी",
      value_en: home.email,
      value_hi: home.email,
      sort_order: 3,
    },
  ];

  const pageUpdate = {
    content_en: home.contentEn,
    excerpt_en: "Nehru Library, CCS HAU Hisar.",
    layout_template: "office_portal",
    layout_config: layoutConfig,
    head_name_en: home.directorName,
    head_role_en: home.directorRole,
  };
  if (home.photoUrl) pageUpdate.head_image_path = home.photoUrl;

  const navUpdates = [
    {
      id: ABOUT_ID,
      parent_id: COLLEGE_ID,
      college_root_id: COLLEGE_ID,
      title_en: "About Library",
      title_hi: "पुस्तकालय परिचय",
      sort_order: 1,
      layout_template: "standard",
      layout_config: innerLayout,
      content_en: "",
    },
  ];

  for (const [slug, sortOrder] of TOP_NAV) {
    if (slug === "about-library") continue;
    const row = bySlug.get(slug);
    if (!row) throw new Error(`Missing top nav page ${slug}`);
    navUpdates.push({
      id: row.id,
      parent_id: COLLEGE_ID,
      college_root_id: COLLEGE_ID,
      title_en: slug === "resources" ? "Resources" : slug === "library-timings-holidays" ? "Library Timings & Holidays" : row.title_en,
      sort_order: sortOrder,
      layout_template: "standard",
      layout_config: innerLayout,
      ...(slug === "digital-library" ? { content_en: digitalHtml } : {}),
    });
  }

  for (const [slug, sortOrder] of ABOUT_CHILDREN) {
    if (slug === "nl-human-resources") continue;
    const row = bySlug.get(slug);
    if (!row) throw new Error(`Missing About Library page ${slug}`);
    navUpdates.push({
      id: row.id,
      parent_id: ABOUT_ID,
      college_root_id: COLLEGE_ID,
      sort_order: sortOrder,
      layout_template: "standard",
      layout_config: innerLayout,
      ...(slug === "library-rules-regulations" ? { content_en: rulesHtml } : {}),
      ...(slug === "organogram" ? { content_en: organogramHtml } : {}),
    });
  }

  const hrExisting = bySlug.get("nl-human-resources");
  const hrInsert = hrExisting
    ? null
    : {
        slug: "nl-human-resources",
        title_en: "Human Resources",
        title_hi: "मानव संसाधन",
        page_type: "standard",
        layout_template: "standard",
        layout_config: innerLayout,
        status: "published",
        parent_id: ABOUT_ID,
        college_root_id: COLLEGE_ID,
        sort_order: 6,
        content_en: hrHtml,
      };
  if (hrExisting) {
    navUpdates.push({
      id: hrExisting.id,
      parent_id: ABOUT_ID,
      college_root_id: COLLEGE_ID,
      title_en: "Human Resources",
      sort_order: 6,
      layout_template: "standard",
      layout_config: innerLayout,
      content_en: hrHtml,
    });
  }

  console.log(DRY_RUN ? "dry-run nehru-library" : "apply nehru-library");
  console.log(home.directorName, home.directorRole);
  console.log("about chars", home.contentEn.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length);
  console.log("nav", TOP_NAV.map(([slug]) => slug).join(" | "));
  console.log(
    "quick links",
    quickLinks.map((item) => `${item.label_en}:${item.content_en ? item.content_en.length : "faculty"}`).join(" | "),
  );
  console.log("faculty", facultyRows.length);

  if (!DRY_RUN) {
    const { error: pageErr } = await supabase.from("ccshau_pages").update(pageUpdate).eq("id", COLLEGE_ID);
    if (pageErr) throw new Error(pageErr.message);

    for (const payload of navUpdates) {
      const { id, ...patch } = payload;
      const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", id);
      if (error) throw new Error(`${id}: ${error.message}`);
    }

    if (hrInsert) {
      const { error } = await supabase.from("ccshau_pages").insert(hrInsert);
      if (error) throw new Error(`hr insert: ${error.message}`);
    }

    for (const line of contactLines) {
      await upsertContact(supabase, COLLEGE_ID, line);
    }

    for (const item of quickLinks) {
      await upsertSidebar(supabase, COLLEGE_ID, item);
    }

    await seedLibraryFaculty(supabase, COLLEGE_ID, facultyRows, true);
    await enableFacultyPeoplePublic(supabase, COLLEGE_ID);

    const organogramId = bySlug.get("organogram")?.id;
    if (organogramId) {
      const { error: sbOffErr } = await supabase
        .from("ccshau_page_sidebar_items")
        .update({ is_active: false })
        .eq("page_id", organogramId);
      if (sbOffErr) throw new Error(sbOffErr.message);
      const { error: asgOffErr } = await supabase
        .from("ccshau_faculty_assignments")
        .update({ is_active: false })
        .eq("page_id", organogramId);
      if (asgOffErr) throw new Error(asgOffErr.message);
    }

    await supabase
      .from("ccshau_page_news_ticker_items")
      .update({ is_active: false })
      .eq("page_id", COLLEGE_ID);

    const { data: existingNews } = await supabase
      .from("ccshau_page_news_ticker_items")
      .select("id")
      .eq("page_id", COLLEGE_ID)
      .eq("title_en", "Book Exhibition (2-3 Feb 2026)")
      .maybeSingle();
    const newsRow = {
      page_id: COLLEGE_ID,
      title_en: "Book Exhibition (2-3 Feb 2026)",
      title_hi: "पुस्तक प्रदर्शनी (2-3 फरवरी 2026)",
      href: "/college/nehru-library/nehru-library-gallery",
      is_new: true,
      sort_order: 1,
      is_active: true,
    };
    if (existingNews?.id) {
      const { error } = await supabase
        .from("ccshau_page_news_ticker_items")
        .update(newsRow)
        .eq("id", existingNews.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("ccshau_page_news_ticker_items").insert(newsRow);
      if (error) throw new Error(error.message);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-nehru-library.json");
  writeFileSync(
    out,
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        director: home.directorName,
        photoUrl: home.photoUrl,
        navUpdates: navUpdates.map((row) => ({ id: row.id, slugHint: row.title_en, sort_order: row.sort_order })),
        hrInsert: Boolean(hrInsert),
        faculty: facultyRows.map((row) => personName(row)),
        quickLinks: quickLinks.map((item) => ({
          label: item.label_en,
          chars: item.content_en ? item.content_en.length : 0,
        })),
      },
      null,
      2,
    ),
  );
  console.log("Report:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
