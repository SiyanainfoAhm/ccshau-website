/**
 * Migrate a KVK college microsite from hau.ac.in into an existing ccshau_pages row.
 * Does not create pages — verifies slug exists first.
 *
 * Usage:
 *   node apply-kvk.mjs --slug=krishi-vigyan-kendra-bawal --dry-run
 *   node apply-kvk.mjs --slug=krishi-vigyan-kendra-bawal --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
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
const KVK_HIDE_CONTACTS = new Set([
  "krishi-vigyan-kendra-jhajjar",
  "krishi-vigyan-kendra-jind",
  "krishi-vigyan-kendra-kaithal",
  "krishi-vigyan-kendra-kurukshetra",
  "krishi-vigyan-kendra-mahendergarh",
  "krishi-vigyan-kendra-panipat",
  "krishi-vigyan-kendra-rohtak",
  "krishi-vigyan-kendra-sirsa",
  "krishi-vigyan-kendra-sonipat",
  "krishi-vigyan-kendra-mandkola-mewat",
  "krishi-vigyan-kendra-panchkula",
  "krishi-vigyan-kendra-ambala",
  "krishi-vigyan-kendra-karnal",
  "krishi-vigyan-kendra-nuh",
]);
const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";
const AZURE_PDF_BASE =
  "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf";
const LIVE_INTRO_BANNER = "https://hau.ac.in/public/images/intro.jpg";
const IMAGE_CACHE_DIR = join(REPORT_DIR, "hau-images-cache");

const HI_LABEL = {
  Faculty: "संकाय",
  "Mandate and Thurst Areas": "अधिदेश और थ्रस्ट क्षेत्र",
  "Mandate and Thurs Areas": "अधिदेश और थ्रस्ट क्षेत्र",
  "Extension Activities": "विस्तार गतिविधियाँ",
  "Awards & Honors": "पुरस्कार और सम्मान",
  "Awards and Honors": "पुरस्कार और सम्मान",
  Infrastructure: "अवसंरचना",
  "Production & Income": "उत्पादन और आय",
  "Other details": "अन्य विवरण",
  "Annual Progress Report": "वार्षिक प्रगति रिपोर्ट",
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
    "ul",
    "ol",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "style", "title"],
    a: ["href", "name", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "width", "height", "class", "loading"],
    td: ["colspan", "rowspan", "class", "style"],
    th: ["colspan", "rowspan", "class", "style", "scope"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

function stripSpamInjections(html) {
  return String(html || "")
    .replace(/<a\b[^>]*>\s*slot(?:\s+\w+)+\s*<\/a>/gi, "")
    .replace(
      /<div\b[^>]*id=["']college-fac-list["'][\s\S]*?<\/div>\s*/gi,
      "",
    )
    .trim();
}

function findCoordinatorMarker(pageHtml) {
  const patterns = [/Coordinator/i, /Krishi Vigyan Kendra/i, /Contact No/i];
  for (const pattern of patterns) {
    const idx = pageHtml.search(pattern);
    if (idx >= 0) return idx;
  }
  return -1;
}

function extractHomeHtml(pageHtml) {
  const marker = findCoordinatorMarker(pageHtml);
  if (marker < 0) throw new Error("Live page missing coordinator block");
  const tableStart = pageHtml.lastIndexOf("<table", marker);
  if (tableStart < 0) throw new Error("Live page missing coordinator table");
  const tableEnd = pageHtml.indexOf("</table>", marker);
  if (tableEnd < 0) throw new Error("Live page coordinator table is unclosed");
  const afterTable = tableEnd + "</table>".length;

  const cutCandidates = [
    pageHtml.search(/function getFaculty|getFaculty\(/i),
    pageHtml.search(/id=["']college-faculty["']/i),
    pageHtml.search(/id=["']faculty-detail["']/i),
    pageHtml.search(/id=["']college-fac-list["']/i),
    pageHtml.search(/<th[^>]*>\s*Image\s*<\/th>/i),
    pageHtml.search(/Quick Link/i),
    pageHtml.search(/Farmers' Portal/i),
  ].filter((idx) => idx > afterTable);
  let cutAt = cutCandidates.length ? Math.min(...cutCandidates) : afterTable + 20000;
  if (
    /college-faculty|faculty-detail|college-fac-list|<th[^>]*>\s*Image\s*<\/th>/i.test(
      pageHtml.slice(Math.max(afterTable, cutAt - 500), cutAt + 80),
    )
  ) {
    const tableBefore = pageHtml.lastIndexOf("<table", cutAt);
    if (tableBefore > afterTable) cutAt = tableBefore;
  }

  const raw = pageHtml
    .slice(tableStart, cutAt)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  return compactPhotoBioHtml(
    stripLegacyFacultyShell(
      stripSpamInjections(sanitizeHtml(raw, SANITIZE_OPTIONS)),
    ),
  ).trim();
}

function escapeHtmlText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractCoordinatorPhone(tableHtml) {
  const split = tableHtml.match(
    /Phone:<\/strong>\s*(\d)<\/p>([\d][\d\s/(),A-Za-z-]*)/i,
  );
  if (split) return `${split[1]}${split[2]}`.replace(/\s+/g, " ").trim();
  const labeled = tableHtml.match(
    /(?:Phone|Contact\s*No\.?)\s*:?\s*(?:<\/strong>\s*)?(\d[\d\s/()-]*(?:\([Mm]\))?)/i,
  );
  return labeled?.[1] ? labeled[1].replace(/\s+/g, " ").trim() : null;
}

function rewriteCoordinatorTable(html) {
  const source = String(html || "");
  const tableMatch = source.match(/<table\b[\s\S]*?<\/table>/i);
  if (!tableMatch) return source;
  const table = tableMatch[0];
  const img = table.match(/<img\b[^>]*>/i)?.[0];
  if (!img) return source;

  const email =
    table.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;
  const phone = extractCoordinatorPhone(table);
  const tds = [...table.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
  const bioRaw = tds.find((td) => !/<img\b/i.test(td)) || "";

  let text = bioRaw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|span)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
  if (email) text = text.replaceAll(email, " ");
  text = text
    .replace(/\be-?mail\s*:/gi, " ")
    .replace(/\b(?:phone|contact\s*no\.?)\s*:/gi, " ");
  if (phone) text = text.replace(phone, " ");

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line) return false;
      if (/^e-?mail:?$/i.test(line) || /^phone:?$/i.test(line)) return false;
      if (/^\d[\d\s/()-]*(\([Mm]\))?$/.test(line)) return false;
      return true;
    });

  const bioHtml = [
    ...lines.map((line) => `<p>${escapeHtmlText(line)}</p>`),
    email
      ? `<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>`
      : "",
    phone ? `<p><strong>Phone:</strong> ${escapeHtmlText(phone)}</p>` : "",
  ]
    .filter(Boolean)
    .join("");

  const nextTable = `<table><tbody><tr><td>${img}</td><td>${bioHtml}</td></tr></tbody></table>`;
  return source.replace(table, nextTable);
}

/** Collapse spacer markup in legacy photo + bio coordinator tables. */
function compactPhotoBioHtml(html) {
  return rewriteCoordinatorTable(html);
}

/** Remove empty legacy faculty directory markup scraped into About HTML. */
function stripLegacyFacultyShell(html) {
  return String(html || "")
    .replace(/<div\b[^>]*id=["']college-faculty["'][^>]*>[\s\S]*$/i, "")
    .replace(/<table\b[^>]*id=["']faculty-detail["'][^>]*>[\s\S]*?<\/table>/gi, "")
    .replace(/<table\b[^>]*>[\s\S]*?id=["']college-fac-list["'][\s\S]*?<\/table>/gi, "")
    .replace(
      /<div\b[^>]*id=["']college-facutly-biography["'][^>]*>[\s\S]*?<\/div>\s*/gi,
      "",
    )
    .replace(
      /<div\b[^>]*id=["']college-faculty-biography["'][^>]*>[\s\S]*?<\/div>\s*/gi,
      "",
    )
    .trim();
}

function parseCoordinatorContacts(html) {
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

function extractVisitAddress(pageHtml) {
  const block =
    pageHtml.match(/VISIT US[\s\S]*?<\/h2>([\s\S]*?)<\/div>/i)?.[1] ||
    pageHtml.match(/KRISHI VIGYAN KENDRA[\s\S]{0,400}?\d{6}/i)?.[0] ||
    "";
  return block
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function pdfHtml(url, label) {
  const safe = String(label || "Document")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<a href="${url}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${safe}</strong></span></a>`;
}

function prepareHtml(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  return sanitizeHtml(trimmed, SANITIZE_OPTIONS);
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

function contentTypeFor(fileName) {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function isRealFeaturedPath(path) {
  if (!path || path === "pending") return false;
  if (/legacy-pending/i.test(path)) return false;
  if (/\.php(\?|$)/i.test(path)) return false;
  if (/unsplash\.com/i.test(path)) return false;
  return (
    /ccshaucontainer\/pages\/(featured|hero)\//i.test(path) ||
    /legacy-images\/intro\.jpg$/i.test(path)
  );
}

async function ensureAzureFeaturedBanner(pageId) {
  const blobClient = getBlobServiceClient();
  const containerName =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER?.trim() ||
    "ccshaucontainer";
  const blobPath = `pages/featured/${pageId}/intro.jpg`;
  const stored = `${containerName}/${blobPath}`;
  if (!blobClient) return stored;

  const block = blobClient
    .getContainerClient(containerName)
    .getBlockBlobClient(blobPath);
  if (await block.exists()) return stored;

  mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
  const cachePath = join(IMAGE_CACHE_DIR, "intro.jpg");
  let bytes;
  if (existsSync(cachePath)) {
    bytes = await readFile(cachePath);
  } else {
    const res = await fetch(LIVE_INTRO_BANNER);
    if (!res.ok) throw new Error(`download intro.jpg failed: ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
    await writeFile(cachePath, bytes);
  }

  if (CONFIRM) {
    await block.uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: contentTypeFor("intro.jpg") },
    });
  }
  return stored;
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
    console.error("Missing --slug=krishi-vigyan-kendra-bawal");
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

  const { data: page, error: pageErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, layout_config, content_en, page_type, featured_image_path")
    .eq("slug", COLLEGE_SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page?.id) {
    throw new Error(`Page ${COLLEGE_SLUG} not found — create shell first, do not duplicate`);
  }

  const summary = {
    mode: CONFIRM ? "apply" : "dry-run",
    slug: COLLEGE_SLUG,
    pageId: page.id,
    legacyCollegeId: null,
    homeHtmlChars: 0,
    sidebarCount: 0,
    staffCount: 0,
    errors: [],
  };

  const conn = await mysqlConn();
  const [colleges] = await conn.query(
    `SELECT college_id, college_name, college_slug, college_banner
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

  const [userRows] = await conn.query(
    `SELECT id, first_name, last_name, email, designation, specialization,
            profile_image, view_order, role_id, contact_number, qualification, other_activity
     FROM users
     WHERE status = '1'
       AND FIND_IN_SET(?, REPLACE(college_id, ' ', ''))
     ORDER BY view_order, id`,
    [summary.legacyCollegeId],
  );
  await conn.end();

  const liveUrl = `https://hau.ac.in/college/${COLLEGE_SLUG}`;
  const liveRes = await fetch(liveUrl);
  if (!liveRes.ok) throw new Error(`Live page fetch failed: ${liveRes.status}`);
  const liveHtml = await liveRes.text();
  let homeHtml = extractHomeHtml(liveHtml);
  summary.homeHtmlChars = homeHtml.length;

  if (homeHtml.length < 200) {
    const { data: homePage } = await supabase
      .from("ccshau_pages")
      .select("content_en")
      .eq("college_root_id", page.id)
      .eq("slug", `home-${summary.legacyCollegeId}`)
      .maybeSingle();
    if (homePage?.content_en && homePage.content_en.length > homeHtml.length) {
      homeHtml = stripSpamInjections(prepareHtml(homePage.content_en));
      summary.homeHtmlChars = homeHtml.length;
      summary.errors.push("Used imported home-* CMS fallback");
    }
  }

  const coordinatorContacts = parseCoordinatorContacts(homeHtml);
  const visitAddress = extractVisitAddress(liveHtml);

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
    if (!label || /^faculty$/i.test(label)) continue;

    const fileName = row.file ? String(row.file).trim() : "";
    const rawHtml = row.page_content ? String(row.page_content).trim() : "";
    let contentEn = null;

    if (fileName) {
      try {
        const pdfUrl = await ensureAzurePdf(fileName);
        contentEn = pdfHtml(pdfUrl, label);
      } catch (e) {
        summary.errors.push(`${label} pdf: ${e.message || e}`);
        contentEn = pdfHtml(`${LEGACY_PDF_BASE}${fileName}`, label);
      }
    } else if (rawHtml) {
      contentEn = stripSpamInjections(prepareHtml(rawHtml)) || null;
    }

    if (!contentEn) {
      const cmsSlug = String(row.link || "")
        .replace(/^page\//, "")
        .trim();
      if (cmsSlug) {
        const { data: cmsPage } = await supabase
          .from("ccshau_pages")
          .select("content_en")
          .eq("slug", cmsSlug)
          .maybeSingle();
        if (cmsPage?.content_en) {
          const pdfMatch = cmsPage.content_en.match(/(\d+\.pdf)/i)?.[1];
          if (pdfMatch) {
            try {
              contentEn = pdfHtml(await ensureAzurePdf(pdfMatch), label);
            } catch {
              contentEn = cmsPage.content_en;
            }
          } else if (!/pending Phase 4 upload/i.test(cmsPage.content_en)) {
            contentEn = stripSpamInjections(prepareHtml(cmsPage.content_en));
          }
        }
      }
    }

    sidebarItems.push({
      labelEn: label,
      labelHi: HI_LABEL[label] || null,
      sortOrder: Number(row.display_order) + 1,
      contentEn,
    });
  }

  summary.sidebarCount = sidebarItems.length;
  summary.staffCount = userRows.length;

  const layoutConfig = {
    hero: true,
    headOfficer: false,
    contacts: !KVK_HIDE_CONTACTS.has(COLLEGE_SLUG),
    staff: true,
    gallery: false,
    newsTicker: false,
    studentCorner: false,
    mainContent: true,
    leftSidebar: false,
    rightSidebar: true,
    collegeTopMenu: false,
    farmersCta: true,
    heroContactButton: false,
  };

  console.log(`${summary.mode} ${COLLEGE_SLUG} (legacy ${summary.legacyCollegeId})`);
  console.log(`home html ${homeHtml.length} chars; sidebar ${sidebarItems.length}; staff ${userRows.length}`);
  for (const item of sidebarItems) {
    console.log(`  tab "${item.labelEn}": ${item.contentEn ? "content" : "empty"}`);
  }
  if (visitAddress) console.log("visit address:", visitAddress.slice(0, 120));

  if (CONFIRM) {
    const pageUpdate = {
      content_en: homeHtml,
      layout_config: layoutConfig,
      office_cta_enabled: true,
    };
    if (!isRealFeaturedPath(page.featured_image_path) && !college.college_banner) {
      pageUpdate.featured_image_path = await ensureAzureFeaturedBanner(page.id);
      summary.featuredImage = pageUpdate.featured_image_path;
    }

    const { error: pageUpdateErr } = await supabase
      .from("ccshau_pages")
      .update(pageUpdate)
      .eq("id", page.id);
    if (pageUpdateErr) throw new Error(pageUpdateErr.message);

    const { data: existingSidebar } = await supabase
      .from("ccshau_page_sidebar_items")
      .select("id, label_en")
      .eq("page_id", page.id);
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
      } else {
        const { error } = await supabase.from("ccshau_page_sidebar_items").insert(payload);
        if (error) throw new Error(error.message);
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

    const contacts = [
      visitAddress
        ? {
            label_en: "Address",
            label_hi: "पता",
            value_en: visitAddress,
            value_hi: visitAddress,
            sort_order: 0,
          }
        : null,
      coordinatorContacts.phone
        ? {
            label_en: "Office",
            label_hi: "कार्यालय",
            value_en: coordinatorContacts.phone,
            value_hi: coordinatorContacts.phone,
            sort_order: 1,
          }
        : null,
      coordinatorContacts.email
        ? {
            label_en: "Email Id",
            label_hi: "ई-मेल आईडी",
            value_en: coordinatorContacts.email,
            value_hi: coordinatorContacts.email,
            sort_order: 2,
          }
        : null,
    ].filter(Boolean);

    const { data: existingContacts } = await supabase
      .from("ccshau_page_contact_lines")
      .select("id, label_en")
      .eq("page_id", page.id);
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
        await supabase.from("ccshau_page_contact_lines").update(payload).eq("id", current.id);
      } else {
        await supabase.from("ccshau_page_contact_lines").insert(payload);
      }
    }

    // Phase 11 public reads use faculty_people + assignments (not page_staff).
    const { spawnSync } = await import("node:child_process");
    const seed = spawnSync(
      process.execPath,
      [
        join(__dirname, "seed-kvk-faculty.mjs"),
        `--slug=${COLLEGE_SLUG}`,
        "--confirm",
      ],
      { stdio: "inherit", cwd: __dirname },
    );
    if (seed.status !== 0) {
      throw new Error("seed-kvk-faculty failed — run manually with --confirm");
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, `apply-kvk-${COLLEGE_SLUG}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      {
        ...summary,
        coordinatorContacts,
        visitAddress,
        sidebarLabels: sidebarItems.map((i) => i.labelEn),
        staffNames: userRows.map(personName),
      },
      null,
      2,
    ),
  );
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
