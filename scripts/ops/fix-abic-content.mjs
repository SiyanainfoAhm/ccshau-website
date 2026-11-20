#!/usr/bin/env node
/**
 * Restore Agribusiness Incubation Centre body and quick links from hau.ac.in.
 *
 *   node scripts/ops/fix-abic-content.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SLUG = "agribusiness-incubation-centre";
const COLLEGE_ID = "68";
const PAGE_URL = `https://hau.ac.in/college/${SLUG}`;
const SECTIONS = [
  ["Home", "home-26"],
  ["About Us", "about-us-11"],
  ["Contact Us", "contact-us-6"],
  ["ABIC-Application- Form", "abic-application-form"],
  ["English Broucher", "english-broucher"],
  ["ABIC Office Bears", "abic-office-bears"],
  ["Focus Areas For Start-ups, Entrepreneurs And Innovators", "focus-areas-for-start-ups-entrepreneurs-and-innovators-1"],
  ["Gallery Of ABIC", "gallery-of-abic"],
  ["Bakery Of ABIC", "bakery-of-abic"],
  ["ABIC And Its Start-Ups", "abic-and-its-start-ups"],
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
  const marker = "<h3>Agribusiness Incubation Centre</h3>";
  const start = html.indexOf(marker);
  const end = html.indexOf('<div class="col-md-3');
  if (start < 0 || end < start) throw new Error("Could not locate live body HTML");
  return html
    .slice(start + marker.length, end)
    .replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/i, "")
    .replace(/^(\s*<\/p>)+/i, "")
    .trim();
}

const VISION_IMG =
  "https://hau.ac.in/storage/app/uploads/4lBjgZKb268XthawkCP01MWCIDIY27aoSljvqNkr.png";
const MISSION_IMG =
  "https://hau.ac.in/storage/app/uploads/09MroxUDrKxIWqDgboA8SsaIPCEgpx0Uj8mUFVNo.jpeg";
const OBJECTIVES_IMG =
  "https://hau.ac.in/storage/app/uploads/sXp6hI9L1nebtuTqXb5JIYAkNJwr8Q5hb41i3IPk.png";

function plainText(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vision image-left, Mission image-right, Objectives graphic centered. */
export function layoutAboutMedia(html) {
  if (!html?.includes("VISION") || !html.includes("4lBjgZKb268XthawkCP01MWCIDIY27aoSljvqNkr")) {
    return html;
  }
  const bullets = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => plainText(match[1]))
    .filter(Boolean);
  const imgStyle = "height:auto;flex:0 0 auto;border:0;border-radius:0;box-shadow:none;display:block;";
  const vision = `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:1.75rem;margin:1.25rem 0 1.75rem;"><img src="${VISION_IMG}" alt="" style="width:190px;max-width:38%;${imgStyle}"><div style="flex:1;min-width:16rem;text-align:left;"><strong>VISION</strong><br>To inculcate a culture of motivated entrepreneurship in the state for the growth and success of emerging technology in agriculture and allied sectors</div></div>`;
  const mission = `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:1.75rem;margin:0 0 1.75rem;"><div style="flex:1;min-width:16rem;text-align:left;"><strong>MISSION</strong><br>ABIC CCSHAU intends to promote Agribusiness and Entrepreneurship Development with the concept of Growth through Innovation, up gradation of Technology and Skill Development</div><img src="${MISSION_IMG}" alt="" style="width:150px;max-width:34%;${imgStyle}"></div>`;
  const objectivesImg = `<div style="text-align:center;margin:0.5rem 0 0.75rem;"><img src="${OBJECTIVES_IMG}" alt="" style="width:300px;max-width:100%;height:auto;display:inline-block;border:0;border-radius:0;box-shadow:none;"></div>`;
  const objectivesList = `<p style="text-align:left;"><strong>OBJECTIVES</strong></p><ul>${bullets
    .map((item) => `<li>${item}</li>`)
    .join("")}</ul>`;
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (table) => {
    if (table.includes("VISION")) return vision;
    if (table.includes("MISSION")) return mission;
    if (table.includes("sXp6hI9L1nebtuTqXb5JIYAkNJwr8Q5hb41i3IPk")) return objectivesImg;
    if (table.includes("OBJECTIVES")) return objectivesList;
    return table;
  });
}

function sectionHtml(page) {
  const file = String(page.file || "").trim();
  if (file) {
    const src = `https://hau.ac.in/public/pages-pdf/${file}`;
    const title = String(page.page_title || "PDF document").replace(/"/g, "");
    return `<iframe src="${src}" title="${title}"></iframe>`;
  }
  const html = layoutAboutMedia(String(page.page_content || "").trim());
  if (!textOf(html) && !/<(?:img|iframe)\b/i.test(html)) throw new Error("section has no content");
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
  if (!textOf(body).includes("Director Message")) throw new Error("Home content is missing");

  const sidebars = [];
  for (const [label, slug] of SECTIONS) {
    const page = await legacyPage(slug);
    sidebars.push({ label, html: sectionHtml(page), file: page.file || null });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id, content_en, layout_template, layout_config")
    .eq("slug", SLUG)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error("Published agribusiness incubation page not found");

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
        bodyPreview: textOf(body).slice(0, 140),
        sidebars: sidebars.map((item) => ({ label: item.label, len: item.html.length, file: item.file })),
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
    contacts: false,
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
