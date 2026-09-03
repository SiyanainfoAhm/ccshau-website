#!/usr/bin/env node
/**
 * Phase 1 — Hindi translation gap audit (read-only).
 *
 * Scans ccshau_* tables for English content missing or corrupt Hindi (*_hi).
 *
 * Usage:
 *   node scripts/ops/audit-hindi-gaps.mjs
 *   node scripts/ops/audit-hindi-gaps.mjs --published-only
 *
 * Requires apps/web/.env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Output:
 *   Documents/hindi-translation-gap-report.json
 *   Documents/hindi-translation-gap-report.md
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const PUBLISHED_ONLY = process.argv.includes("--published-only");
const MAX_SAMPLES = 5;

function loadEnvFile(path) {
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

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

function loadSupabaseJs() {
  for (const pkgJson of [join(ROOT, "apps/web/package.json"), join(ROOT, "package.json")]) {
    if (!existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("@supabase/supabase-js");
    } catch {
      /* try next */
    }
  }
  throw new Error("Install @supabase/supabase-js before running this script.");
}

const { createClient } = loadSupabaseJs();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** @typedef {{ table: string, category: string, pairs: { en: string, hi: string }[], context?: string[], publishedFilter?: { column: string, value: string } }} AuditConfig */

/** @type {AuditConfig[]} */
const AUDITS = [
  {
    table: "ccshau_departments",
    category: "Departments",
    pairs: [{ en: "name_en", hi: "name_hi" }],
    context: ["id", "slug"],
  },
  {
    table: "ccshau_pages",
    category: "Pages",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "content_en", hi: "content_hi" },
      { en: "excerpt_en", hi: "excerpt_hi" },
      { en: "head_name_en", hi: "head_name_hi" },
      { en: "head_role_en", hi: "head_role_hi" },
    ],
    context: ["id", "slug", "page_type", "status", "layout_template"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "published" } : undefined,
  },
  {
    table: "ccshau_menu_items",
    category: "Menus",
    pairs: [{ en: "label_en", hi: "label_hi" }],
    context: ["id", "menu_id", "href"],
  },
  {
    table: "ccshau_menus",
    category: "Menus",
    pairs: [{ en: "name_en", hi: "name_hi" }],
    context: ["id", "location"],
  },
  {
    table: "ccshau_news",
    category: "News",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "body_en", hi: "body_hi" },
    ],
    context: ["id", "slug", "status"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "published" } : undefined,
  },
  {
    table: "ccshau_circulars",
    category: "Circulars",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "circular_number", "status"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "published" } : undefined,
  },
  {
    table: "ccshau_tenders",
    category: "Tenders",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "description_en", hi: "description_hi" },
      { en: "cancellation_notice_en", hi: "cancellation_notice_hi" },
    ],
    context: ["id", "slug", "status"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "open" } : undefined,
  },
  {
    table: "ccshau_downloads",
    category: "Downloads",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "category", "status"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "published" } : undefined,
  },
  {
    table: "ccshau_media_albums",
    category: "Media",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "slug", "status"],
  },
  {
    table: "ccshau_media_items",
    category: "Media",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "caption_en", hi: "caption_hi" },
    ],
    context: ["id", "album_id"],
  },
  {
    table: "ccshau_related_links",
    category: "Related links",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "url"],
  },
  {
    table: "ccshau_homepage_quotes",
    category: "Homepage",
    pairs: [
      { en: "author_en", hi: "author_hi" },
      { en: "quote_en", hi: "quote_hi" },
    ],
    context: ["id", "is_active"],
  },
  {
    table: "ccshau_homepage_dignitaries",
    category: "Homepage",
    pairs: [
      { en: "name_en", hi: "name_hi" },
      { en: "role_en", hi: "role_hi" },
    ],
    context: ["id", "is_active"],
  },
  {
    table: "ccshau_homepage_initiatives",
    category: "Homepage",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "description_en", hi: "description_hi" },
    ],
    context: ["id", "is_active"],
  },
  {
    table: "ccshau_homepage_cta",
    category: "Homepage",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "subtitle_en", hi: "subtitle_hi" },
      { en: "button_en", hi: "button_hi" },
    ],
    context: ["id", "is_active"],
  },
  {
    table: "ccshau_page_contact_lines",
    category: "Office portal",
    pairs: [
      { en: "label_en", hi: "label_hi" },
      { en: "value_en", hi: "value_hi" },
    ],
    context: ["id", "page_id"],
  },
  {
    table: "ccshau_page_gallery_items",
    category: "Office portal",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "page_id"],
  },
  {
    table: "ccshau_page_news_ticker_items",
    category: "Office portal",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "page_id"],
  },
  {
    table: "ccshau_page_student_corner_items",
    category: "Office portal",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "page_id"],
  },
  {
    table: "ccshau_page_sidebar_items",
    category: "Office portal",
    pairs: [
      { en: "label_en", hi: "label_hi" },
      { en: "content_en", hi: "content_hi" },
    ],
    context: ["id", "page_id"],
  },
  {
    table: "ccshau_page_staff",
    category: "Faculty / staff",
    pairs: [
      { en: "name_en", hi: "name_hi" },
      { en: "designation_en", hi: "designation_hi" },
      { en: "specialization_en", hi: "specialization_hi" },
      { en: "qualification_en", hi: "qualification_hi" },
      { en: "experience_en", hi: "experience_hi" },
      { en: "detail_content_en", hi: "detail_content_hi" },
    ],
    context: ["id", "page_id", "member_type"],
  },
  {
    table: "ccshau_faculty_people",
    category: "Faculty / staff",
    pairs: [
      { en: "name_en", hi: "name_hi" },
      { en: "qualification_en", hi: "qualification_hi" },
      { en: "experience_en", hi: "experience_hi" },
      { en: "specialization_en", hi: "specialization_hi" },
      { en: "detail_content_en", hi: "detail_content_hi" },
    ],
    context: ["id", "global_slug"],
  },
  {
    table: "ccshau_faculty_assignments",
    category: "Faculty / staff",
    pairs: [
      { en: "designation_en", hi: "designation_hi" },
      { en: "specialization_en", hi: "specialization_hi" },
    ],
    context: ["id", "person_id", "page_id"],
  },
];

const CODE_GAPS = [
  {
    file: "apps/web/src/components/site/public-tenders-listing.tsx",
    issue: "Tender listing shows titleEn only (line ~177); should use t(titleEn, titleHi ?? titleEn)",
    severity: "high",
  },
  {
    file: "apps/web/src/components/site/public-tenders-listing.tsx",
    issue: "Department filter shows nameEn only (line ~112)",
    severity: "medium",
  },
  {
    file: "apps/web/src/components/site/public-downloads-listing.tsx",
    issue: "Department filter shows nameEn only (line ~104)",
    severity: "medium",
  },
  {
    file: "apps/web/src/components/site/public-media-album-grid.tsx",
    issue: "Album grid captions and lightbox use titleEn only (lines ~137, ~213)",
    severity: "medium",
  },
  {
    file: "apps/web/src/components/site/faculty-profile-dialog.tsx",
    issue: "Publication list uses titleEn only (line ~94)",
    severity: "low",
  },
  {
    file: "apps/web/src/components/site/public-contact-page.tsx",
    issue: "University name uses nameEn only (line ~103)",
    severity: "low",
  },
  {
    file: "ccshau_banners table",
    issue: "No title_hi column — hero carousel cannot show Hindi title from DB",
    severity: "high",
  },
  {
    file: "ccshau_tender_corrigenda table",
    issue: "English-only schema (no _hi columns)",
    severity: "low",
  },
  {
    file: "apps/web/src/lib/i18n/language-storage.ts",
    issue: "SSR defaults to English; cookie not read server-side for initial render",
    severity: "low",
  },
];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hiStatus(hi) {
  if (!hasText(hi)) return "missing";
  if (/\?{3,}/.test(hi) || hi.trim() === "????") return "corrupt";
  if (!/[\u0900-\u097F]/.test(hi) && hi.trim().length > 0) return "no_devanagari";
  return "ok";
}

function rowLabel(row, context) {
  const parts = [];
  for (const key of context ?? ["id"]) {
    if (row[key] != null && row[key] !== "") parts.push(`${key}=${row[key]}`);
  }
  return parts.join(" ");
}

async function fetchAllRows(table, columns, publishedFilter) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let query = supabase.from(table).select(columns.join(","));
    if (publishedFilter) {
      query = query.eq(publishedFilter.column, publishedFilter.value);
    }
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function auditTable(config) {
  const columns = new Set(["id"]);
  for (const pair of config.pairs) {
    columns.add(pair.en);
    columns.add(pair.hi);
  }
  for (const c of config.context ?? []) columns.add(c);

  const rows = await fetchAllRows(config.table, [...columns], config.publishedFilter);
  const fieldStats = {};

  for (const pair of config.pairs) {
    fieldStats[`${pair.en}→${pair.hi}`] = {
      enField: pair.en,
      hiField: pair.hi,
      withEnglish: 0,
      missingHindi: 0,
      corruptHindi: 0,
      noDevanagari: 0,
      complete: 0,
      samples: { missing: [], corrupt: [], no_devanagari: [] },
    };
  }

  for (const row of rows) {
    for (const pair of config.pairs) {
      const key = `${pair.en}→${pair.hi}`;
      const stats = fieldStats[key];
      const en = row[pair.en];
      const hi = row[pair.hi];
      if (!hasText(en)) continue;
      stats.withEnglish += 1;
      const status = hiStatus(hi);
      if (status === "ok") {
        stats.complete += 1;
        continue;
      }
      if (status === "missing") stats.missingHindi += 1;
      if (status === "corrupt") stats.corruptHindi += 1;
      if (status === "no_devanagari") stats.noDevanagari += 1;

      const sample = {
        id: row.id,
        label: rowLabel(row, config.context),
        enPreview: String(en).slice(0, 120),
        hiPreview: hi ? String(hi).slice(0, 120) : null,
      };
      if (stats.samples[status]?.length < MAX_SAMPLES) {
        stats.samples[status].push(sample);
      }
    }
  }

  return {
    table: config.table,
    category: config.category,
    rowCount: rows.length,
    publishedFilter: config.publishedFilter ?? null,
    fields: fieldStats,
  };
}

function summarizeCategory(results) {
  const byCat = {};
  for (const r of results) {
    if (!byCat[r.category]) {
      byCat[r.category] = { tables: 0, withEnglish: 0, gaps: 0, complete: 0 };
    }
    byCat[r.category].tables += 1;
    for (const f of Object.values(r.fields)) {
      byCat[r.category].withEnglish += f.withEnglish;
      byCat[r.category].gaps +=
        f.missingHindi + f.corruptHindi + f.noDevanagari;
      byCat[r.category].complete += f.complete;
    }
  }
  return byCat;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Hindi Translation Gap Report — Phase 1 Audit");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Mode: ${report.publishedOnly ? "published/open content only" : "all rows"}`);
  lines.push(`Database: ${report.supabaseUrl}`);
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|------:|");
  lines.push(`| Tables audited | ${report.tableCount} |`);
  lines.push(`| English field instances (non-empty) | ${report.totals.withEnglish} |`);
  lines.push(`| Complete Hindi (Devanagari present) | ${report.totals.complete} |`);
  lines.push(`| Missing Hindi | ${report.totals.missingHindi} |`);
  lines.push(`| Corrupt Hindi (????) | ${report.totals.corruptHindi} |`);
  lines.push(`| Hindi present but no Devanagari | ${report.totals.noDevanagari} |`);
  lines.push(`| **Total gaps** | **${report.totals.gaps}** |`);
  if (report.totals.withEnglish > 0) {
    const pct = ((report.totals.complete / report.totals.withEnglish) * 100).toFixed(1);
    lines.push(`| Coverage | ${pct}% |`);
  }
  lines.push("");
  lines.push("## Summary by category");
  lines.push("");
  lines.push("| Category | Tables | EN fields | Gaps | Complete |");
  lines.push("|----------|-------:|----------:|-----:|---------:|");
  for (const [cat, s] of Object.entries(report.byCategory).sort((a, b) => b[1].gaps - a[1].gaps)) {
    lines.push(`| ${cat} | ${s.tables} | ${s.withEnglish} | ${s.gaps} | ${s.complete} |`);
  }
  lines.push("");
  lines.push("## Code / schema gaps (static audit)");
  lines.push("");
  lines.push("| Severity | Location | Issue |");
  lines.push("|----------|----------|-------|");
  for (const g of report.codeGaps) {
    lines.push(`| ${g.severity} | \`${g.file}\` | ${g.issue} |`);
  }
  const errors = report.results.filter((r) => r.error);
  if (errors.length) {
    lines.push("");
    lines.push("## Database audit errors (schema / migration)");
    lines.push("");
    lines.push("| Table | Error |");
    lines.push("|-------|-------|");
    for (const r of errors) {
      lines.push(`| \`${r.table}\` | ${r.error} |`);
    }
  }
  lines.push("");
  lines.push("## Database detail by table");
  lines.push("");
  for (const r of report.results) {
    lines.push(`### \`${r.table}\` (${r.category})`);
    lines.push("");
    lines.push(`Rows scanned: **${r.rowCount}**`);
    if (r.publishedFilter) {
      lines.push(`Filter: \`${r.publishedFilter.column} = ${r.publishedFilter.value}\``);
    }
    lines.push("");
    lines.push("| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |");
    lines.push("|------------|----------:|-----------:|--------:|--------------:|---------:|");
    for (const f of Object.values(r.fields)) {
      lines.push(
        `| ${f.enField} / ${f.hiField} | ${f.withEnglish} | ${f.missingHindi} | ${f.corruptHindi} | ${f.noDevanagari} | ${f.complete} |`,
      );
    }
    for (const f of Object.values(r.fields)) {
      for (const kind of ["missing", "corrupt", "no_devanagari"]) {
        const samples = f.samples[kind];
        if (!samples?.length) continue;
        lines.push("");
        lines.push(`**Samples — ${f.enField} (${kind}):**`);
        for (const s of samples) {
          lines.push(`- \`${s.label}\` — EN: ${s.enPreview.replace(/\|/g, "\\|")}`);
        }
      }
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("## Recommended Phase 2 priorities");
  lines.push("");
  lines.push("1. Fix code gaps: tenders listing, media album captions, banners schema");
  lines.push("2. Backfill menus + homepage (high visibility, smaller volume)");
  lines.push("3. Backfill published pages by college slug");
  lines.push("4. Backfill news, tenders, downloads");
  lines.push("5. Backfill office portal sidebars + faculty/staff");
  lines.push("");
  lines.push("Re-run: `node scripts/ops/audit-hindi-gaps.mjs` or add `--published-only`");
  lines.push("");
  return lines.join("\n");
}

console.log(`Auditing Hindi gaps (${PUBLISHED_ONLY ? "published only" : "all rows"})...`);

const results = [];
for (const config of AUDITS) {
  process.stdout.write(`  ${config.table}...`);
  try {
    const result = await auditTable(config);
    results.push(result);
    const gaps = Object.values(result.fields).reduce(
      (a, f) => a + f.missingHindi + f.corruptHindi + f.noDevanagari,
      0,
    );
    console.log(` ${result.rowCount} rows, ${gaps} gaps`);
  } catch (err) {
    console.log(` ERROR: ${err.message}`);
    results.push({
      table: config.table,
      category: config.category,
      error: err.message,
      rowCount: 0,
      fields: {},
    });
  }
}

const totals = { withEnglish: 0, missingHindi: 0, corruptHindi: 0, noDevanagari: 0, complete: 0, gaps: 0 };
for (const r of results) {
  for (const f of Object.values(r.fields)) {
    totals.withEnglish += f.withEnglish;
    totals.missingHindi += f.missingHindi;
    totals.corruptHindi += f.corruptHindi;
    totals.noDevanagari += f.noDevanagari;
    totals.complete += f.complete;
  }
}
totals.gaps = totals.missingHindi + totals.corruptHindi + totals.noDevanagari;

const report = {
  generatedAt: new Date().toISOString(),
  publishedOnly: PUBLISHED_ONLY,
  supabaseUrl: url,
  tableCount: results.length,
  totals,
  byCategory: summarizeCategory(results.filter((r) => !r.error)),
  codeGaps: CODE_GAPS,
  results,
};

const jsonPath = join(
  ROOT,
  PUBLISHED_ONLY
    ? "Documents/hindi-translation-gap-report-published.json"
    : "Documents/hindi-translation-gap-report.json",
);
const mdPath = join(
  ROOT,
  PUBLISHED_ONLY
    ? "Documents/hindi-translation-gap-report-published.md"
    : "Documents/hindi-translation-gap-report.md",
);
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, buildMarkdown(report));

console.log("");
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
console.log(
  `Total gaps: ${totals.gaps} (${totals.missingHindi} missing, ${totals.corruptHindi} corrupt, ${totals.noDevanagari} no Devanagari)`,
);
