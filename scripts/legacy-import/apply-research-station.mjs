/**
 * Migrate a research-station college microsite from hau.ac.in:
 *  - about HTML (director + history)
 *  - right Quick Links (Faculty + PDF or HTML tabs)
 *  - faculty directory + Other Activities
 *
 * Usage:
 *   node apply-research-station.mjs --slug=cotton-research-station-sirsa --dry-run
 *   node apply-research-station.mjs --slug=cotton-research-station-sirsa --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CACHE_DIR = join(REPORT_DIR, "hau-pages-pdf-cache");

const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

const COLLEGE_SLUG = argValue("--slug");
const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";
const AZURE_PDF_BASE =
  "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf";

/** Users listed on the live station faculty table whose college_id is not this station. */
const EXTRA_FACULTY_IDS = {
  "cotton-research-station-sirsa": [414], // Dr. Virender Singh (Senior Scientist)
};

const HI_LABEL = {
  Faculty: "संकाय",
  "Mandate and Thrust Areas": "अधिदेश और थ्रस्ट क्षेत्र",
  "Mandate and Thurst Areas": "अधिदेश और थ्रस्ट क्षेत्र",
  "Mandate and Thurst Area": "अधिदेश और थ्रस्ट क्षेत्र",
  "Agricultural Problem of Zone": "क्षेत्र की कृषि समस्याएँ",
  Awards: "पुरस्कार",
  "Major Contribution": "प्रमुख योगदान",
  "Teaching & Research Achievements": "शिक्षण और अनुसंधान उपलब्धियाँ",
  "Infrastructure (laboratories etc.)": "अवसंरचना",
  "On going research Projects": "चल रहे अनुसंधान परियोजनाएं",
  "Salient Research Achievement": "प्रमुख अनुसंधान उपलब्धि",
  Achievements: "उपलब्धियाँ",
  "Ongoing Research  Projects": "चल रहे अनुसंधान परियोजनाएं",
  "Ongoing Research Projects": "चल रहे अनुसंधान परियोजनाएं",
  Infrastructure: "अवसंरचना",
  "Awards and Honors": "पुरस्कार और सम्मान",
  Publications: "प्रकाशन",
  Publication: "प्रकाशन",
  Activities: "गतिविधियाँ",
  "List of Staff": "स्टाफ सूची",
  Facilities: "सुविधाएँ",
  Mandate: "अधिदेश",
  "Non-Teaching Staff": "गैर-शिक्षण स्टाफ",
  "Major Rice Varieties": "प्रमुख धान किस्में",
  Home: "होम",
};

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
    "img",
    "h1",
    "h2",
    "h3",
    "span",
    "div",
    "section",
    "article",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "style", "title", "lang", "dir"],
    a: ["href", "name", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "width", "height", "class", "loading"],
    td: ["colspan", "rowspan", "class", "style"],
    th: ["colspan", "rowspan", "class", "style", "scope"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

const HAS_HTML_TAG = /<\/?[a-z][\s\S]*>/i;

function normalizeCmsHtml(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) return "";
  if (!HAS_HTML_TAG.test(trimmed)) {
    return trimmed
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${sanitizeHtml(p)}</p>`)
      .join("\n");
  }
  return trimmed;
}

function prepareHtml(raw) {
  const normalized = normalizeCmsHtml(raw);
  if (!normalized) return "";
  return sanitizeHtml(normalized, SANITIZE_OPTIONS);
}

/** Legacy CMS HTML sometimes has injected gambling SEO links. */
function stripSpamInjections(html) {
  return String(html || "")
    .replace(
      /<a\b[^>]*href=["'][^"']*playbook\.n-ost\.org[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      "",
    )
    .replace(/<a\b[^>]*>\s*slot\s+gacor(?:\s+\w+)*\s*<\/a>/gi, "")
    .replace(/quality\s{2,}groundwater/gi, "quality groundwater");
}

function pdfHtml(url, label) {
  const safe = String(label || "Document")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<a href="${url}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${safe}</strong></span></a>`;
}

function findDirectorMarker(pageHtml) {
  const patterns = [
    /Regional Director/i,
    /Professor\s*&\s*Head/i,
    /Head\s*&\s*Professor/i,
    /Incharge/i,
  ];
  for (const pattern of patterns) {
    const idx = pageHtml.search(pattern);
    if (idx >= 0) return idx;
  }
  return -1;
}

function extractHomeHtml(pageHtml) {
  const marker = findDirectorMarker(pageHtml);
  if (marker < 0) throw new Error("Live page missing director/incharge block");
  const tableStart = pageHtml.lastIndexOf("<table", marker);
  if (tableStart < 0) throw new Error("Live page missing director table");
  const tableEnd = pageHtml.indexOf("</table>", marker);
  if (tableEnd < 0) throw new Error("Live page director table is unclosed");
  const afterTable = tableEnd + "</table>".length;

  const cutCandidates = [
    pageHtml.search(/function getFaculty|getFaculty\(/i),
    pageHtml.search(/id=["']menu-hot-link["']/i),
    pageHtml.search(/Quick Link/i),
  ].filter((idx) => idx > afterTable);
  const cutAt = cutCandidates.length ? Math.min(...cutCandidates) : afterTable + 20000;
  const raw = pageHtml
    .slice(tableStart, cutAt)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  return sanitizeHtml(raw, SANITIZE_OPTIONS).trim();
}

function parseDirectorContacts(html) {
  const phone =
    html
      .match(/(?:Contact\s*No\.?|Phone\s*(?:No\.?)?)\s*:?\s*([0-9+\-\s/,]+)/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() || null;
  const email =
    html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    html.match(/Email\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    null;
  return { phone, email };
}

function personName(row) {
  return `${row.first_name || ""} ${row.last_name || ""}`.replace(/\s+/g, " ").trim();
}

function facultyPhotoUrl(profileImage) {
  if (!profileImage) return null;
  const path = String(profileImage).replace(/^\/+/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return `https://hau.ac.in/storage/app/${path}`;
}

function hasMeaningfulDetail(raw) {
  if (raw == null) return false;
  const text = String(raw)
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
  return text.length > 0 || /<img\s/i.test(String(raw)) || /<table/i.test(String(raw));
}

function getBlobServiceClient() {
  const { BlobServiceClient, StorageSharedKeyCredential } = loadFromWeb(
    "@azure/storage-blob",
  );
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (cs) return BlobServiceClient.fromConnectionString(cs);
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (accountName && accountKey) {
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(accountName, accountKey),
    );
  }
  return null;
}

async function ensureAzurePdf(fileName) {
  const blobClient = getBlobServiceClient();
  const fallback = `${LEGACY_PDF_BASE}${fileName}`;
  if (!blobClient) return fallback;

  const container =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER?.trim() ||
    "ccshaucontainer";
  const block = blobClient
    .getContainerClient(container)
    .getBlockBlobClient(`pages-pdf/${fileName}`);
  if (await block.exists()) return `${AZURE_PDF_BASE}/${fileName}`;

  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, fileName);
  let bytes;
  if (existsSync(cachePath)) {
    bytes = await readFile(cachePath);
  } else {
    const locals = [
      join(
        process.env.LEGACY_UPLOADS_ROOT?.trim() ||
          "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public",
        "pages-pdf",
        fileName,
      ),
      join("C:\\Jatin\\Projects\\CCHAU_mysql\\public\\pages-pdf", fileName),
    ];
    const local = locals.find((p) => existsSync(p));
    if (local) {
      bytes = await readFile(local);
    } else {
      const res = await fetch(`${LEGACY_PDF_BASE}${fileName}`);
      if (!res.ok) throw new Error(`download ${fileName} failed: ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
    }
    await writeFile(cachePath, bytes);
  }

  if (CONFIRM) {
    await block.uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: "application/pdf" },
    });
  }
  return `${AZURE_PDF_BASE}/${fileName}`;
}

async function mysqlConn() {
  return mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }
  if (!COLLEGE_SLUG) {
    console.error("Missing --slug=cotton-research-station-sirsa");
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

  const summary = {
    startedAt: new Date().toISOString(),
    mode: CONFIRM ? "apply" : "dry-run",
    slug: COLLEGE_SLUG,
    legacyCollegeId: null,
    homeHtmlChars: 0,
    sidebarInserted: 0,
    sidebarUpdated: 0,
    staffInserted: 0,
    staffUpdated: 0,
    contactsUpdated: 0,
    errors: [],
  };

  const conn = await mysqlConn();
  const [colleges] = await conn.query(
    `SELECT college_id, college_name, college_slug
     FROM hau_college
     WHERE college_slug = ? OR college_slug = ?
     LIMIT 1`,
    [COLLEGE_SLUG, COLLEGE_SLUG.replace(/-/g, "_")],
  );
  const college = colleges[0];
  if (!college) {
    await conn.end();
    throw new Error(`Legacy college not found for slug ${COLLEGE_SLUG}`);
  }
  summary.legacyCollegeId = Number(college.college_id);

  const [menus] = await conn.query(
    `SELECT menu_id, menu_name, menu_type
     FROM hau_menu
     WHERE college_id = ? AND menu_status = 1
       AND (menu_type LIKE '%right%' OR menu_name LIKE '%Right%' OR menu_name LIKE '%Quick%')
     ORDER BY menu_id`,
    [summary.legacyCollegeId],
  );
  const menuId = menus[0]?.menu_id;
  if (!menuId) summary.errors.push("No right/quick-link menu found");

  const [menuRows] = menuId
    ? await conn.query(
        `SELECT md.label, md.link, md.display_order,
                COALESCE(cms.file, cms_slug.file) AS file,
                COALESCE(cms.page_content, cms_slug.page_content) AS page_content
         FROM hau_menu_detail md
         LEFT JOIN hau_cms cms ON cms.id = md.page_id
         LEFT JOIN hau_cms cms_slug
           ON cms_slug.page_slug = CASE
             WHEN md.link LIKE 'page/%' THEN SUBSTRING(md.link, 6)
             ELSE NULL
           END
         WHERE md.menu_id = ?
         ORDER BY md.display_order, md.id`,
        [menuId],
      )
    : [[]];

  const extraFacultyIds = EXTRA_FACULTY_IDS[COLLEGE_SLUG] ?? [];
  const extraPlaceholders = extraFacultyIds.map(() => "?").join(", ");
  const [userRows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization,
            profile_image, view_order, role_id, contact_number, qualification, other_activity
     FROM users
     WHERE status = '1'
       AND (
         FIND_IN_SET(?, REPLACE(college_id, ' ', ''))
         ${extraFacultyIds.length ? `OR id IN (${extraPlaceholders})` : ""}
       )
     ORDER BY view_order, id`,
    extraFacultyIds.length
      ? [summary.legacyCollegeId, ...extraFacultyIds]
      : [summary.legacyCollegeId],
  );
  await conn.end();

  const liveUrl = `https://hau.ac.in/college/${COLLEGE_SLUG}`;
  const liveRes = await fetch(liveUrl);
  if (!liveRes.ok) throw new Error(`Live page fetch failed: ${liveRes.status}`);
  const homeHtml = extractHomeHtml(await liveRes.text());
  summary.homeHtmlChars = homeHtml.length;
  const directorContacts = parseDirectorContacts(homeHtml);

  const { data: page, error: pageErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, layout_config, content_en")
    .eq("slug", COLLEGE_SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page?.id) throw new Error(`Missing page ${COLLEGE_SLUG}`);

  const sidebarItems = [
    {
      labelEn: "Faculty",
      labelHi: HI_LABEL.Faculty,
      sortOrder: 0,
      contentEn: null,
    },
  ];
  for (const row of menuRows) {
    const label = String(row.label || "").trim();
    if (!label) continue;
    if (/^faculty$/i.test(label)) continue;
    const fileName = row.file ? String(row.file).trim() : "";
    const rawHtml = row.page_content ? String(row.page_content).trim() : "";
    let contentEn = null;
    if (fileName) {
      const candidates = [fileName];
      const cmsSlug = String(row.link || "")
        .replace(/^page\//, "")
        .trim();
      if (cmsSlug) {
        const { data: stubPage } = await supabase
          .from("ccshau_pages")
          .select("content_en")
          .eq("slug", cmsSlug)
          .maybeSingle();
        const stubFile = stubPage?.content_en?.match(/(\d+\.pdf)/i)?.[1];
        if (stubFile && !candidates.includes(stubFile)) candidates.push(stubFile);
      }
      let uploaded = false;
      for (const candidate of candidates) {
        try {
          const pdfUrl = await ensureAzurePdf(candidate);
          contentEn = pdfHtml(pdfUrl, label);
          uploaded = true;
          break;
        } catch (e) {
          summary.errors.push(`${label} (${candidate}): ${e.message || e}`);
        }
      }
      if (!uploaded) {
        contentEn = pdfHtml(
          `${LEGACY_PDF_BASE}${candidates[candidates.length - 1]}`,
          label,
        );
      }
    } else if (rawHtml) {
      contentEn = stripSpamInjections(prepareHtml(rawHtml)) || null;
    }
    sidebarItems.push({
      labelEn: label,
      labelHi: HI_LABEL[label] || HI_LABEL[label.replace(/\s+/g, " ")] || null,
      sortOrder: Number(row.display_order) + 1,
      contentEn,
    });
  }

  const layoutConfig = {
    ...(page.layout_config && typeof page.layout_config === "object"
      ? page.layout_config
      : {}),
    hero: true,
    headOfficer: false,
    contacts: false,
    staff: true,
    gallery: false,
    newsTicker: false,
    studentCorner: false,
    mainContent: true,
    leftSidebar: false,
    rightSidebar: true,
    collegeTopMenu: false,
    showInDepartmentsMenu: true,
    farmersCta: true,
    heroContactButton: false,
  };

  console.log(`${summary.mode} ${COLLEGE_SLUG} (legacy college ${summary.legacyCollegeId})`);
  console.log(
    `home html ${homeHtml.length} chars; sidebar ${sidebarItems.length}; staff ${userRows.length}`,
  );
  for (const item of sidebarItems) {
    console.log(
      `  tab "${item.labelEn}": ${item.contentEn ? `${item.contentEn.length} chars` : "empty (faculty/list)"}`,
    );
  }

  if (CONFIRM) {
    const { error: pageUpdateErr } = await supabase
      .from("ccshau_pages")
      .update({
        content_en: homeHtml,
        layout_config: layoutConfig,
      })
      .eq("id", page.id);
    if (pageUpdateErr) throw new Error(pageUpdateErr.message);

    const { data: existingSidebar, error: sbErr } = await supabase
      .from("ccshau_page_sidebar_items")
      .select("id, label_en")
      .eq("page_id", page.id);
    if (sbErr) throw new Error(sbErr.message);

    const byLabel = new Map(
      (existingSidebar || []).map((row) => [String(row.label_en).trim().toLowerCase(), row]),
    );
    const keep = new Set();

    for (const item of sidebarItems) {
      const key = item.labelEn.trim().toLowerCase();
      keep.add(key);
      const current = byLabel.get(key);
      const payload = {
        page_id: page.id,
        side: "right",
        label_en: item.labelEn,
        label_hi: item.labelHi,
        href: null,
        linked_page_id: null,
        content_en: item.contentEn,
        content_hi: null,
        sort_order: item.sortOrder,
        is_active: true,
      };
      if (current?.id) {
        const { error } = await supabase
          .from("ccshau_page_sidebar_items")
          .update(payload)
          .eq("id", current.id);
        if (error) throw new Error(error.message);
        summary.sidebarUpdated += 1;
      } else {
        const { error } = await supabase.from("ccshau_page_sidebar_items").insert(payload);
        if (error) throw new Error(error.message);
        summary.sidebarInserted += 1;
      }
    }

    const extraIds = (existingSidebar || [])
      .filter((row) => !keep.has(String(row.label_en).trim().toLowerCase()))
      .map((row) => row.id);
    if (extraIds.length) {
      await supabase
        .from("ccshau_page_sidebar_items")
        .update({ is_active: false })
        .in("id", extraIds);
    }

    const { data: existingStaff, error: staffErr } = await supabase
      .from("ccshau_page_staff")
      .select("id, staff_slug, detail_content_en")
      .eq("page_id", page.id);
    if (staffErr) throw new Error(staffErr.message);
    const staffBySlug = new Map(
      (existingStaff || []).map((row) => [row.staff_slug, row]),
    );

    for (const row of userRows) {
      const userId = Number(row.id);
      const slug = `legacy-user-${userId}`;
      const current = staffBySlug.get(slug);
      const detail = hasMeaningfulDetail(row.other_activity)
        ? String(row.other_activity)
        : null;
      const payload = {
        page_id: page.id,
        member_type: "faculty",
        staff_slug: slug,
        name_en: personName(row),
        name_hi: null,
        designation_en: String(row.designation || "Faculty").slice(0, 500),
        designation_hi: null,
        specialization_en: row.specialization || null,
        qualification_en: row.qualification || null,
        email: row.email || null,
        mobile: row.contact_number || null,
        image_path: facultyPhotoUrl(row.profile_image),
        sort_order: Number(row.view_order) || userId,
        is_active: true,
      };
      if (detail && !String(current?.detail_content_en || "").trim()) {
        payload.detail_content_en = detail;
      }
      if (current?.id) {
        const { error } = await supabase
          .from("ccshau_page_staff")
          .update(payload)
          .eq("id", current.id);
        if (error) throw new Error(error.message);
        summary.staffUpdated += 1;
      } else {
        if (detail) payload.detail_content_en = detail;
        const { error } = await supabase.from("ccshau_page_staff").insert(payload);
        if (error) throw new Error(error.message);
        summary.staffInserted += 1;
      }
    }

    const contacts = [
      directorContacts.phone
        ? {
            label_en: "Office",
            label_hi: "कार्यालय",
            value_en: directorContacts.phone,
            value_hi: directorContacts.phone,
            sort_order: 1,
          }
        : null,
      directorContacts.email
        ? {
            label_en: "Email Id",
            label_hi: "ई-मेल आईडी",
            value_en: directorContacts.email,
            value_hi: directorContacts.email,
            sort_order: 2,
          }
        : null,
    ].filter(Boolean);

    if (contacts.length) {
      const { data: existingContacts, error: cErr } = await supabase
        .from("ccshau_page_contact_lines")
        .select("id, label_en")
        .eq("page_id", page.id);
      if (cErr) throw new Error(cErr.message);
      const contactByLabel = new Map(
        (existingContacts || []).map((row) => [
          String(row.label_en).trim().toLowerCase(),
          row,
        ]),
      );
      for (const line of contacts) {
        const current = contactByLabel.get(line.label_en.toLowerCase());
        const payload = { ...line, page_id: page.id, is_active: true };
        if (current?.id) {
          const { error } = await supabase
            .from("ccshau_page_contact_lines")
            .update(payload)
            .eq("id", current.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from("ccshau_page_contact_lines").insert(payload);
          if (error) throw new Error(error.message);
        }
        summary.contactsUpdated += 1;
      }
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, `apply-research-station-${COLLEGE_SLUG}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      {
        ...summary,
        finishedAt: new Date().toISOString(),
        directorContacts,
        sidebarLabels: sidebarItems.map((i) => i.labelEn),
        staffNames: userRows.map(personName),
      },
      null,
      2,
    ),
  );
  console.log(summary);
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
