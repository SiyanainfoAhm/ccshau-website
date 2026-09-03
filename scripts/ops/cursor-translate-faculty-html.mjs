#!/usr/bin/env node
/**
 * Cursor-based faculty Hindi translation (no external APIs).
 * 1) Applies hand-authored short-field translations from *-translated.json
 * 2) Applies HTML label/phrase dictionary to detail_content_en → detail_content_hi
 *
 * Usage:
 *   node scripts/ops/cursor-translate-faculty-html.mjs Documents/hindi-faculty/college-of-agriculture-hisar-hisar-agricultural-extension-education-pending.json
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const pendingPath = process.argv[2];

if (!pendingPath) {
  console.error("Usage: node cursor-translate-faculty-html.mjs <pending.json>");
  process.exit(1);
}

const absPending = pendingPath.startsWith("/") || /^[A-Za-z]:/.test(pendingPath)
  ? pendingPath
  : join(ROOT, pendingPath);

const translatedPath = absPending.replace("-pending.json", "-translated.json");

import { translateFacultyProfileHtml, hasDevanagari } from "./faculty-html-translate.mjs";

function loadShortTranslations() {
  if (!existsSync(translatedPath)) return new Map();
  const data = JSON.parse(readFileSync(translatedPath, "utf8"));
  return new Map((data.staff ?? []).map((s) => [s.id, s.translations ?? {}]));
}

function main() {
  const pending = JSON.parse(readFileSync(absPending, "utf8"));
  const shortMap = loadShortTranslations();
  const out = { ...pending, staff: [] };

  for (const row of pending.staff) {
    const translations = { ...(shortMap.get(row.id) ?? {}) };

    if (row.gaps.detail_content_hi && !translations.detail_content_hi) {
      const html = row.gaps.detail_content_hi;
      const translated = translateFacultyProfileHtml(html);
      if (hasDevanagari(translated)) {
        translations.detail_content_hi = translated;
      }
    }

    out.staff.push({
      id: row.id,
      name_en: row.name_en,
      department_slug: row.department_slug,
      translations,
    });
  }

  writeFileSync(translatedPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${out.staff.length} staff → ${translatedPath}`);
}

main();
