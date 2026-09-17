/**
 * Rebuild MoU detail pages: full-document layout + correct titles.
 * Usage: node patch-mou-detail-pages.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");

const DETAILS = [
  {
    slug: "mous-hisar-washington",
    title:
      "Memorandum of Understanding between CCSHAU, Hisar and Washington State University Pullman, USA",
    date: "16Feb, 2019",
    excerpt: "For Cooperation in Agricultural Research and Education",
    img: "https://ccshau.blob.core.windows.net/ccshaucontainer/pages/international-linkage/mous-hisar-washington/KsSuktmuXFF6JzBZ39PzMUYxXAVFuZwkEhG8FFwV.jpeg",
  },
  {
    slug: "mous-hisar-tokyo",
    title:
      "Memorandum of Understanding between CCSHAU, Hisar and Tokyo University of Agriculture, Tokyo, Japan",
    date: "16Feb, 2019",
    excerpt: "For Cooperation in Agricultural Research and Education",
    img: "https://ccshau.blob.core.windows.net/ccshaucontainer/pages/international-linkage/mous-hisar-tokyo/Qzn97MJ6cHTCqVU38B1UB6eVhhhkZ9zpw10WCMq5.jpeg",
  },
  {
    slug: "mous-hisar-scoutland",
    title:
      "Memorandum of Understanding between CCSHAU, Hisar and The James Hutton Institute, Dundee, Scotland, UK",
    date: "16Feb, 2019",
    excerpt: "For Cooperation in Agricultural Research and Education",
    img: "https://ccshau.blob.core.windows.net/ccshaucontainer/pages/international-linkage/mous-hisar-scoutland/DxJOKEqVVgWiUWp4k7tFkvvU9FA5wkm335AQm9dF.jpeg",
  },
  {
    slug: "mous-hisar-nepal",
    title:
      "Memorandum of Understanding between CCSHAU, Hisar and Agriculture and Forestry University Rampur Chitwan, Nepal",
    date: "16Feb, 2019",
    excerpt: "For Cooperation in Agricultural Research and Education",
    img: "https://ccshau.blob.core.windows.net/ccshaucontainer/pages/international-linkage/mous-hisar-nepal/a0POZE9RK3cIuwTmfIDdFACYYlVOfQDS6SXDn5oT.jpeg",
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

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDetailHtml(card) {
  return sanitizeHtml(
    [
      `<section class="intl-linkage-detail">`,
      `<figure class="intl-linkage-detail__media"><img src="${escapeHtml(card.img)}" alt="${escapeHtml(card.title)}" class="intl-linkage-detail__image" loading="lazy" /></figure>`,
      `<p class="intl-linkage-detail__meta">${escapeHtml(card.date)}</p>`,
      `<p class="intl-linkage-detail__purpose">${escapeHtml(card.excerpt)}</p>`,
      `<p class="intl-linkage-detail__back"><a href="/pages/international-linkage">← Back to International Linkage</a></p>`,
      `</section>`,
    ].join("\n"),
    {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "section",
        "figure",
        "p",
        "a",
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["class", "id"],
        a: ["href", "class", "title"],
        img: ["src", "alt", "class", "loading"],
      },
      allowedSchemes: ["http", "https"],
    },
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const card of DETAILS) {
    const contentEn = buildDetailHtml(card);
    console.log(card.slug, "len", contentEn.length);
    if (!CONFIRM) continue;

    const { data: existing, error: findErr } = await sb
      .from("ccshau_pages")
      .select("id")
      .eq("slug", card.slug)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!existing?.id) throw new Error(`Missing ${card.slug}`);

    const { error } = await sb
      .from("ccshau_pages")
      .update({
        title_en: card.title,
        excerpt_en: card.excerpt,
        content_en: contentEn,
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`${card.slug}: ${error.message}`);
    console.log("updated", card.slug);
  }

  if (!CONFIRM) console.log("dry-run only; pass --confirm to write");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
