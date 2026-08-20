/**
 * Migrate Major Initiative college microsites from hau.ac.in → /college/{slug}
 *
 *   sports-facilities (59)
 *   experiential-learning-programme (58)
 *   deendayal-upadhyay-centre-of-excellence-for-organic-farming (46)
 *   agri-tourism-center (45)
 *
 * Usage:
 *   node apply-major-initiative-colleges.mjs --dry-run
 *   node apply-major-initiative-colleges.mjs --confirm
 *   node apply-major-initiative-colleges.mjs --confirm --only=sports-facilities
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const PDF_CACHE = join(REPORT_DIR, "hau-pages-pdf-cache");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run") || !CONFIRM;
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg
  ? onlyArg
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

const LEGACY_PDF_BASE = "https://hau.ac.in/public/pages-pdf/";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const COLLEGES = [
  {
    slug: "sports-facilities",
    legacyId: 59,
    pageId: "bf8bef31-42b3-4a76-8fdb-7ae882d01ae4",
    title_en: "Sports Facilities",
    title_hi: "खेल सुविधाएँ",
    homeSlug: "home-36",
    departmentSlug: "sf-department",
    contact: {
      mailing:
        "Giri Centre for Sports Activities\nCCS Haryana Agricultural University\nHisar - 125 004",
      office: null,
      email: null,
    },
  },
  {
    slug: "experiential-learning-programme",
    legacyId: 58,
    pageId: "25271522-2df4-4200-9d1d-34a7aaa89d2a",
    title_en: "Experiential Learning Programme",
    title_hi: "अनुभवात्मक अधिगम कार्यक्रम",
    homeSlug: "home-35",
    departmentSlug: "elp-department",
    contact: {
      mailing:
        "Extension Education and Communication Management\nCollege of Home Science\nCCS Haryana Agricultural University\nHisar - 125 004",
      office: null,
      email: null,
    },
  },
  {
    slug: "deendayal-upadhyay-centre-of-excellence-for-organic-farming",
    legacyId: 46,
    pageId: "0d68f527-6616-4578-ae9f-dd69b94144fe",
    title_en: "Deendayal Upadhyay Centre Of Excellence For Organic Farming",
    title_hi: "दीनदयाल उपाध्याय उत्कृष्टता केंद्र (जैविक खेती)",
    homeSlug: "home-30",
    departmentSlug: "dueof-department",
    contact: {
      mailing:
        "Deendayal Upadhyay Centre Of Excellence For Organic Farming\nCCS Haryana Agricultural University\nHisar - 125 004",
      office: null,
      email: null,
    },
  },
  {
    slug: "agri-tourism-center",
    legacyId: 45,
    pageId: "6c837a4d-697c-4f29-beff-6cd16c1d57ab",
    title_en: "Agri-tourism center",
    title_hi: "एग्री-टूरिज्म केंद्र",
    homeSlug: "home-31",
    departmentSlug: "at-department",
    contact: {
      mailing: "Near Gate No. 4\nCCS Haryana Agricultural University\nHisar",
      office: null,
      email: null,
    },
  },
];

function loadEnv(path) {
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

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const sanitizeHtml = requireFromWeb("sanitize-html");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

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
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "id", "title", "lang", "dir"],
    a: ["href", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "width", "height", "class", "style", "loading"],
    td: ["colspan", "rowspan", "class", "style", "align", "valign", "width", "bgcolor"],
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
      "allow",
    ],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedIframeHostnames: [
    "hau.ac.in",
    "www.hau.ac.in",
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
  ],
  allowProtocolRelative: false,
};

function stripSpam(html) {
  return String(html || "")
    .replace(/<a\b[^>]*>\s*slot(?:\s+\w+)+\s*<\/a>/gi, "")
    .replace(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>\s*https?:\/\/[^<]+<\/a>/gi, "")
    .replace(/<a\b[^>]*>\s*<\/a>/gi, "");
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
  html = html.replace(/src=(["'])\/\//g, "src=$1https://");
  html = html.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/page\/([^"'\\\s>#]+)/gi,
    (_m, slug) => `/pages/${slug}`,
  );
  html = html.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/college\/([^"'\\\s>#]+)/gi,
    (_m, slug) => `/college/${slug}`,
  );
  return stripSpam(sanitizeHtml(html, SANITIZE_OPTIONS)).trim();
}

function decodeLabel(s) {
  return String(s || "")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function mergeLayout(existing, patch) {
  return {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...patch,
  };
}

async function fetchPageData(slug, collegeId) {
  for (const id of [collegeId, 0]) {
    const res = await fetch(`https://hau.ac.in/page-data/${slug}/${id}`);
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

function parseQuickLinks(liveHtml, collegeId) {
  const items = [];
  const seen = new Set();
  const re = new RegExp(
    `getPageDetail\\('${collegeId}','([^']+)'\\)[^>]*>([^<]+)`,
    "gi",
  );
  let m;
  while ((m = re.exec(liveHtml)) !== null) {
    const path = m[1];
    const label = decodeLabel(m[2]);
    const legacySlug = path.replace(/^page\//, "");
    const key = `${legacySlug}|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ legacySlug, label });
  }
  return items;
}

async function ensureAzurePdf(containerClient, fileName) {
  const blobPath = `pages-pdf/${fileName}`;
  const azureUrl = `https://ccshau.blob.core.windows.net/${CONTAINER}/${blobPath}`;
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) return azureUrl;

  mkdirSync(PDF_CACHE, { recursive: true });
  const cachePath = join(PDF_CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const r = await fetch(`${LEGACY_PDF_BASE}${fileName}`);
    if (!r.ok) throw new Error(`PDF ${fileName}: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 100) throw new Error(`PDF too small ${fileName}`);
    await writeFile(cachePath, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
  });
  return azureUrl;
}

function pdfViewerHtml(url, title) {
  return `<iframe src="${url}" title="${title}" width="100%" height="720" loading="lazy"></iframe>`;
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
    label_hi: item.label_hi ?? null,
    href: item.href ?? null,
    linked_page_id: null,
    content_en: item.content_en ?? null,
    content_hi: null,
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

async function upsertChildPage(supabase, payload) {
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
      page_type: "standard",
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert ${payload.slug}: ${error.message}`);
  return inserted.id;
}

async function migrateCollege(supabase, containerClient, cfg) {
  const liveHtml = await (await fetch(`https://hau.ac.in/college/${cfg.slug}`)).text();
  const menu = parseQuickLinks(liveHtml, cfg.legacyId);
  if (!menu.length) throw new Error(`${cfg.slug}: no quick links found`);

  const homeData = await fetchPageData(cfg.homeSlug, cfg.legacyId);
  if (!homeData?.page_content) throw new Error(`${cfg.slug}: home missing`);
  const homeHtml = cmsHtml(homeData.page_content);
  if (homeHtml.length < 80) throw new Error(`${cfg.slug}: home HTML too short`);

  const rootLayout = {
    hero: true,
    headOfficer: false,
    contacts: Boolean(cfg.contact?.mailing),
    mainContent: true,
    staff: false,
    gallery: false,
    newsTicker: false,
    studentCorner: false,
    leftSidebar: false,
    rightSidebar: true,
    farmersCta: false,
    heroContactButton: true,
    collegeTopMenu: false,
    showInDepartmentsMenu: false,
  };

  const innerLayout = {
    ...rootLayout,
    contacts: false,
    heroContactButton: false,
    rightSidebar: true,
  };

  const quickLinks = [];
  let sort = 1;
  for (const item of menu) {
    const isHome = item.legacySlug === cfg.homeSlug || /^home$/i.test(item.label);
    if (isHome) {
      quickLinks.push({
        label_en: "Home",
        label_hi: "होम",
        href: null,
        content_en: homeHtml,
        sort_order: sort++,
      });
      continue;
    }

    const data = await fetchPageData(item.legacySlug, cfg.legacyId);
    let content = "";
    if (data?.file) {
      const azureUrl = CONFIRM
        ? await ensureAzurePdf(containerClient, data.file)
        : `${LEGACY_PDF_BASE}${data.file}`;
      content = pdfViewerHtml(azureUrl, item.label);
    } else {
      content = cmsHtml(data?.page_content || "");
    }
    if (!content || content.length < 20) {
      console.warn(`  skip empty: ${item.label}`);
      continue;
    }

    // Also keep a child page under college root for deep links / admin
    const childSlug = item.legacySlug;
    if (CONFIRM) {
      await upsertChildPage(supabase, {
        slug: childSlug,
        title_en: data?.page_title || item.label,
        title_hi: null,
        parent_id: cfg.pageId,
        college_root_id: cfg.pageId,
        sort_order: sort,
        layout_template: "standard",
        layout_config: innerLayout,
        content_en: content,
        excerpt_en: `${item.label} — ${cfg.title_en}.`,
        status: "published",
        published_at: new Date().toISOString(),
      });
    }

    quickLinks.push({
      label_en: item.label,
      label_hi: null,
      href: null,
      content_en: content,
      sort_order: sort++,
    });
  }

  console.log(
    `  home=${homeHtml.length} chars | quickLinks=${quickLinks.map((q) => q.label_en).join(" | ")}`,
  );

  if (!CONFIRM) return { slug: cfg.slug, quickLinks: quickLinks.length, homeLen: homeHtml.length };

  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, layout_config, featured_image_path")
    .eq("id", cfg.pageId)
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college?.id) throw new Error(`Missing page ${cfg.slug}`);

  const { error: rootErr } = await supabase
    .from("ccshau_pages")
    .update({
      title_en: cfg.title_en,
      title_hi: cfg.title_hi,
      content_en: homeHtml,
      excerpt_en: `${cfg.title_en} — CCS HAU Hisar.`,
      page_type: "college",
      layout_template: "office_portal",
      layout_config: mergeLayout(college.layout_config, rootLayout),
      college_root_id: cfg.pageId,
      parent_id: null,
      status: "published",
      office_cta_enabled: false,
      published_at: new Date().toISOString(),
    })
    .eq("id", cfg.pageId);
  if (rootErr) throw new Error(rootErr.message);

  // Hide bogus Phase-2 department child
  if (cfg.departmentSlug) {
    await supabase
      .from("ccshau_pages")
      .update({
        status: "draft",
        layout_config: { showInDepartmentsMenu: false, collegeTopMenu: false },
      })
      .eq("slug", cfg.departmentSlug)
      .eq("parent_id", cfg.pageId);
  }

  await supabase
    .from("ccshau_page_sidebar_items")
    .update({ is_active: false })
    .eq("page_id", cfg.pageId)
    .eq("side", "right");

  for (const item of quickLinks) {
    await upsertSidebar(supabase, cfg.pageId, item);
  }

  if (cfg.contact?.mailing) {
    await upsertContact(supabase, cfg.pageId, {
      label_en: "Mailing Address",
      label_hi: "डाक पता",
      value_en: cfg.contact.mailing,
      value_hi: cfg.contact.mailing,
      sort_order: 1,
    });
  }
  if (cfg.contact?.office) {
    await upsertContact(supabase, cfg.pageId, {
      label_en: "Office",
      label_hi: "कार्यालय",
      value_en: cfg.contact.office,
      value_hi: cfg.contact.office,
      sort_order: 2,
    });
  }
  if (cfg.contact?.email) {
    await upsertContact(supabase, cfg.pageId, {
      label_en: "Email Id",
      label_hi: "ई-मेल आईडी",
      value_en: cfg.contact.email,
      value_hi: cfg.contact.email,
      sort_order: 3,
    });
  }

  return {
    slug: cfg.slug,
    quickLinks: quickLinks.map((q) => ({
      label: q.label_en,
      chars: q.content_en?.length || 0,
    })),
    homeLen: homeHtml.length,
  };
}

async function main() {
  if (!CONFIRM && !process.argv.includes("--dry-run")) {
    console.error("Use --dry-run or --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const containerClient = CONFIRM
    ? BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER)
    : null;

  const selected = COLLEGES.filter((c) => !ONLY || ONLY.includes(c.slug));
  if (!selected.length) throw new Error("No colleges selected");

  console.log(DRY_RUN ? "dry-run" : "apply", "major-initiative-colleges");
  const results = [];
  for (const cfg of selected) {
    console.log(`\n=== ${cfg.slug} (legacy ${cfg.legacyId}) ===`);
    const result = await migrateCollege(supabase, containerClient, cfg);
    results.push(result);
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-major-initiative-colleges.json");
  writeFileSync(
    out,
    JSON.stringify({ mode: CONFIRM ? "apply" : "dry-run", results }, null, 2),
  );
  console.log("\nReport:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
