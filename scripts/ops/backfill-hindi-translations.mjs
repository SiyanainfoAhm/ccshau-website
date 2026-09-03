#!/usr/bin/env node
/**
 * Phase 2 — Backfill missing Hindi (*_hi) from English (*_en) via free translation APIs.
 *
 * Dry-run by default. Pass --apply to write updates to Supabase.
 *
 * Usage:
 *   node scripts/ops/backfill-hindi-translations.mjs
 *   node scripts/ops/backfill-hindi-translations.mjs --table ccshau_media_albums --limit 5
 *   node scripts/ops/backfill-hindi-translations.mjs --table ccshau_menu_items --apply
 *   node scripts/ops/backfill-hindi-translations.mjs --published-only --table ccshau_pages --limit 20 --apply
 *   node scripts/ops/backfill-hindi-translations.mjs --table ccshau_page_staff --skip-html --limit 50 --apply
 *
 * Requires apps/web/.env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const PUBLISHED_ONLY = argv.includes("--published-only");
const INCLUDE_NO_DEVANAGARI = argv.includes("--include-no-devanagari");
const SKIP_HTML = argv.includes("--skip-html");
const tableArg = argv.find((a) => a.startsWith("--table="))?.split("=")[1];
const limitArg = argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const fieldsArg = argv.find((a) => a.startsWith("--fields="))?.split("=")[1];
const FIELD_FILTER = fieldsArg ? new Set(fieldsArg.split(",").map((f) => f.trim())) : null;
const LIMIT = limitArg ? Number(limitArg) : APPLY ? Infinity : 10;

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

const HTML_FIELDS = new Set([
  "content_en",
  "body_en",
  "detail_content_en",
  "excerpt_en",
  "value_en",
]);

/** @type {import('./audit-hindi-gaps.mjs') extends never ? never : any} */
const BACKFILL_TABLES = [
  {
    table: "ccshau_menu_items",
    pairs: [{ en: "label_en", hi: "label_hi" }],
    context: ["id", "href"],
  },
  {
    table: "ccshau_menus",
    pairs: [{ en: "name_en", hi: "name_hi" }],
    context: ["id", "location"],
  },
  {
    table: "ccshau_media_albums",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "slug"],
  },
  {
    table: "ccshau_media_items",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "caption_en", hi: "caption_hi" },
    ],
    context: ["id", "album_id"],
  },
  {
    table: "ccshau_news",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "body_en", hi: "body_hi" },
    ],
    context: ["id", "slug"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "published" } : undefined,
  },
  {
    table: "ccshau_tenders",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "description_en", hi: "description_hi" },
    ],
    context: ["id", "slug"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "open" } : undefined,
  },
  {
    table: "ccshau_downloads",
    pairs: [{ en: "title_en", hi: "title_hi" }],
    context: ["id", "category"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "published" } : undefined,
  },
  {
    table: "ccshau_pages",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "content_en", hi: "content_hi" },
      { en: "excerpt_en", hi: "excerpt_hi" },
      { en: "head_name_en", hi: "head_name_hi" },
      { en: "head_role_en", hi: "head_role_hi" },
    ],
    context: ["id", "slug"],
    publishedFilter: PUBLISHED_ONLY ? { column: "status", value: "published" } : undefined,
  },
  {
    table: "ccshau_homepage_quotes",
    pairs: [
      { en: "author_en", hi: "author_hi" },
      { en: "quote_en", hi: "quote_hi" },
    ],
    context: ["id"],
  },
  {
    table: "ccshau_homepage_dignitaries",
    pairs: [
      { en: "name_en", hi: "name_hi" },
      { en: "role_en", hi: "role_hi" },
    ],
    context: ["id"],
  },
  {
    table: "ccshau_homepage_initiatives",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "description_en", hi: "description_hi" },
    ],
    context: ["id"],
  },
  {
    table: "ccshau_homepage_cta",
    pairs: [
      { en: "title_en", hi: "title_hi" },
      { en: "subtitle_en", hi: "subtitle_hi" },
      { en: "button_en", hi: "button_hi" },
    ],
    context: ["id"],
  },
  {
    table: "ccshau_page_staff",
    pairs: [
      { en: "name_en", hi: "name_hi" },
      { en: "designation_en", hi: "designation_hi" },
      { en: "specialization_en", hi: "specialization_hi" },
      { en: "qualification_en", hi: "qualification_hi" },
      { en: "experience_en", hi: "experience_hi" },
      { en: "detail_content_en", hi: "detail_content_hi" },
    ],
    context: ["id", "page_id"],
  },
  {
    table: "ccshau_faculty_people",
    pairs: [
      { en: "name_en", hi: "name_hi" },
      { en: "qualification_en", hi: "qualification_hi" },
      { en: "experience_en", hi: "experience_hi" },
      { en: "specialization_en", hi: "specialization_hi" },
      { en: "detail_content_en", hi: "detail_content_hi" },
    ],
    context: ["id", "global_slug"],
  },
];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hiNeedsBackfill(hi, includeNoDevanagari) {
  if (!hasText(hi)) return true;
  if (/\?{3,}/.test(hi) || hi.trim() === "????") return true;
  if (includeNoDevanagari && !/[\u0900-\u097F]/.test(hi)) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkPlainText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf("\n\n", maxLen);
    if (splitAt < maxLen * 0.4) splitAt = remaining.lastIndexOf(". ", maxLen);
    if (splitAt < maxLen * 0.4) splitAt = remaining.lastIndexOf(" ", maxLen);
    if (splitAt < maxLen * 0.4) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateWithLingva(text) {
  const endpoints = [
    "https://lingva.ml/api/v1/en/hi/",
    "https://lingva.thealien.moe/api/v1/en/hi/",
  ];
  for (const base of endpoints) {
    try {
      const response = await fetch(`${base}${encodeURIComponent(text)}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const translated = data.translation?.trim();
      if (translated) return translated;
    } catch {
      /* next */
    }
  }
  return null;
}

async function translateWithGoogleGtx(text, attempt = 0) {
  try {
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `q=${encodeURIComponent(text)}`,
      },
    );
    if (response.status === 429 && attempt < 2) {
      await sleep(600 * (attempt + 1));
      return translateWithGoogleGtx(text, attempt + 1);
    }
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const translated = data[0]
      .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("")
      .trim();
    return translated || null;
  } catch {
    return null;
  }
}

async function translateWithMyMemory(text) {
  try {
    const u = new URL("https://api.mymemory.translated.net/get");
    u.searchParams.set("q", text);
    u.searchParams.set("langpair", "en|hi");
    const response = await fetch(u);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.responseStatus !== 200) return null;
    const translated = data.responseData?.translatedText?.trim();
    if (!translated || translated.includes("MYMEMORY WARNING")) return null;
    return translated;
  } catch {
    return null;
  }
}

async function translateChunk(text, attempt = 0) {
  const result =
    (await translateWithLingva(text)) ??
    (await translateWithGoogleGtx(text)) ??
    (await translateWithMyMemory(text));
  if (result || attempt >= 3) return result;
  await sleep(800 * (attempt + 1));
  return translateChunk(text, attempt + 1);
}

async function translatePlainEnToHi(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const chunks = chunkPlainText(trimmed, 1200);
  const parts = [];
  for (const chunk of chunks) {
    let part = await translateChunk(chunk);
    if (!part && chunk.length > 350) {
      const smaller = chunkPlainText(chunk, 350);
      const smallParts = [];
      for (const piece of smaller) {
        const translatedPiece = await translateChunk(piece);
        if (!translatedPiece) throw new Error(`Translation failed for chunk: ${piece.slice(0, 60)}…`);
        smallParts.push(translatedPiece);
        await sleep(80);
      }
      part = smallParts.join(chunk.includes("\n\n") ? "\n\n" : " ");
    }
    if (!part) throw new Error(`Translation failed for: ${chunk.slice(0, 60)}…`);
    parts.push(part);
    if (chunks.length > 1) await sleep(80);
  }
  return parts.join(trimmed.includes("\n\n") ? "\n\n" : " ");
}

function hasTranslatableLetters(text) {
  return /[A-Za-z\u00C0-\u024F]/.test(text);
}

async function translateHtmlEnToHi(html) {
  const parts = html.split(/(<[^>]+>)/g);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^<[^>]+>$/.test(part) || !part.trim() || !hasTranslatableLetters(part)) continue;
    try {
      parts[i] = await translatePlainEnToHi(part);
      await sleep(80);
    } catch {
      /* keep English fragment */
    }
  }
  return parts.join("");
}

async function translateField(en, enField) {
  if (SKIP_HTML && HTML_FIELDS.has(enField)) return null;
  if (HTML_FIELDS.has(enField) && /<[a-z][\s\S]*>/i.test(en)) {
    if (SKIP_HTML) return null;
    return translateHtmlEnToHi(en);
  }
  return translatePlainEnToHi(en);
}

async function fetchAllRows(table, columns, publishedFilter) {
  const pageSize = 500;
  let from = 0;
  const rows = [];
  for (;;) {
    let query = supabase.from(table).select(columns.join(","));
    if (publishedFilter) query = query.eq(publishedFilter.column, publishedFilter.value);
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function backfillTable(config) {
  const columns = new Set(["id"]);
  for (const pair of config.pairs) {
    columns.add(pair.en);
    columns.add(pair.hi);
  }
  for (const c of config.context ?? []) columns.add(c);

  let rows;
  try {
    rows = await fetchAllRows(config.table, [...columns], config.publishedFilter);
  } catch (e) {
    console.error(`SKIP ${config.table}: ${e.message}`);
    return { table: config.table, skipped: true, error: e.message, updated: 0, planned: 0 };
  }

  let planned = 0;
  let updated = 0;
  const failures = [];

  for (const row of rows) {
    for (const pair of config.pairs) {
      if (FIELD_FILTER && !FIELD_FILTER.has(pair.en)) continue;
      const en = row[pair.en];
      const hi = row[pair.hi];
      if (!hasText(en)) continue;
      if (!hiNeedsBackfill(hi, INCLUDE_NO_DEVANAGARI)) continue;
      if (SKIP_HTML && HTML_FIELDS.has(pair.en)) continue;
      if (planned >= LIMIT) break;

      planned += 1;
      const preview = String(en).slice(0, 80).replace(/\s+/g, " ");
      console.log(`\n[${config.table}] id=${row.id} ${pair.en}→${pair.hi}`);
      console.log(`  EN: ${preview}${String(en).length > 80 ? "…" : ""}`);

      if (!APPLY) {
        console.log("  (dry-run — pass --apply to write)");
        continue;
      }

      try {
        const translated = await translateField(String(en), pair.en);
        if (translated == null) {
          console.log("  (skipped — HTML field)");
          continue;
        }
        console.log(`  HI: ${translated.slice(0, 80)}${translated.length > 80 ? "…" : ""}`);
        const { error } = await supabase
          .from(config.table)
          .update({ [pair.hi]: translated })
          .eq("id", row.id);
        if (error) {
          failures.push({ id: row.id, field: pair.hi, error: error.message });
          console.error(`  DB error: ${error.message}`);
        } else {
          updated += 1;
          console.log("  ✓ saved");
        }
        await sleep(250);
      } catch (e) {
        failures.push({ id: row.id, field: pair.hi, error: e.message });
        console.error(`  FAIL: ${e.message}`);
      }
    }
    if (planned >= LIMIT) break;
  }

  return { table: config.table, skipped: false, planned, updated, failures };
}

async function main() {
  const tables = tableArg
    ? BACKFILL_TABLES.filter((t) => t.table === tableArg)
    : BACKFILL_TABLES;

  if (tableArg && tables.length === 0) {
    console.error(`Unknown table: ${tableArg}`);
    process.exit(1);
  }

  console.log(`Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY-RUN"}`);
  console.log(`Published only: ${PUBLISHED_ONLY}`);
  console.log(`Include no-Devanagari: ${INCLUDE_NO_DEVANAGARI}`);
  console.log(`Skip HTML fields: ${SKIP_HTML}`);
  console.log(`Field filter: ${FIELD_FILTER ? [...FIELD_FILTER].join(", ") : "all"}`);
  console.log(`Limit per table: ${Number.isFinite(LIMIT) ? LIMIT : "none"}`);
  console.log(`Tables: ${tables.map((t) => t.table).join(", ")}`);
  console.log("");

  const results = [];
  for (const config of tables) {
    results.push(await backfillTable(config));
  }

  console.log("\n--- Summary ---");
  for (const r of results) {
    if (r.skipped) {
      console.log(`${r.table}: SKIPPED (${r.error})`);
    } else {
      console.log(
        `${r.table}: ${r.planned} field(s) ${APPLY ? "processed" : "would process"}, ${r.updated} row(s) updated`,
      );
      if (r.failures?.length) console.log(`  failures: ${r.failures.length}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
