#!/usr/bin/env node
/**
 * Restore Skill Council of India body and quick links from hau.ac.in.
 *
 *   node scripts/ops/fix-skill-council-content.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SLUG = "skill-council-of-india";
const COLLEGE_ID = "43";
const SIDEBARS = [
  ["Objectives", "objectives-10"],
  ["Physical Facilities", "physical-facilities-1"],
  ["Trainings", "trainings-6"],
  ["Other Activities", "other-activities-1"],
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
  const res = await fetch("https://hau.ac.in/college/skill-council-of-india");
  if (!res.ok) throw new Error(`college page ${res.status}`);
  const html = await res.text();
  const start = html.indexOf("<h3>Skill Council Of India</h3>");
  const end = html.indexOf('<div class="col-md-3');
  if (start < 0 || end < start) throw new Error("Could not locate live body HTML");
  return html
    .slice(start, end)
    .replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/i, "")
    .replace(/<p[^>]*>\s*(<p[\s>])/gi, "$1")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();
}

async function sidebarHtml(slug) {
  const res = await fetch(`https://hau.ac.in/page-data/${slug}/${COLLEGE_ID}`);
  if (!res.ok) throw new Error(`${slug} ${res.status}`);
  const json = await res.json();
  const html = String(json.page_content || "").trim();
  if (!textOf(html)) throw new Error(`${slug} has no content`);
  return html;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const body = await mainBody();
  const sidebars = [];
  for (const [label, slug] of SIDEBARS) {
    sidebars.push({ label, html: await sidebarHtml(slug) });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en, layout_template, layout_config")
    .eq("slug", SLUG)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error("Published skill-council page not found");

  const { data: existingLinks, error: linkError } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, side")
    .eq("page_id", page.id);
  if (linkError) throw linkError;

  console.log(
    JSON.stringify(
      {
        id: page.id,
        template: page.layout_template,
        contentLen: String(page.content_en || "").length,
        rightSidebar: page.layout_config?.rightSidebar ?? null,
        mainContent: page.layout_config?.mainContent ?? null,
        existingLinks: (existingLinks || []).map((item) => item.label_en),
        bodyLen: body.length,
        sidebars: sidebars.map((item) => ({ label: item.label, len: item.html.length })),
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
