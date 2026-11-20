#!/usr/bin/env node
/**
 * Restore Publication Cell body and quick links from hau.ac.in.
 *
 *   node scripts/ops/fix-publication-cell-content.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SLUG = "publication-cell";
const COLLEGE_ID = "57";

const SECTIONS = [
  { label: "Faculty", slug: null, kind: "faculty" },
  { label: "Mandate", slug: "mandate-8", kind: "auto" },
  { label: "Terms & Conditions", slug: "terms-conditions", kind: "auto" },
  { label: "Procedure for (UPN)", slug: "procedure-for-upn", kind: "auto" },
  { label: "Members", slug: "members", kind: "auto" },
  { label: "Publication Record", slug: "publication-record", kind: "auto" },
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

function visibleText(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function legacyPage(slug) {
  const res = await fetch(`https://hau.ac.in/page-data/${slug}/${COLLEGE_ID}`);
  if (!res.ok) throw new Error(`${slug} ${res.status}`);
  return res.json();
}

function pdfEmbed(page) {
  const file = String(page.file || "").trim();
  if (!file) return "";
  const src = `https://hau.ac.in/public/pages-pdf/${file}`;
  const title = String(page.page_title || "PDF document").replace(/"/g, "");
  return `<iframe src="${src}" title="${title}"></iframe>`;
}

function enlargeMemberPhotos(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const size = "width:5.85rem; max-width:5.85rem; max-height:5.85rem; height:auto";
    if (/style\s*=\s*"/i.test(tag)) {
      return tag.replace(/style\s*=\s*"([^"]*)"/i, (_match, style) => {
        const parts = style
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => !/^(width|max-width|max-height|height)\s*:/i.test(part));
        parts.push(size);
        return `style="${parts.join("; ")}"`;
      });
    }
    return tag.replace(/<img\b/i, `<img style="${size}"`);
  });
}

function sectionHtml(page, section) {
  // The old college page shows the uploaded PDF whenever one is attached.
  const embed = pdfEmbed(page);
  if (embed) return embed;
  const html = String(page.page_content || "").trim();
  if (section?.slug === "members") return enlargeMemberPhotos(html);
  return html;
}

function fixCoordinatorHeading(html) {
  const pattern =
    /<h2>(?:(?!<\/h2>)[\s\S])*Ramesh Kumar Coordinator(?:(?!<\/h2>)[\s\S])*Technical Publications and Information Cell(?:(?!<\/h2>)[\s\S])*<\/h2>/i;
  if (!pattern.test(html)) return html;
  return html.replace(
    pattern,
    '<h2 style="text-align: center;">Ramesh Kumar Coordinator</h2><p class="cms-caption" style="text-align: center;">(Technical Publications and Information Cell)</p>',
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const home = await legacyPage("home-34");
  const body = fixCoordinatorHeading(String(home.page_content || "").trim());
  if (!body.includes("cms-caption")) throw new Error("Coordinator heading was not rewritten");
  if (visibleText(body).length < 80) throw new Error("Home content is missing");

  const sidebars = [];
  for (const section of SECTIONS) {
    if (section.kind === "faculty") {
      sidebars.push({ label: section.label, html: null });
      continue;
    }
    const page = await legacyPage(section.slug);
    const html = sectionHtml(page, section);
    if (!html) throw new Error(`${section.slug} has no content`);
    sidebars.push({ label: section.label, html });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: page, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, content_en, layout_template, layout_config")
    .eq("slug", SLUG)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!page) throw new Error("Published publication-cell page not found");

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
        sidebars: sidebars.map((item) => ({
          label: item.label,
          len: item.html ? item.html.length : 0,
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
