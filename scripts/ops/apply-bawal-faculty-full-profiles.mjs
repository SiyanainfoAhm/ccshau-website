#!/usr/bin/env node
/**
 * Full Hindi profile translation for Bawal Agriculture College faculty.
 * Strategy: phrase dictionary → dedupe unique English text nodes → batch MT → sync DB
 *
 * Usage:
 *   node scripts/ops/apply-bawal-faculty-full-profiles.mjs --apply
 *   node scripts/ops/apply-bawal-faculty-full-profiles.mjs --apply --min-ratio=0.9
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateFacultyProfileHtml, hasDevanagari } from "./faculty-html-translate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const minRatioArg = process.argv.find((a) => a.startsWith("--min-ratio="))?.split("=")[1];
const MIN_RATIO_SKIP = minRatioArg ? Number(minRatioArg) : 0.88;
const DEPT_SLUG = "bawal-agriculture-college";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function devanagariRatio(text) {
  const plain = text.replace(/<[^>]+>/g, " ");
  const dev = (plain.match(/[\u0900-\u097F]/g) ?? []).length;
  return dev / Math.max(plain.replace(/\s+/g, "").length, 1);
}

function normalizeNodeText(text) {
  return text.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Collect translatable text literals from HTML (between tags). */
function collectTextNodes(html) {
  const nodes = new Set();
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(html))) {
    const raw = normalizeNodeText(m[1]);
    if (raw.length < 2) continue;
    if (!/[A-Za-z]/.test(raw)) continue;
    if (/^[\d\s.,\-/;:()]+$/.test(raw)) continue;
    nodes.add(raw);
  }
  return [...nodes].sort((a, b) => b.length - a.length);
}

async function translateWithGoogleGtx(text) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `q=${encodeURIComponent(text)}`,
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    return (
      data[0]
        .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
        .join("")
        .trim() || null
    );
  } catch {
    return null;
  }
}

async function translateWithLingva(text) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      `https://lingva.ml/api/v1/en/hi/${encodeURIComponent(text)}`,
      { headers: { Accept: "application/json" }, signal: controller.signal },
    );
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    return data.translation?.trim() || null;
  } catch {
    return null;
  }
}

async function translatePhrase(text) {
  if (text.length > 4500) {
    const parts = [];
    let rest = text;
    while (rest.length > 4500) {
      let cut = rest.lastIndexOf(". ", 4500);
      if (cut < 2000) cut = rest.lastIndexOf(" ", 4500);
      if (cut < 2000) cut = 4500;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    const out = [];
    for (const p of parts) {
      const t = (await translateWithGoogleGtx(p)) ?? (await translateWithLingva(p));
      if (!t) return null;
      out.push(t);
      await sleep(150);
    }
    return out.join(" ");
  }
  return (await translateWithGoogleGtx(text)) ?? (await translateWithLingva(text));
}

async function translateProfileHtml(htmlEn) {
  let html = translateFacultyProfileHtml(htmlEn) ?? htmlEn;
  const nodes = collectTextNodes(html);
  console.log(`  unique English nodes: ${nodes.length}`);

  const phraseMap = new Map();
  let done = 0;
  for (const en of nodes) {
    if (phraseMap.has(en)) continue;
    const hi = await translatePhrase(en);
    if (hi && hasDevanagari(hi) && hi !== en) phraseMap.set(en, hi);
    done += 1;
    if (done % 25 === 0) console.log(`    translated ${done}/${nodes.length}`);
    await sleep(100);
  }

  for (const [en, hi] of phraseMap) {
    html = html.split(en).join(hi);
    const nbsp = en.replace(/ /g, "&nbsp;");
    if (nbsp !== en && html.includes(nbsp)) html = html.split(nbsp).join(hi);
  }
  return html;
}

async function main() {
  const { data: dept } = await supabase
    .from("ccshau_pages")
    .select("id, title_en")
    .eq("slug", DEPT_SLUG)
    .maybeSingle();
  if (!dept) throw new Error(`Department not found: ${DEPT_SLUG}`);

  const { data: staffRows, error } = await supabase
    .from("ccshau_page_staff")
    .select("id, name_en, detail_content_en, detail_content_hi")
    .eq("page_id", dept.id)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;

  const targets = (staffRows ?? []).filter((r) => r.detail_content_en?.trim());
  console.log(`Faculty with profiles: ${targets.length}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"} | Skip if Hindi ratio >= ${MIN_RATIO_SKIP}`);

  let updated = 0;
  const failures = [];

  for (const row of targets) {
    const before = row.detail_content_hi ? devanagariRatio(row.detail_content_hi) : 0;
    console.log(`\n${row.name_en} — Hindi ${(before * 100).toFixed(1)}%`);

    if (before >= MIN_RATIO_SKIP) {
      console.log("  skip (already sufficient Hindi)");
      continue;
    }

    if (!APPLY) {
      console.log("  would translate");
      continue;
    }

    try {
      const translated = await translateProfileHtml(row.detail_content_en);
      const after = devanagariRatio(translated);
      console.log(`  after: ${(after * 100).toFixed(1)}% Hindi`);

      const { error: staffErr } = await supabase
        .from("ccshau_page_staff")
        .update({ detail_content_hi: translated })
        .eq("id", row.id);
      if (staffErr) throw staffErr;

      const { data: assignment } = await supabase
        .from("ccshau_faculty_assignments")
        .select("id, person_id")
        .eq("source_staff_id", row.id)
        .eq("is_active", true)
        .maybeSingle();

      if (assignment) {
        await supabase
          .from("ccshau_faculty_people")
          .update({ detail_content_hi: translated })
          .eq("id", assignment.person_id);
      }

      updated += 1;
      console.log("  ✓ saved");
    } catch (e) {
      failures.push({ name: row.name_en, error: e instanceof Error ? e.message : String(e) });
      console.error(`  FAIL: ${failures.at(-1).error}`);
    }
  }

  console.log(`\nUpdated ${updated} profile(s). Failures: ${failures.length}`);
  for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
