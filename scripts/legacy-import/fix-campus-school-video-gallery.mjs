/**
 * Refresh Campus School Video Gallery HTML from live HAU
 * and normalize YouTube embeds to https://
 *
 * Usage: node fix-campus-school-video-gallery.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const PAGE_ID = "fd41ef75-5ee6-493b-a3b1-5eba65872316";

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
const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const sanitizeHtml = requireFromWeb("sanitize-html");

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
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "id", "title"],
    a: ["href", "target", "rel", "class", "title"],
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
      "referrerpolicy",
    ],
    td: ["colspan", "rowspan", "class", "style", "width", "align"],
    th: ["colspan", "rowspan", "class", "style", "width", "align"],
    table: ["border", "cellpadding", "cellspacing", "class", "style", "width"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedIframeHostnames: [
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
  ],
  allowProtocolRelative: false,
  transformTags: {
    iframe: (tagName, attribs) => {
      const next = { ...attribs };
      if (next.src?.startsWith("//")) next.src = `https:${next.src}`;
      if (!next.title?.trim()) next.title = "YouTube video";
      return { tagName, attribs: next };
    },
  },
};

async function main() {
  if (!CONFIRM) {
    console.error("Usage: node fix-campus-school-video-gallery.mjs --confirm");
    process.exit(1);
  }

  const live = await fetch("https://hau.ac.in/page-data/video-gallery/52");
  const data = await live.json();
  let raw = String(data?.page_content || "");
  raw = raw.replace(/src=(["'])\/\//g, "src=$1https://");
  const html = sanitizeHtml(raw, SANITIZE_OPTIONS).trim();
  const iframeCount = (html.match(/<iframe\b/gi) || []).length;
  if (iframeCount < 1) throw new Error("No YouTube iframes after sanitize");

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { error } = await sb
    .from("ccshau_pages")
    .update({
      content_en: html,
      title_en: "Video Gallery",
      title_hi: "वीडियो गैलरी",
      status: "published",
      layout_config: {
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
        showInDepartmentsMenu: false,
      },
    })
    .eq("id", PAGE_ID);
  if (error) throw new Error(error.message);

  mkdirSync(join(__dirname, "reports"), { recursive: true });
  const out = join(__dirname, "reports", "fix-campus-school-video-gallery.json");
  writeFileSync(
    out,
    JSON.stringify({ ok: true, iframeCount, len: html.length, embeds: [...html.matchAll(/youtube\.com\/embed\/([^"?]+)/gi)].map((m) => m[1]) }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, iframeCount, report: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
