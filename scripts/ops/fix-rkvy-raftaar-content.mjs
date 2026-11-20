#!/usr/bin/env node
/**
 * Restore RKVY-RAFTAAR body and quick links from hau.ac.in.
 *
 *   node scripts/ops/fix-rkvy-raftaar-content.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SLUG = "rkvy-raftaar-agribusiness-incubator-under-rkvy-raftaar-scheme";
const COLLEGE_ID = "64";
const PAGE_URL = `https://hau.ac.in/college/${SLUG}`;
const SECTIONS = [
  ["Programme SOP, PAHAL ,SAFAL", "programme-aagaaz-2019"],
  ["Home", "home-39"],
  ["Objectives", "objective-2"],
  ["Focus Area", "focus-area"],
  ["Technologies Available", "technologiesavailable"],
  ["Mentors And Experts", "mentors-experts"],
  ["Infrastructure", "infrastructure-19"],
  ["Contact Us", "contact-1"],
  ["Gallery", "gallery-1"],
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");

function textOf(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function mainBody() {
  const res = await fetch(PAGE_URL);
  if (!res.ok) throw new Error(`college page ${res.status}`);
  const html = await res.text();
  const marker = "<h3>RKVY-RAFTAAR-Agribusiness Incubator Under RKVY RAFTAAR Scheme</h3>";
  const start = html.indexOf(marker);
  const end = html.indexOf('<div class="col-md-3');
  if (start < 0 || end < start) throw new Error("Could not locate live body HTML");
  return html
    .slice(start + marker.length, end)
    .replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/i, "")
    .replace(/^(\s*<\/p>)+/i, "")
    .trim();
}

export function centerProgrammeTitle(html) {
  if (!html || !html.includes("CCS HAU-RKVY-RAFTAAR-")) return html;
  const title = [
    '<p style="text-align:center;"><strong>CCS HAU-RKVY-RAFTAAR-</strong></p>',
    '<p style="text-align:center;"><strong>Agri Business Incubator</strong></p>',
    '<p style="text-align:center;"><strong>(R-ABI, CCSHAU HISAR)</strong></p>',
    '<p style="text-align:center;">(Agri Business Incubator under RKVY-RAFTAAR, MoA&amp;FW, GoI)</p>',
  ].join("");
  const block = `<table style="width:100%;text-align:center;"><tbody><tr><td style="width:100%;text-align:center;">${title}</td></tr></tbody></table>`;
  return html.replace(/<table\b(?=[^>]*\bMsoNormalTable\b)[^>]*>[\s\S]*?<\/table>/i, (table) =>
    table.includes("CCS HAU-RKVY-RAFTAAR-") ? block : table,
  );
}

function sectionHtml(page) {
  const file = String(page.file || "").trim();
  if (file) {
    const src = `https://hau.ac.in/public/pages-pdf/${file}`;
    const title = String(page.page_title || "PDF document").replace(/"/g, "");
    return `<iframe src="${src}" title="${title}"></iframe>`;
  }
  const html = centerProgrammeTitle(String(page.page_content || "").trim());
  if (!textOf(html) && !/<img\b/i.test(html)) throw new Error("section has no content");
  return html;
}

async function legacyPage(slug) {
  const res = await fetch(`https://hau.ac.in/page-data/${slug}/${COLLEGE_ID}`);
  if (!res.ok) throw new Error(`${slug} ${res.status}`);
  return res.json();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const body = await mainBody();
  if (textOf(body).length < 200) throw new Error("Home content is missing");

  const sidebars = [];
  for (const [label, slug] of SECTIONS) {
    const page = await legacyPage(slug);
    sidebars.push({
      label,
      html: sectionHtml(page),
      file: page.file || null,
    });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, content_en, layout_template, layout_config")
    .eq("slug", SLUG)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error("Published RKVY page not found");

  const { data: existingLinks, error: linkError } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en")
    .eq("page_id", page.id);
  if (linkError) throw linkError;

  console.log(
    JSON.stringify(
      {
        id: page.id,
        template: page.layout_template,
        contentLen: String(page.content_en || "").length,
        existingLinks: (existingLinks || []).map((item) => item.label_en),
        bodyLen: body.length,
        bodyPreview: textOf(body).slice(0, 120),
        sidebars: sidebars.map((item) => ({
          label: item.label,
          len: item.html.length,
          file: item.file,
        })),
        mode: APPLY ? "APPLY" : "dry-run",
      },
      null,
      2,
    ),
  );

  if (!APPLY) return;

  const layout = {
    ...(page.layout_config || {}),
    mainContent: true,
    rightSidebar: true,
  };
  const { error: updateError } = await supabase
    .from("ccshau_pages")
    .update({ content_en: body, layout_config: layout })
    .eq("id", page.id);
  if (updateError) throw updateError;

  if ((existingLinks || []).length > 0) {
    const { error: deleteError } = await supabase
      .from("ccshau_page_sidebar_items")
      .delete()
      .eq("page_id", page.id);
    if (deleteError) throw deleteError;
  }

  const { error: insertError } = await supabase.from("ccshau_page_sidebar_items").insert(
    sidebars.map((item, index) => ({
      page_id: page.id,
      side: "right",
      label_en: item.label,
      content_en: item.html,
      href: null,
      sort_order: index + 1,
      is_active: true,
    })),
  );
  if (insertError) throw insertError;
  console.log("updated page and", sidebars.length, "quick links");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
