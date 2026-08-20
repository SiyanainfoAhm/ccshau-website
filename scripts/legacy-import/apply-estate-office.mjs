/**
 * Copy live Estate Office home (https://hau.ac.in/college/eo-cum-se) onto
 * /pages/estate-office and attach the Sections menu from college `eo-cum-se`.
 *
 * Usage:
 *   node apply-estate-office.mjs --dry-run
 *   node apply-estate-office.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const SLUG = "estate-office";
const COLLEGE_SLUG = "eo-cum-se";
const LIVE_URL = "https://hau.ac.in/college/eo-cum-se";
const COLLEGE_ID = "15b4a256-bda9-4908-8fe5-1af6076163ec";
const DEPARTMENT_ID = "53ed7025-d955-4a62-af09-7a7c38b6125e";
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

const SUBSECTION_ORDER = [
  ["ecs-house-allotment", 1],
  ["ecs-executive-engineer-electrical", 2],
  ["ecs-executive-engineer-ci", 3],
  ["ecs-executive-engineer-public-health", 4],
  ["ecs-executive-engineer-cii", 5],
  ["ecs-deputy-estate-officer", 6],
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
      .trim() || "Estate Officer-cum-Chief Engineer";

  return {
    contentEn: html,
    mailingAddress: mailingAddress || null,
    office,
    email,
    photoUrl,
    directorName,
    directorRole,
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
      "id, slug, title_en, page_type, layout_template, layout_config, college_root_id, featured_image_path, head_name_en, head_role_en, head_image_path",
    )
    .eq("slug", SLUG)
    .maybeSingle();
  if (pageErr) throw new Error(pageErr.message);
  if (!page?.id) throw new Error(`Missing page ${SLUG}`);

  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, featured_image_path, layout_config")
    .eq("id", COLLEGE_ID)
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college?.id || college.slug !== COLLEGE_SLUG) throw new Error(`Missing college ${COLLEGE_SLUG}`);

  const layoutConfig = {
    ...(page.layout_config && typeof page.layout_config === "object" ? page.layout_config : {}),
    hero: true,
    headOfficer: true,
    contacts: true,
    mainContent: true,
    staff: false,
    gallery: false,
    newsTicker: false,
    studentCorner: false,
    leftSidebar: false,
    rightSidebar: false,
    farmersCta: false,
    heroContactButton: true,
    collegeTopMenu: true,
  };

  const collegeLayout = {
    ...(college.layout_config && typeof college.layout_config === "object"
      ? college.layout_config
      : {}),
    collegeTopMenu: true,
    headOfficer: true,
    contacts: true,
    mainContent: true,
  };

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
    about.office
      ? {
          label_en: "Office",
          label_hi: "कार्यालय",
          value_en: about.office,
          value_hi: about.office,
          sort_order: 2,
        }
      : null,
    about.email
      ? {
          label_en: "Email Id",
          label_hi: "ई-मेल आईडी",
          value_en: about.email,
          value_hi: about.email,
          sort_order: 3,
        }
      : null,
  ].filter(Boolean);

  const pageUpdate = {
    content_en: about.contentEn,
    layout_template: "office_portal",
    layout_config: layoutConfig,
    college_root_id: null,
    office_cta_enabled: false,
    excerpt_en: "Estate Office (EO-cum-CE), CCS HAU.",
    head_name_en: about.directorName,
    head_role_en: about.directorRole,
  };
  if (about.photoUrl) pageUpdate.head_image_path = about.photoUrl;
  if (!page.featured_image_path && college.featured_image_path) {
    pageUpdate.featured_image_path = college.featured_image_path;
  }

  const { data: subsections, error: subErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug")
    .in(
      "slug",
      SUBSECTION_ORDER.map(([slug]) => slug),
    );
  if (subErr) throw new Error(subErr.message);
  const bySlug = new Map((subsections || []).map((row) => [row.slug, row]));
  const navUpdates = [
    {
      id: DEPARTMENT_ID,
      title_en: "Sections",
      title_hi: "अनुभाग",
      sort_order: 1,
    },
    { id: COLLEGE_ID, layout_config: collegeLayout },
  ];
  for (const [slug, sortOrder] of SUBSECTION_ORDER) {
    const row = bySlug.get(slug);
    if (!row) throw new Error(`Missing Estate Office section ${slug}`);
    navUpdates.push({ id: row.id, sort_order: sortOrder });
  }

  console.log(CONFIRM ? "apply" : "dry-run", SLUG);
  console.log("about chars", about.contentEn.length);
  console.log("director", about.directorName, about.directorRole);
  console.log("photo", about.photoUrl);
  console.log("contacts", contactLines.map((c) => `${c.label_en}: ${c.value_en}`));
  console.log("nav Departments -> Sections");
  console.log(about.contentEn.slice(0, 280));

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

    for (const payload of navUpdates) {
      const { id, ...patch } = payload;
      const { error } = await supabase.from("ccshau_pages").update(patch).eq("id", id);
      if (error) throw new Error(`${id}: ${error.message}`);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "apply-estate-office.json");
  writeFileSync(
    out,
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        liveUrl: LIVE_URL,
        slug: SLUG,
        about,
        pageUpdate: { ...pageUpdate, content_en: `[${about.contentEn.length} chars]` },
        navUpdates,
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
