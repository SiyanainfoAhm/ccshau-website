/**
 * Migrate Campus School from https://hau.ac.in/college/campus-school
 * onto /college/campus-school (legacy college_id 52).
 *
 * Usage:
 *   node apply-campus-school.mjs --dry-run
 *   node apply-campus-school.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const SLUG = "campus-school";
const COLLEGE_ID = "a28d4da5-1229-4bb1-9c82-f5646335a488";
const LEGACY_COLLEGE_ID = 52;
const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";
const LIVE_URL = "https://hau.ac.in/college/campus-school";
const LOGO_URL = "https://hau.ac.in/public/images/college/logo/52/1543999348.jpg";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

/** Top-nav section slug → children (localSlug, legacySlug, title) */
const NAV_TREE = [
  {
    section: {
      slug: "cs-about-us",
      title_en: "About Us",
      title_hi: "हमारे बारे में",
      sort_order: 1,
    },
    children: [
      {
        slug: "cs-admission",
        legacy: "a-d-m-i-s-s-i-o-n",
        title_en: "Admission",
        title_hi: "प्रवेश",
        sort_order: 1,
      },
      {
        slug: "rules",
        legacy: "rules",
        title_en: "Rules",
        title_hi: "नियम",
        sort_order: 2,
      },
    ],
  },
  {
    section: {
      slug: "cs-messages",
      title_en: "Messages",
      title_hi: "संदेश",
      sort_order: 2,
    },
    children: [
      {
        slug: "chairmans-message",
        legacy: "chairmans-message",
        title_en: "Chairman's Message",
        title_hi: "अध्यक्ष का संदेश",
        sort_order: 1,
      },
      {
        slug: "controlling-officers-message",
        legacy: "controlling-officers-message",
        title_en: "Director Message",
        title_hi: "निदेशक का संदेश",
        sort_order: 2,
      },
      {
        slug: "principals-message",
        legacy: "principals-message",
        title_en: "Principal's Message",
        title_hi: "प्रधानाचार्य का संदेश",
        sort_order: 3,
      },
    ],
  },
  {
    section: {
      slug: "cs-video-gallery",
      title_en: "Video Gallery",
      title_hi: "वीडियो गैलरी",
      sort_order: 3,
      legacy: "video-gallery",
      leaf: true,
    },
    children: [],
  },
  {
    section: {
      slug: "cs-school-management",
      title_en: "School Management",
      title_hi: "विद्यालय प्रबंधन",
      sort_order: 4,
    },
    children: [
      {
        slug: "a-d-v-i-s-o-r-y-c-o-m-m-i-t-t-e-e",
        legacy: "a-d-v-i-s-o-r-y-c-o-m-m-i-t-t-e-e",
        title_en: "Advisory Committee",
        title_hi: "सलाहकार समिति",
        sort_order: 1,
      },
      {
        slug: "faculty",
        legacy: "faculty",
        title_en: "Teaching Staff",
        title_hi: "शिक्षण स्टाफ",
        sort_order: 2,
      },
      {
        slug: "n-o-n-t-e-a-c-h-i-n-g-s-t-a-f-f",
        legacy: "n-o-n-t-e-a-c-h-i-n-g-s-t-a-f-f",
        title_en: "Non Teaching Staff",
        title_hi: "गैर-शिक्षण स्टाफ",
        sort_order: 3,
      },
      {
        slug: "house-details",
        legacy: "house-details",
        title_en: "House Details",
        title_hi: "हाउस विवरण",
        sort_order: 4,
      },
      {
        slug: "campus-school-house-system",
        legacy: "campus-school-house-system",
        title_en: "Campus School House System",
        title_hi: "हाउस प्रणाली",
        sort_order: 5,
      },
      {
        slug: "alumni-campus-school",
        legacy: "alumni-campus-school",
        title_en: "Alumni Campus School",
        title_hi: "पूर्व छात्र",
        sort_order: 6,
      },
    ],
  },
  {
    section: {
      slug: "cs-school-info",
      title_en: "School Info",
      title_hi: "विद्यालय जानकारी",
      sort_order: 5,
    },
    children: [
      {
        slug: "prayer",
        legacy: "prayer",
        title_en: "School Prayer",
        title_hi: "प्रार्थना",
        sort_order: 1,
      },
      {
        slug: "timings",
        legacy: "timings",
        title_en: "School Timings",
        title_hi: "समय सारिणी",
        sort_order: 2,
      },
      {
        slug: "uniform",
        legacy: "uniform",
        title_en: "School Uniform",
        title_hi: "यूनिफॉर्म",
        sort_order: 3,
      },
      {
        slug: "code",
        legacy: "code",
        title_en: "Code of Conduct",
        title_hi: "आचार संहिता",
        sort_order: 4,
      },
      {
        slug: "fee-1",
        legacy: "fee-1",
        title_en: "Fee Structure",
        title_hi: "शुल्क संरचना",
        sort_order: 5,
      },
      {
        slug: "oat",
        legacy: "oat",
        title_en: "OAT",
        title_hi: "ओएटी",
        sort_order: 6,
      },
    ],
  },
  {
    section: {
      slug: "campus-school-gallery",
      title_en: "Gallery",
      title_hi: "गैलरी",
      sort_order: 6,
      gallery: true,
    },
    children: [],
  },
];

/** Quick-link sidebar items (legacy slug or special). Faculty = live staff table. */
const QUICK_LINK_DEFS = [
  { label_en: "Faculty", label_hi: "संकाय", special: "faculty", sort_order: 1 },
  { label_en: "Home", label_hi: "होम", special: "home", sort_order: 2 },
  {
    label_en: "List of Head /Mistresses /Principals /Directors",
    label_hi: "प्रधानाचार्य सूची",
    legacy: "list-of-head-mistresses-principals-directors",
    sort_order: 3,
  },
  {
    label_en: "Mother's Day (2025) Celebrations",
    label_hi: "मदर्स डे",
    legacy: "mothers-day2025-celebrations",
    sort_order: 4,
  },
  {
    label_en: "List of Controlling officers",
    label_hi: "नियंत्रण अधिकारी",
    legacy: "list-of-controlling-officers",
    sort_order: 5,
  },
  {
    label_en: "CBSE Mandatory Disclosure",
    label_hi: "सीबीएसई प्रकटीकरण",
    legacy: "cbse-affiliation-report",
    sort_order: 6,
  },
  {
    label_en: "Campus Achievers",
    label_hi: "उपलब्धि",
    legacy: "campus-achievers",
    sort_order: 7,
  },
  {
    label_en: "Pariksha pe Charcha",
    label_hi: "परीक्षा पे चर्चा",
    legacy: "pariksha-pe-charcha",
    sort_order: 8,
  },
  {
    label_en: "NCC Students Services",
    label_hi: "एनसीसी",
    legacy: "ncc",
    sort_order: 9,
  },
  {
    label_en: "Media Gallery",
    label_hi: "मीडिया गैलरी",
    legacy: "media-gallery-1",
    sort_order: 10,
  },
  {
    label_en: "CBSE Shiksha Shapath 2024",
    label_hi: "सीबीएसई शिक्षा शपथ 2024",
    // Live API only returns this with college_id=0
    legacy: "cbse-shiksha-shapath-2024-1",
    legacyCollegeId: 0,
    sort_order: 11,
  },
  {
    label_en: "CBSE SAFAL Online Examination 2024",
    label_hi: "सीबीएसई सफाल परीक्षा 2024",
    legacy: "cbse-safal-online-examination-2024",
    legacyCollegeId: 0,
    sort_order: 12,
  },
  {
    label_en: "CBSE Results 2023-24",
    label_hi: "सीबीएसई परिणाम",
    legacy: "cbse-results-2022-23",
    sort_order: 13,
  },
  {
    label_en: "Har Ghar tiranga",
    label_hi: "हर घर तिरंगा",
    legacy: "har-ghar-tiranga-campaign",
    sort_order: 14,
  },
  {
    label_en: "Capacity Building Program-2023",
    label_hi: "क्षमता निर्माण",
    legacy: "capacity-building-program-2023",
    sort_order: 15,
  },
  {
    label_en: "Activities-2024",
    label_hi: "गतिविधियाँ",
    legacy: "activities-2024",
    sort_order: 16,
  },
  {
    label_en: "Eye and Dental Check up Camp",
    label_hi: "स्वास्थ्य शिविर",
    legacy: "eye-and-dental-check-up-camp",
    sort_order: 17,
  },
  {
    label_en: "Society Welfare Society Seminar",
    label_hi: "सेमिनार",
    legacy: "society-welfare-society-seminar",
    sort_order: 18,
  },
  {
    label_en: "CALL US: 01662-255241,255462",
    label_hi: "कॉल करें",
    legacy: "call-us-01662-255241255462",
    sort_order: 19,
  },
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
    "h1",
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
    "video",
    "source",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "id", "title", "lang", "dir"],
    a: ["href", "target", "rel", "class", "title"],
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
      "allow",
    ],
    embed: ["src", "width", "height", "type", "class", "style"],
    video: ["src", "controls", "width", "height", "class", "style", "poster"],
    source: ["src", "type"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedIframeHostnames: [
    "hau.ac.in",
    "www.hau.ac.in",
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
    "google.com",
    "www.google.com",
    "maps.google.com",
  ],
};

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

function cmsHtml(raw) {
  let html = String(raw || "");
  html = html.replace(
    /(src|href)=(["'])(\/?storage\/app\/)/gi,
    `$1=$2https://hau.ac.in/storage/app/`,
  );
  html = html.replace(
    /(src|href)=(["'])(\/?public\/)/gi,
    `$1=$2https://hau.ac.in/public/`,
  );
  // Prefer Azure for uploads after migration (basename under legacy-storage/campus-school)
  html = html.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^"'\\\s>]+)/gi,
    (_m, filePath) => {
      const name = String(filePath).split("/").pop();
      return `https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/campus-school/${name}`;
    },
  );
  return stripSpamInjections(sanitizeHtml(html, SANITIZE_OPTIONS)).trim();
}

function pdfViewerHtml(fileName, title) {
  const url = `${LEGACY_PDF_BASE}${fileName}`;
  return `<iframe src="${url}" title="${title}" width="100%" height="720" loading="lazy"></iframe>`;
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchLivePageData(slug) {
  for (const collegeId of [LEGACY_COLLEGE_ID, 0]) {
    const res = await fetch(`https://hau.ac.in/page-data/${slug}/${collegeId}`);
    if (!res.ok) continue;
    const text = await res.text();
    if (!text || text === "null" || text.startsWith("<")) continue;
    try {
      return JSON.parse(text);
    } catch {
      continue;
    }
  }
  return null;
}

function pageBody(data, fallbackTitle) {
  if (!data) return "";
  const title = decodeEntities(data.page_title || fallbackTitle || "Document");
  if (data.file) return pdfViewerHtml(data.file, title);
  return cmsHtml(data.page_content);
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
  const base =
    String(preferred || "faculty")
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

async function seedFaculty(supabase, pageId, userRows) {
  const summary = { created: 0, reused: 0, assigned: 0 };
  for (const row of userRows) {
    const legacyId = String(row.id);
    const staffSlug = `legacy-user-${legacyId}`;
    const name = personName(row);
    const email = row.email ? String(row.email).trim().toLowerCase() : null;
    let person = (
      await supabase
        .from("ccshau_faculty_people")
        .select("*")
        .eq("legacy_user_id", legacyId)
        .maybeSingle()
    ).data;
    if (!person && email) {
      person = (
        await supabase
          .from("ccshau_faculty_people")
          .select("*")
          .ilike("email", email)
          .limit(1)
          .maybeSingle()
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
      const { error } = await supabase
        .from("ccshau_faculty_people")
        .update(personPayload)
        .eq("id", person.id);
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
      const { error } = await supabase
        .from("ccshau_faculty_assignments")
        .insert(assignmentPayload);
      if (error) throw new Error(`assignment insert ${name}: ${error.message}`);
    }
    summary.assigned += 1;
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
    const { error } = await supabase
      .from("ccshau_page_sidebar_items")
      .update(row)
      .eq("id", existing.id);
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

async function upsertPageBySlug(supabase, payload) {
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_pages")
    .select("id, layout_config")
    .eq("slug", payload.slug)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (existing?.id) {
    const { error } = await supabase
      .from("ccshau_pages")
      .update({
        ...payload,
        layout_config: mergeLayout(existing.layout_config, payload.layout_config),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`${payload.slug}: ${error.message}`);
    return existing.id;
  }
  const { data: inserted, error } = await supabase
    .from("ccshau_pages")
    .insert({
      ...payload,
      status: "published",
      published_at: new Date().toISOString(),
      page_type: payload.page_type || "standard",
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert ${payload.slug}: ${error.message}`);
  return inserted.id;
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

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, layout_config, logo_image_path, featured_image_path")
    .eq("id", COLLEGE_ID)
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college?.id || college.slug !== SLUG) throw new Error(`Missing college ${SLUG}`);

  const homePage = await fetchLivePageData("home-25");
  const contactPage = await fetchLivePageData("contact-us-1");
  const facultyRows = await fetchLiveFaculty();
  if (!homePage?.page_content) throw new Error("home-25 missing");
  const homeHtml = cmsHtml(homePage.page_content);
  if (homeHtml.length < 200) throw new Error("Home HTML too short");
  if (!/Campus School, established in 1971/i.test(homeHtml)) {
    throw new Error("Home about paragraph missing");
  }
  const contactHtml = cmsHtml(contactPage?.page_content || "");

  const legacySlugs = new Set();
  for (const group of NAV_TREE) {
    if (group.section.legacy) legacySlugs.add(group.section.legacy);
    for (const child of group.children) legacySlugs.add(child.legacy);
  }
  for (const q of QUICK_LINK_DEFS) {
    if (q.legacy) legacySlugs.add(q.legacy);
  }
  legacySlugs.add("contact-us-1");

  const legacyPages = {};
  for (const slug of legacySlugs) {
    legacyPages[slug] = await fetchLivePageData(slug);
  }

  const principal = facultyRows.find((r) => /principal/i.test(String(r.designation || ""))) ||
    facultyRows[0];
  const principalName = principal ? personName(principal) : "Principal";
  const principalPhoto = principal ? facultyPhotoUrl(principal.profile_image) : null;

  const rootLayout = mergeLayout(college.layout_config, {
    hero: true,
    headOfficer: false,
    contacts: true,
    mainContent: true,
    staff: true,
    gallery: false,
    newsTicker: false,
    studentCorner: false,
    leftSidebar: false,
    rightSidebar: true,
    farmersCta: false,
    heroContactButton: true,
    collegeTopMenu: true,
    showInDepartmentsMenu: false,
  });

  const innerLayout = {
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
    // Required so CollegeNavigation dropdowns include these children
    showInDepartmentsMenu: true,
  };

  const galleryLayout = {
    ...innerLayout,
    mainContent: false,
    gallery: true,
    rightSidebar: false,
  };

  const contactLines = [
    {
      label_en: "Mailing Address",
      label_hi: "डाक पता",
      value_en:
        "The Principal\nCampus School\nCCS Haryana Agricultural University\nHisar - 125 004",
      value_hi:
        "The Principal\nCampus School\nCCS Haryana Agricultural University\nHisar - 125 004",
      sort_order: 1,
    },
    {
      label_en: "Office",
      label_hi: "कार्यालय",
      value_en: "01662-255241, 255462",
      value_hi: "01662-255241, 255462",
      sort_order: 2,
    },
    {
      label_en: "Email Id",
      label_hi: "ई-मेल आईडी",
      value_en: "school@hau.ac.in",
      value_hi: "school@hau.ac.in",
      sort_order: 3,
    },
  ];

  const quickLinks = [];
  for (const def of QUICK_LINK_DEFS) {
    if (def.special === "faculty") {
      quickLinks.push({
        label_en: def.label_en,
        label_hi: def.label_hi,
        href: null,
        content_en: null,
        sort_order: def.sort_order,
      });
      continue;
    }
    if (def.special === "home") {
      quickLinks.push({
        label_en: def.label_en,
        label_hi: def.label_hi,
        href: null,
        content_en: homeHtml,
        sort_order: def.sort_order,
      });
      continue;
    }
    const data = legacyPages[def.legacy];
    const content = pageBody(data, def.label_en);
    if (!content || content.length < 20) {
      console.warn(`skip quick link (no content): ${def.label_en}`);
      continue;
    }
    quickLinks.push({
      label_en: def.label_en,
      label_hi: def.label_hi,
      href: null,
      content_en: content,
      sort_order: def.sort_order,
    });
  }

  console.log(DRY_RUN ? "dry-run campus-school" : "apply campus-school");
  console.log("home chars", homeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length);
  console.log("faculty", facultyRows.length, principalName);
  console.log(
    "nav",
    NAV_TREE.map((g) => g.section.slug).join(" | "),
  );
  console.log(
    "quick links",
    quickLinks.map((q) => `${q.label_en}:${q.content_en ? q.content_en.length : "faculty"}`).join(" | "),
  );

  if (!DRY_RUN) {
    const { error: rootErr } = await supabase
      .from("ccshau_pages")
      .update({
        content_en: homeHtml,
        excerpt_en: "Campus School, CCS HAU Hisar — CBSE affiliated.",
        title_en: "Campus School",
        title_hi: "परिसर विद्यालय",
        page_type: "college",
        layout_template: "office_portal",
        layout_config: rootLayout,
        college_root_id: COLLEGE_ID,
        parent_id: null,
        head_name_en: principalName,
        head_role_en: "Principal",
        head_image_path: principalPhoto,
        logo_image_path: college.logo_image_path || LOGO_URL,
        status: "published",
        office_cta_enabled: false,
        published_at: new Date().toISOString(),
      })
      .eq("id", COLLEGE_ID);
    if (rootErr) throw new Error(rootErr.message);

    // Hide bogus Phase-2 department child from nav
    await supabase
      .from("ccshau_pages")
      .update({
        status: "draft",
        layout_config: mergeLayout(null, { showInDepartmentsMenu: false, collegeTopMenu: false }),
      })
      .eq("slug", "cs-department")
      .eq("parent_id", COLLEGE_ID);

    const sectionIds = {};
    for (const group of NAV_TREE) {
      const sec = group.section;
      const isGallery = Boolean(sec.gallery);
      const isLeaf = Boolean(sec.leaf);
      const leafHtml = isLeaf && sec.legacy ? pageBody(legacyPages[sec.legacy], sec.title_en) : "";
      const sectionId = await upsertPageBySlug(supabase, {
        slug: sec.slug,
        title_en: sec.title_en,
        title_hi: sec.title_hi,
        parent_id: COLLEGE_ID,
        college_root_id: COLLEGE_ID,
        sort_order: sec.sort_order,
        layout_template: "standard",
        layout_config: isGallery ? galleryLayout : innerLayout,
        content_en: isLeaf ? leafHtml : "",
        excerpt_en: `${sec.title_en} — Campus School.`,
        status: "published",
        published_at: new Date().toISOString(),
      });
      sectionIds[sec.slug] = sectionId;

      for (const child of group.children) {
        const html = pageBody(legacyPages[child.legacy], child.title_en);
        await upsertPageBySlug(supabase, {
          slug: child.slug,
          title_en: child.title_en,
          title_hi: child.title_hi,
          parent_id: sectionId,
          college_root_id: COLLEGE_ID,
          sort_order: child.sort_order,
          layout_template: "standard",
          layout_config: innerLayout,
          content_en: html,
          excerpt_en: `${child.title_en} — Campus School.`,
          status: "published",
          published_at: new Date().toISOString(),
        });
      }
    }

    // Contact content page (optional deep-link); nav uses /college/contact-us/campus-school
    await upsertPageBySlug(supabase, {
      slug: "contact-us-1",
      title_en: "Contact Us",
      title_hi: "संपर्क करें",
      parent_id: COLLEGE_ID,
      college_root_id: COLLEGE_ID,
      sort_order: 99,
      layout_template: "standard",
      layout_config: { ...innerLayout, collegeTopMenu: true, showInDepartmentsMenu: false },
      content_en: contactHtml,
      excerpt_en: "Contact Campus School.",
      status: "published",
      published_at: new Date().toISOString(),
    });

    for (const line of contactLines) {
      await upsertContact(supabase, COLLEGE_ID, line);
    }

    // Deactivate old right sidebars then upsert
    await supabase
      .from("ccshau_page_sidebar_items")
      .update({ is_active: false })
      .eq("page_id", COLLEGE_ID)
      .eq("side", "right");

    for (const item of quickLinks) {
      await upsertSidebar(supabase, COLLEGE_ID, item);
    }

    const facultySummary = await seedFaculty(supabase, COLLEGE_ID, facultyRows);
    await enableFacultyPeoplePublic(supabase, COLLEGE_ID);
    console.log("faculty seed", facultySummary);
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-campus-school.json");
  writeFileSync(
    out,
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        collegeId: COLLEGE_ID,
        principal: principalName,
        facultyCount: facultyRows.length,
        homeChars: homeHtml.length,
        nav: NAV_TREE.map((g) => ({
          section: g.section.slug,
          children: g.children.map((c) => c.slug),
        })),
        quickLinks: quickLinks.map((q) => ({
          label: q.label_en,
          chars: q.content_en ? q.content_en.length : 0,
        })),
        missingLegacy: [...legacySlugs].filter((s) => !legacyPages[s]),
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
