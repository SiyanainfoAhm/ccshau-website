/**
 * Copy live DSW home (https://hau.ac.in/college/dsw) onto
 * /college/directorate-of-students-welfare and attach the DSW Sections menu
 * that currently sits on the duplicate college slug `dsw`.
 *
 * Usage:
 *   node apply-dsw-about.mjs --dry-run
 *   node apply-dsw-about.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const SLUG = "directorate-of-students-welfare";
const SOURCE_SLUG = "dsw";
const LIVE_URL = "https://hau.ac.in/college/dsw";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

const TARGET_ID = "63798b58-0b9a-4243-bfc7-6e5f15d5e23f";
const SOURCE_ID = "891e3cb6-2553-4f40-93a3-af064c0764a0";
const DEPARTMENT_ID = "02a7bbb0-570e-46e5-ab97-77db0c2be098";
const GALLERY_ID = "49386b4a-fbda-4471-996a-7968086bd8e3";
const ALUMNI_ID = "414babd5-f7b1-493f-b903-f4455846ac80";
const NSS_GALLERY_ID = "77212cb1-2a47-4684-a49e-b765e7dfb4e2";
const NSS_ID = "38496075-0a01-4482-a741-1c6e114ce4b6";

const SUBSECTION_ORDER = [
  ["dsw-accommodation", 1],
  ["dsw-art-graphics", 2],
  ["dsw-counseling-placement", 3],
  ["dsw-dramatics-music-club", 4],
  ["dsw-literary-society", 5],
  ["dsw-mountaineering-club", 6],
  ["dsw-national-cadet-corps", 7],
  ["dsw-national-service-scheme", 8],
  ["dsw-national-service-scheme-bawal", 9],
  ["dsw-sports-activity", 10],
  ["dsw-national-cadet-corps-kaul", 11],
  ["dsw-young-journalism-cell", 12],
  ["dsw-national-service-scheme-kaul", 13],
  ["dsw-youth-red-cross", 14],
];

const HIDDEN_FROM_DROPDOWN = new Set([
  "dsw-national-service-scheme-kaul",
  "dsw-youth-red-cross",
]);

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
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h2", "h3", "h4", "span"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style"],
    a: ["href", "target", "rel", "class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
};

function stripSpamInjections(html) {
  return String(html || "")
    .replace(/<a\b[^>]*>\s*slot(?:\s+\w+)+\s*<\/a>/gi, "")
    .replace(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>\s*https?:\/\/[^<]+<\/a>/gi, "")
    .replace(/<a\b[^>]*>\s*<\/a>/gi, "");
}

function decodeMultiline(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/Hayana/gi, "Haryana");
}

function tidyPhone(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+$/g, "")
    .trim();
}

function extractAbout(pageHtml) {
  const block = pageHtml.match(
    /class="row\s+colgheading"[\s\S]*?<div class="col-lg-12">([\s\S]*?)<\/div>\s*<\/div>/i,
  );
  if (!block?.[1]) throw new Error("Live page missing about body");
  let html = stripSpamInjections(sanitizeHtml(block[1], SANITIZE_OPTIONS));
  html = html
    .replace(/background:\s*rgb\(\s*204\s*,\s*249\s*,\s*204\s*\);?/gi, "")
    .replace(/style=""/g, "")
    .replace(/<p\b[^>]*>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
    .trim();
  const textLen = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
  if (textLen < 80) throw new Error("About body too short");

  const addressRaw =
    pageHtml.match(/Mailing Address[\s\S]*?<p>([\s\S]*?)<\/p>/i)?.[1] || "";
  const mailingFull = decodeMultiline(addressRaw);
  const mailingAddress = mailingFull
    .split("\n")
    .filter((line) => !/^(office|fax\s*no|mobile)\s*:/i.test(line))
    .join("\n")
    .trim();
  const mobile =
    tidyPhone(mailingFull.match(/Mobile\s*:\s*([0-9+\-\s/,]+)/i)?.[1]) ||
    tidyPhone(pageHtml.match(/Mobile\s*:\s*([0-9+\-\s/,]+)/i)?.[1]) ||
    null;
  const office =
    tidyPhone(mailingFull.match(/Office\s*:\s*([0-9+\-\s/,]+)/i)?.[1]) ||
    tidyPhone(pageHtml.match(/Office\s*:\s*([0-9+\-\s/,]+)/i)?.[1]) ||
    null;
  const email =
    pageHtml.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    pageHtml.match(/Email Id\s*:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    null;
  const photoUrl =
    pageHtml.match(
      /https:\/\/hau\.ac\.in\/storage\/app\/uploads\/college-user\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)/i,
    )?.[0] || null;
  const directorName =
    pageHtml
      .match(/<h4[^>]*>\s*([^<]+)\s*<\/h4>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() || null;
  const directorRole =
    pageHtml
      .match(/single-item-text-info[\s\S]*?<span>\s*([^<]+)\s*<\/span>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() || "Director";

  return {
    contentEn: html,
    mailingAddress: mailingAddress || null,
    mobile,
    office,
    email,
    photoUrl,
    directorName,
    directorRole,
  };
}

function mergeLayout(existing, patch) {
  return {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...patch,
  };
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
  const about = extractAbout(await liveRes.text());

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error: pageErr } = await supabase
    .from("ccshau_pages")
    .select(
      "id, slug, title_en, page_type, layout_template, layout_config, featured_image_path, head_name_en, head_role_en, head_image_path",
    )
    .eq("id", TARGET_ID)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page?.id || page.slug !== SLUG) throw new Error(`Missing page ${SLUG}`);

  const { data: source, error: sourceErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, featured_image_path, head_image_path")
    .eq("id", SOURCE_ID)
    .maybeSingle();
  if (sourceErr) throw new Error(sourceErr.message);
  if (!source?.id || source.slug !== SOURCE_SLUG) throw new Error(`Missing source college ${SOURCE_SLUG}`);

  const { data: treePages, error: treeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, parent_id, college_root_id, layout_config, sort_order")
    .or(`id.in.(${DEPARTMENT_ID},${GALLERY_ID},${ALUMNI_ID},${NSS_GALLERY_ID}),college_root_id.eq.${SOURCE_ID}`);
  if (treeErr) throw new Error(treeErr.message);
  const byId = new Map((treePages || []).map((row) => [row.id, row]));
  const bySlug = new Map((treePages || []).map((row) => [row.slug, row]));
  for (const id of [DEPARTMENT_ID, GALLERY_ID, ALUMNI_ID, NSS_GALLERY_ID, NSS_ID]) {
    if (![...byId.keys()].includes(id) && id !== NSS_ID) {
      const { data: extra, error } = await supabase
        .from("ccshau_pages")
        .select("id, slug, title_en, parent_id, college_root_id, layout_config, sort_order")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!extra) throw new Error(`Missing page ${id}`);
      byId.set(extra.id, extra);
      bySlug.set(extra.slug, extra);
    }
  }
  if (!bySlug.get("dsw-national-service-scheme") && !byId.get(NSS_ID)) {
    const { data: nss, error } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, college_root_id, layout_config, sort_order")
      .eq("id", NSS_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!nss) throw new Error("Missing NSS page");
    byId.set(nss.id, nss);
    bySlug.set(nss.slug, nss);
  }

  for (const [slug] of SUBSECTION_ORDER) {
    if (!bySlug.get(slug)) throw new Error(`Missing DSW section ${slug}`);
  }

  const layoutConfig = mergeLayout(page.layout_config, {
    hero: true,
    headOfficer: true,
    contacts: true,
    mainContent: true,
    staff: false,
    gallery: false,
    newsTicker: true,
    studentCorner: true,
    leftSidebar: false,
    rightSidebar: false,
    farmersCta: false,
    heroContactButton: true,
    collegeTopMenu: true,
  });

  const contactLines = [
    about.mailingAddress
      ? {
          label_en: "Mailing Address",
          label_hi: "डाक पता",
          value_en: about.mailingAddress,
          value_hi: about.mailingAddress,
          sort_order: 1,
        }
      : null,
    about.mobile
      ? {
          label_en: "Mobile",
          label_hi: "मोबाइल",
          value_en: about.mobile,
          value_hi: about.mobile,
          sort_order: 2,
        }
      : null,
    about.office
      ? {
          label_en: "Office",
          label_hi: "कार्यालय",
          value_en: about.office,
          value_hi: about.office,
          sort_order: 3,
        }
      : null,
    about.email
      ? {
          label_en: "Email Id",
          label_hi: "ई-मेल आईडी",
          value_en: about.email,
          value_hi: about.email,
          sort_order: 4,
        }
      : null,
    {
      label_en: "College",
      label_hi: "महाविद्यालय",
      value_en: "DSW",
      value_hi: "डीएसडब्ल्यू",
      sort_order: 10,
    },
    {
      label_en: "Address",
      label_hi: "पता",
      value_en: "Director of Student Welfare, CCS HAU, Hisar",
      value_hi: "Director of Student Welfare, CCS HAU, Hisar",
      sort_order: 11,
    },
    {
      label_en: "Phone",
      label_hi: "फोन",
      value_en: "260507",
      value_hi: "260507",
      sort_order: 12,
    },
  ].filter(Boolean);

  const pageUpdate = {
    content_en: about.contentEn,
    layout_template: "college_home",
    layout_config: layoutConfig,
    excerpt_en: "Directorate of Students Welfare, CCS HAU.",
    head_name_en: about.directorName,
    head_role_en: about.directorRole,
  };
  if (about.photoUrl) pageUpdate.head_image_path = about.photoUrl;
  if (!page.featured_image_path && source.featured_image_path) {
    pageUpdate.featured_image_path = source.featured_image_path;
  }

  const navUpdates = [
    {
      id: DEPARTMENT_ID,
      parent_id: TARGET_ID,
      college_root_id: TARGET_ID,
      title_en: "DSW Sections",
      title_hi: "डीएसडब्ल्यू अनुभाग",
      sort_order: 1,
    },
    {
      id: ALUMNI_ID,
      parent_id: TARGET_ID,
      college_root_id: TARGET_ID,
      title_en: "Alumni Ass. Executive Committee",
      title_hi: "पूर्व छात्र संघ कार्यकारिणी समिति",
      sort_order: 2,
    },
    {
      id: GALLERY_ID,
      parent_id: TARGET_ID,
      college_root_id: TARGET_ID,
      sort_order: 3,
    },
    {
      id: NSS_GALLERY_ID,
      parent_id: NSS_ID,
      college_root_id: TARGET_ID,
    },
  ];

  const reparentIds = (treePages || [])
    .filter((row) => row.college_root_id === SOURCE_ID && row.id !== SOURCE_ID)
    .map((row) => row.id);

  for (const [slug, sortOrder] of SUBSECTION_ORDER) {
    const row = bySlug.get(slug);
    const layout = mergeLayout(row.layout_config, {
      showInDepartmentsMenu: !HIDDEN_FROM_DROPDOWN.has(slug),
    });
    navUpdates.push({
      id: row.id,
      college_root_id: TARGET_ID,
      sort_order: sortOrder,
      layout_config: layout,
    });
  }

  console.log(CONFIRM ? "apply" : "dry-run", SLUG);
  console.log("about chars", about.contentEn.length);
  console.log("director", about.directorName, about.directorRole);
  console.log("photo", about.photoUrl);
  console.log("contacts", contactLines.map((c) => `${c.label_en}: ${c.value_en}`));
  console.log("featured", page.featured_image_path, "->", pageUpdate.featured_image_path ?? page.featured_image_path);
  console.log("reparent college_root_id", SOURCE_SLUG, "->", SLUG, "pages", reparentIds.length);
  console.log("nav", "Departments -> DSW Sections; Alumni + Gallery attached");
  console.log(
    "subsection order",
    SUBSECTION_ORDER.map(([slug, order]) => `${order}. ${slug}${HIDDEN_FROM_DROPDOWN.has(slug) ? " (hidden)" : ""}`),
  );
  console.log(about.contentEn.slice(0, 400));

  if (CONFIRM) {
    const { error: pageUpdateErr } = await supabase
      .from("ccshau_pages")
      .update(pageUpdate)
      .eq("id", page.id);
    if (pageUpdateErr) throw new Error(pageUpdateErr.message);

    const { data: existing, error: cErr } = await supabase
      .from("ccshau_page_contact_lines")
      .select("id, label_en")
      .eq("page_id", page.id);
    if (cErr) throw new Error(cErr.message);
    const byLabel = new Map(
      (existing || []).map((row) => [String(row.label_en).trim().toLowerCase(), row]),
    );
    const keep = new Set();
    for (const line of contactLines) {
      const key = line.label_en.toLowerCase();
      keep.add(key);
      const current = byLabel.get(key);
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
    }
    const extraIds = (existing || [])
      .filter((row) => !keep.has(String(row.label_en).trim().toLowerCase()))
      .map((row) => row.id);
    if (extraIds.length) {
      await supabase
        .from("ccshau_page_contact_lines")
        .update({ is_active: false })
        .in("id", extraIds);
    }

    const leftoverIds = reparentIds.filter((id) => !navUpdates.some((u) => u.id === id));
    if (leftoverIds.length) {
      const { error } = await supabase
        .from("ccshau_pages")
        .update({ college_root_id: TARGET_ID })
        .in("id", leftoverIds);
      if (error) throw new Error(`reparent leftovers: ${error.message}`);
    }

    for (const payload of navUpdates) {
      const { id, college_root_id, ...patch } = payload;
      const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", id);
      if (error) throw new Error(`${id}: ${error.message}`);
      if (college_root_id) {
        const { error: rootErr } = await supabase
          .from("ccshau_pages")
          .update({ college_root_id })
          .eq("id", id);
        if (rootErr) throw new Error(`${id} college_root_id: ${rootErr.message}`);
      }
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-dsw-about.json");
  writeFileSync(
    out,
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        liveUrl: LIVE_URL,
        slug: SLUG,
        about,
        layoutConfig,
        pageUpdate: { ...pageUpdate, content_en: `[${about.contentEn.length} chars]` },
        navUpdates,
        reparentIds,
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
