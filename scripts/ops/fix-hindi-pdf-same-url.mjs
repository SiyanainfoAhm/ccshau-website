#!/usr/bin/env node
/**
 * When English content is a PDF link/embed, Hindi must use the SAME PDF URL
 * (so the Hindi UI still opens the viewer). Replaces "शीघ्र उपलब्ध" placeholders.
 *
 * Usage:
 *   node scripts/ops/fix-hindi-pdf-same-url.mjs
 *   node scripts/ops/fix-hindi-pdf-same-url.mjs --apply
 *   node scripts/ops/fix-hindi-pdf-same-url.mjs --college=krishi-vigyan-kendra-panipat --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";
import { DEPT_SLUG_TITLES_HI, hasDevanagari } from "./department-hindi-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const collegeFilter = process.argv.find((a) => a.startsWith("--college="))?.split("=")[1];

const TITLE_HI = { ...EXTENDED_SIDEBAR_LABELS_HI, ...DEPT_SLUG_TITLES_HI };

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

function extractPdfUrl(html) {
  if (!html?.trim()) return null;
  const patterns = [
    /<(?:iframe|embed|object)\b[^>]*\b(?:src|data)=["']([^"']+\.pdf[^"']*)["']/i,
    /\b(?:src|data|href)=["']([^"']+\.pdf[^"']*)["']/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function isPlaceholderHi(html) {
  if (!html?.trim()) return true;
  return /शीघ्र उपलब्ध|legacy-pending|pending Phase 4/i.test(html);
}

function plainLen(html) {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/** Only rewrite Hindi stubs/placeholders — never curated about/body HTML. */
function isHindiPdfStub(html) {
  if (!html?.trim()) return true;
  if (isPlaceholderHi(html)) return true;
  const hiPdf = extractPdfUrl(html);
  if (hiPdf && plainLen(html) < 280) return true;
  return false;
}

function resolveTitleHi(page) {
  return (
    TITLE_HI[page.slug] ??
    TITLE_HI[page.title_en?.trim()] ??
    (page.title_hi?.trim() && hasDevanagari(page.title_hi) ? page.title_hi.trim() : null) ??
    page.title_en?.trim() ??
    "दस्तावेज़"
  );
}

function buildHindiPdfHtml(pdfUrl, titleHi) {
  const safeTitle = titleHi.replace(/</g, "");
  return `<p><a href="${pdfUrl}" rel="noopener noreferrer" target="_blank"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif"><strong>${safeTitle}</strong></span></a></p>`;
}

function needsFix(contentEn, contentHi) {
  const pdfUrl = extractPdfUrl(contentEn);
  if (!pdfUrl) return null;
  if (!isHindiPdfStub(contentHi)) return null;
  if (contentHi?.includes(pdfUrl) && !isPlaceholderHi(contentHi)) return null;
  if (extractPdfUrl(contentHi) === pdfUrl && !isPlaceholderHi(contentHi)) return null;
  return pdfUrl;
}

async function main() {
  const { data: allColleges } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, college_root_id")
    .eq("page_type", "college")
    .order("slug");
  let roots = (allColleges ?? []).filter((p) => p.college_root_id === p.id);
  if (collegeFilter) roots = roots.filter((r) => r.slug === collegeFilter);

  let pagesFixed = 0;
  let sidebarsFixed = 0;

  for (const college of roots) {
    const { data: pages } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, title_hi, content_en, content_hi")
      .eq("college_root_id", college.id)
      .eq("status", "published");

    const pageFixes = [];
    for (const page of pages ?? []) {
      const pdfUrl = needsFix(page.content_en, page.content_hi);
      if (!pdfUrl) continue;
      const titleHi = resolveTitleHi(page);
      const html = buildHindiPdfHtml(pdfUrl, titleHi);
      pageFixes.push({ page, pdfUrl, titleHi, html });
    }

    if (pageFixes.length) {
      console.log(`\n${college.slug}: ${pageFixes.length} page(s)`);
      for (const f of pageFixes) {
        console.log(`  ${f.page.slug} → ${f.pdfUrl}`);
        if (APPLY) {
          const { error } = await supabase
            .from("ccshau_pages")
            .update({ content_hi: f.html })
            .eq("id", f.page.id);
          if (error) throw new Error(`${f.page.slug}: ${error.message}`);
        }
        pagesFixed++;
      }
    }

    const pageIds = (pages ?? []).map((p) => p.id);
    if (!pageIds.length) continue;

    const { data: items } = await supabase
      .from("ccshau_page_sidebar_items")
      .select("id, page_id, label_en, label_hi, content_en, content_hi, linked_page_id")
      .in("page_id", pageIds)
      .eq("is_active", true);

    const pageById = new Map((pages ?? []).map((p) => [p.id, p]));
    let collegeSidebarLogged = false;

    for (const item of items ?? []) {
      const en =
        item.content_en?.trim() ||
        (item.linked_page_id ? pageById.get(item.linked_page_id)?.content_en : null) ||
        "";
      const hi = item.content_hi ?? "";
      const pdfUrl = needsFix(en, hi);
      if (!pdfUrl) continue;

      let titleHi =
        (item.label_hi?.trim() && hasDevanagari(item.label_hi) ? item.label_hi.trim() : null) ||
        TITLE_HI[item.label_en?.trim()] ||
        item.label_en?.trim() ||
        "दस्तावेज़";

      const linked = item.linked_page_id ? pageById.get(item.linked_page_id) : null;
      if (linked) {
        const linkedFix = pageFixes.find((f) => f.page.id === linked.id);
        if (linkedFix) titleHi = linkedFix.titleHi;
        else if (linked.title_hi?.trim() && hasDevanagari(linked.title_hi)) titleHi = linked.title_hi.trim();
      }

      const html = buildHindiPdfHtml(pdfUrl, titleHi);
      if (!pageFixes.length && !collegeSidebarLogged) {
        console.log(`\n${college.slug}: sidebar PDF fixes`);
        collegeSidebarLogged = true;
      }
      console.log(`  sidebar [${pageById.get(item.page_id)?.slug}] ${item.label_en} → ${pdfUrl}`);
      if (APPLY) {
        const { error } = await supabase
          .from("ccshau_page_sidebar_items")
          .update({ content_hi: html })
          .eq("id", item.id);
        if (error) throw new Error(`sidebar ${item.id}: ${error.message}`);

        // Keep linked page content_hi in sync when it is still a placeholder
        if (linked && isHindiPdfStub(linked.content_hi) && extractPdfUrl(en) === pdfUrl) {
          const pageTitle = resolveTitleHi(linked);
          const pageHtml = buildHindiPdfHtml(pdfUrl, pageTitle);
          const { error: pageErr } = await supabase
            .from("ccshau_pages")
            .update({ content_hi: pageHtml })
            .eq("id", linked.id);
          if (pageErr) throw new Error(`linked ${linked.slug}: ${pageErr.message}`);
          console.log(`    + linked page ${linked.slug}`);
          pagesFixed++;
        }
      }
      sidebarsFixed++;
    }
  }

  console.log(
    `\n${APPLY ? "Updated" : "Would update"}: pages=${pagesFixed} sidebars=${sidebarsFixed}`,
  );
  if (!APPLY) console.log("Dry-run only. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
