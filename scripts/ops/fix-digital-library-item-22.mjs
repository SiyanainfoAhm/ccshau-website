#!/usr/bin/env node
/**
 * Fix Digital Library item 22 missing URL from legacy page.
 * Legacy: https://bprd.nic.in/page/sajag_bharat
 *
 *   node scripts/ops/fix-digital-library-item-22.mjs
 *   node scripts/ops/fix-digital-library-item-22.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "6726a2ef-9b2f-49b1-b9a9-57a49deade50";
const SIDE_ID = "ce1e80e2-b192-4624-97de-b1d85735b50c";
const URL = "https://bprd.nic.in/page/sajag_bharat";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

const LINK = `<a href="${URL}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">${URL}</span></a>`;

function fix22(html) {
  if (!html) return html;
  if (html.includes("bprd.nic.in/page/sajag_bharat")) return html;
  let out = html;
  // Empty "22. " then closing spans (page + sidebar EN/HI variants)
  const patterns = [
    /<strong>22\.\s*<\/strong><\/span><\/span>/,
    /<strong>22\.\s*<\/strong><\/span>\s*<\/span>/,
  ];
  let replaced = false;
  for (const re of patterns) {
    if (re.test(out)) {
      out = out.replace(re, `<strong>22. </strong></span>${LINK}</span>`);
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    // Fallback: insert after first "22."
    out = out.replace(
      /(<strong>22\.\s*<\/strong>)/,
      `$1${LINK}`,
    );
  }
  return out;
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const now = new Date().toISOString();

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id,content_en,content_hi")
    .eq("id", PAGE_ID)
    .single();
  if (error) throw error;

  const { data: side, error: sErr } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,content_en,content_hi")
    .eq("id", SIDE_ID)
    .single();
  if (sErr) throw sErr;

  const pageEn = fix22(page.content_en);
  const pageHi = fix22(page.content_hi);
  const sideEn = fix22(side.content_en);
  // Sidebar HI is a stub PDF link — rebuild from fixed EN labels with Hindi title only if needed
  const sideHi = side.content_hi && /22\./.test(side.content_hi) ? fix22(side.content_hi) : side.content_hi;

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log({
    pageEn: /bprd\.nic\.in/.test(pageEn),
    pageHi: /bprd\.nic\.in/.test(pageHi),
    sideEn: /bprd\.nic\.in/.test(sideEn),
    pageEnSnippet: pageEn.slice(pageEn.lastIndexOf("22"), pageEn.lastIndexOf("22") + 180),
  });

  if (!APPLY) {
    console.log("Pass --apply to write.");
    return;
  }

  const { error: upPage } = await sb
    .from("ccshau_pages")
    .update({ content_en: pageEn, content_hi: pageHi, updated_at: now })
    .eq("id", PAGE_ID);
  if (upPage) throw upPage;
  console.log("OK digital-library page");

  const { error: upSide } = await sb
    .from("ccshau_page_sidebar_items")
    .update({ content_en: sideEn, ...(sideHi !== side.content_hi ? { content_hi: sideHi } : {}), updated_at: now })
    .eq("id", SIDE_ID);
  if (upSide) throw upSide;
  console.log("OK Digital Library sidebar");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
