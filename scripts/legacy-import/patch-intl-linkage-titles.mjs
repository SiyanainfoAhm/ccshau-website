/**
 * Update International Linkage listing card titles to partner names.
 * Usage: node patch-intl-linkage-titles.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const PAGE_ID = "e8fc1246-2a91-4669-91c7-7fed3646341f";
const CONFIRM = process.argv.includes("--confirm");

const PARTNER_BY_SLUG = {
  "mous-hisar-washington": "Washington State University, USA",
  "mous-hisar-tokyo": "Tokyo University of Agriculture, Japan",
  "mous-hisar-scoutland": "The James Hutton Institute, Scotland, UK",
  "mous-hisar-nepal": "Agriculture and Forestry University, Nepal",
};

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

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function patchTitles(html) {
  let next = html;
  for (const [slug, partner] of Object.entries(PARTNER_BY_SLUG)) {
    const re = new RegExp(
      `(id="${slug}"[\\s\\S]*?class="intl-linkage-card__title"[^>]*>)([^<]*)(</h2>)`,
      "i",
    );
    if (!re.test(next)) {
      console.warn("no title match for", slug);
      continue;
    }
    next = next.replace(re, `$1${escapeHtml(partner)}$3`);
    console.log("title ->", slug, partner);
  }
  return next;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("ccshau_pages")
    .select("id,content_en")
    .eq("id", PAGE_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.content_en) throw new Error("Missing page content");

  const contentEn = patchTitles(data.content_en);
  if (!CONFIRM) {
    console.log("dry-run ok; pass --confirm to write");
    return;
  }

  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      content_en: contentEn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", PAGE_ID);
  if (upErr) throw new Error(upErr.message);
  console.log("updated international-linkage titles");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
