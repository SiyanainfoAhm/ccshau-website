/**
 * Fix landscape-unit CMS HTML: restore Hindi (Devanagari) lost as "????" during import.
 * Source: https://hau.ac.in/page-data/land-scape-unit-1/21
 *
 * Usage: node fix-landscape-unit-hindi.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

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

function loadFromWeb(name) {
  const req = createRequire(join(ROOT, "apps/web/package.json"));
  return req(name);
}

const { createClient } = loadFromWeb("@supabase/supabase-js");
const sanitizeHtml = loadFromWeb("sanitize-html");

const SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
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
    "iframe",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "style", "title", "lang", "dir"],
    a: ["href", "name", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "width", "height", "class", "loading"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "class",
      "style",
      "allow",
      "allowfullscreen",
      "loading",
      "referrerpolicy",
      "sandbox",
      "frameborder",
      "name",
    ],
    td: ["colspan", "rowspan", "class", "style"],
    th: ["colspan", "rowspan", "class", "style", "scope"],
    col: ["span", "width", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

function rewriteLegacyHref(href) {
  const trimmed = String(href || "").trim();
  try {
    const url = new URL(trimmed, "https://hau.ac.in");
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "hau.ac.in") return trimmed;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const pageMatch = path.match(/^\/page\/([^/]+)$/);
    if (pageMatch?.[1]) return `/pages/${pageMatch[1]}`;
    const collegeMatch = path.match(/^\/college\/(.+)$/);
    if (collegeMatch?.[1]) return `/college/${collegeMatch[1]}`;
  } catch {
    // keep original
  }
  return trimmed;
}

function prepareHtml(raw) {
  return sanitizeHtml(String(raw || ""), {
    ...SANITIZE_OPTIONS,
    transformTags: {
      a: (tagName, attribs) => {
        const next = { ...attribs };
        if (next.href) {
          const rewritten = rewriteLegacyHref(next.href);
          next.href = rewritten;
          if (rewritten.startsWith("/") && !rewritten.startsWith("//")) {
            delete next.target;
            delete next.rel;
          }
        }
        return { tagName, attribs: next };
      },
      img: (tagName, attribs) => {
        const next = { ...attribs };
        if (next.alt === undefined) next.alt = "";
        if (next.src && next.src.startsWith("/storage/")) {
          next.src = `https://hau.ac.in${next.src}`;
        } else if (next.src && next.src.startsWith("storage/")) {
          next.src = `https://hau.ac.in/${next.src}`;
        }
        return { tagName, attribs: next };
      },
    },
  }).trim();
}

async function main() {
  if (!CONFIRM) {
    console.error("Usage: node fix-landscape-unit-hindi.mjs --confirm");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const liveRes = await fetch("https://hau.ac.in/page-data/land-scape-unit-1/21");
  if (!liveRes.ok) throw new Error(`Live fetch failed: ${liveRes.status}`);
  const live = await liveRes.json();
  const raw = String(live?.page_content || "");
  if (!/[\u0900-\u097F]/.test(raw)) {
    throw new Error("Live content missing Devanagari — aborting");
  }

  const html = prepareHtml(raw);
  if (!/[\u0900-\u097F]/.test(html)) {
    throw new Error("Sanitized HTML lost Devanagari — aborting");
  }
  if (html.includes("????")) {
    throw new Error("Sanitized HTML still has ???? — aborting");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: existing, error: findErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, content_en")
    .eq("slug", "landscape-unit")
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!existing?.id) throw new Error("landscape-unit page not found in Supabase");

  const before = String(existing.content_en || "");
  const { error } = await supabase
    .from("ccshau_pages")
    .update({
      content_en: html,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);

  console.log(
    JSON.stringify(
      {
        ok: true,
        id: existing.id,
        beforeLen: before.length,
        afterLen: html.length,
        beforeHadQ: before.includes("????"),
        afterHasDevanagari: /[\u0900-\u097F]/.test(html),
        sample: html.match(/[\u0900-\u097F][^<]{0,40}/)?.[0] ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
