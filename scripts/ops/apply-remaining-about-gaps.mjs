#!/usr/bin/env node
/**
 * Force-fix remaining about content_hi gaps (machine translate + phrase fallback).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasDevanagari, translateAboutHtmlPhrase, needsHi } from "./department-hindi-shared.mjs";
import { translateHtmlEnToHi, translatePlainEnToHi, sleep } from "./translate-en-hi.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const TARGET_SLUGS = new Set(
  (process.argv.find((a) => a.startsWith("--slugs="))?.split("=")[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function resolveHi(contentEn) {
  const phrase = translateAboutHtmlPhrase(contentEn);
  if (phrase && hasDevanagari(phrase)) return phrase;
  const html = await translateHtmlEnToHi(contentEn);
  if (html && hasDevanagari(html)) return html;
  const plain = contentEn.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const plainHi = await translatePlainEnToHi(plain);
  if (plainHi && hasDevanagari(plainHi)) {
    return contentEn.includes("<") ? `<p>${plainHi}</p>` : plainHi;
  }
  return null;
}

const { data: all } = await supabase.from("ccshau_pages").select("id,slug,college_root_id").eq("page_type", "college");
const roots = (all ?? []).filter((p) => p.college_root_id === p.id);

let planned = 0;
let updated = 0;

for (const college of roots) {
  const { data: depts } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en, content_hi")
    .eq("college_root_id", college.id)
    .eq("layout_template", "office_portal")
    .eq("status", "published");

  for (const d of depts ?? []) {
    if (TARGET_SLUGS.size && !TARGET_SLUGS.has(d.slug)) continue;
    if (!d.content_en?.trim() || !needsHi(d.content_en, d.content_hi)) continue;
    planned++;
    console.log(`Fix about: ${college.slug}/${d.slug} (${d.title_en})`);
    if (!APPLY) continue;
    const hi = await resolveHi(d.content_en);
    if (!hi) {
      console.log("  FAILED translate");
      continue;
    }
    await supabase.from("ccshau_pages").update({ content_hi: hi }).eq("id", d.id);
    updated++;
    await sleep(400);
  }
}

console.log(`\nPlanned: ${planned} | Updated: ${updated} | ${APPLY ? "APPLY" : "dry-run"}`);
