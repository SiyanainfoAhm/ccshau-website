#!/usr/bin/env node
/**
 * Backfill Hindi for all faculty/staff under a college microsite.
 *
 * Usage:
 *   node scripts/ops/backfill-college-faculty-hindi.mjs --college=college-of-agriculture-hisar
 *   node scripts/ops/backfill-college-faculty-hindi.mjs --college=college-of-agriculture-hisar --apply --limit=5
 *   node scripts/ops/backfill-college-faculty-hindi.mjs --college=college-of-agriculture-hisar --apply --profiles-only
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveStaffPageIds } from "../legacy-import/faculty-staff-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const PROFILES_ONLY = argv.includes("--profiles-only");
const SHORT_ONLY = argv.includes("--short-only");
const collegeSlug =
  argv.find((a) => a.startsWith("--college="))?.split("=")[1] ??
  "college-of-agriculture-hisar";
const limitArg = argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const LIMIT = limitArg ? Number(limitArg) : APPLY ? Infinity : 5;

const STAFF_FIELDS = [
  { en: "name_en", hi: "name_hi", html: false },
  { en: "designation_en", hi: "designation_hi", html: false },
  { en: "specialization_en", hi: "specialization_hi", html: false },
  { en: "qualification_en", hi: "qualification_hi", html: false },
  { en: "experience_en", hi: "experience_hi", html: false },
  { en: "detail_content_en", hi: "detail_content_hi", html: true },
];

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
  return createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
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

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hiNeedsBackfill(hi) {
  if (!hasText(hi)) return true;
  if (/\?{3,}/.test(hi) || hi.trim() === "????") return true;
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
    if (response.status === 429 && attempt < 3) {
      await sleep(1000 * (attempt + 1));
      return translateWithGoogleGtx(text, attempt + 1);
    }
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

async function getGoogleApiKey() {
  try {
    const { data, error } = await supabase.rpc("ccshau_get_vault_secret", {
      p_name: "GOOGLE_TRANSLATE_CREDENTIALS",
    });
    if (!error && data) {
      const raw = String(data).trim();
      if (raw.startsWith("{")) {
        const parsed = JSON.parse(raw);
        return parsed.api_key?.trim() || parsed.API_KEY?.trim() || null;
      }
      return raw || null;
    }
  } catch {
    /* fall through */
  }
  const env = process.env.GOOGLE_TRANSLATE_CREDENTIALS ?? process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!env) return null;
  const trimmed = env.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.api_key?.trim() || parsed.API_KEY?.trim() || null;
    } catch {
      return null;
    }
  }
  return trimmed;
}

async function translateWithGoogle(text, format = "text", apiKey) {
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "en", target: "hi", format }),
    },
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.data?.translations?.[0]?.translatedText?.trim() || null;
}

let googleApiKey;

async function translateChunk(text, attempt = 0) {
  if (!googleApiKey) googleApiKey = await getGoogleApiKey();
  if (googleApiKey) {
    const google = await translateWithGoogle(text, "text", googleApiKey);
    if (google) return google;
  }
  const result =
    (await translateWithLingva(text)) ??
    (await translateWithGoogleGtx(text)) ??
    (await translateWithMyMemory(text));
  if (result || attempt >= 4) return result;
  await sleep(2000 * (attempt + 1));
  return translateChunk(text, attempt + 1);
}

async function translatePlainEnToHi(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const chunks = chunkPlainText(trimmed, 1000);
  const parts = [];
  for (const chunk of chunks) {
    const part = await translateChunk(chunk);
    if (!part) throw new Error(`Translation failed: ${chunk.slice(0, 60)}…`);
    parts.push(part);
    await sleep(300);
  }
  return parts.join(trimmed.includes("\n\n") ? "\n\n" : " ");
}

function hasTranslatableLetters(text) {
  return /[A-Za-z\u00C0-\u024F]/.test(text);
}

async function translateHtmlEnToHi(html) {
  if (!googleApiKey) googleApiKey = await getGoogleApiKey();
  if (googleApiKey) {
    const google = await translateWithGoogle(html, "html", googleApiKey);
    if (google) return google;
  }
  const parts = html.split(/(<[^>]+>)/g);
  let translatedNodes = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^<[^>]+>$/.test(part) || !part.trim() || !hasTranslatableLetters(part)) continue;
    try {
      parts[i] = await translatePlainEnToHi(part);
      translatedNodes += 1;
      await sleep(200);
    } catch {
      /* keep English fragment */
    }
  }
  if (translatedNodes === 0) throw new Error("Could not translate profile HTML");
  return parts.join("");
}

async function translateField(en, isHtml) {
  if (isHtml && /<[a-z][\s\S]*>/i.test(en)) return translateHtmlEnToHi(en);
  return translatePlainEnToHi(en);
}

async function main() {
  const { data: college, error: collegeErr } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en")
    .eq("slug", collegeSlug)
    .eq("page_type", "college")
    .maybeSingle();
  if (collegeErr) throw new Error(collegeErr.message);
  if (!college) throw new Error(`College not found: ${collegeSlug}`);

  const { pageIds, pageById } = await resolveStaffPageIds(supabase, college.id, {
    publishedOnly: true,
  });

  console.log(`College: ${college.title_en} (${college.slug})`);
  console.log(`Departments with faculty: ${pageIds.length}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"} | Profiles only: ${PROFILES_ONLY} | Short only: ${SHORT_ONLY}`);
  console.log(`Staff limit: ${Number.isFinite(LIMIT) ? LIMIT : "none"}\n`);

  googleApiKey = await getGoogleApiKey();
  console.log(`Translation: ${googleApiKey ? "Google Cloud API" : "free providers (slower)"}\n`);

  if (!pageIds.length) {
    console.log("No department pages found.");
    return;
  }

  const selectCols = STAFF_FIELDS.flatMap((f) => [f.en, f.hi]).join(",");
  const { data: staffRows, error: staffErr } = await supabase
    .from("ccshau_page_staff")
    .select(`id, page_id, ${selectCols}`)
    .in("page_id", pageIds)
    .eq("is_active", true)
    .order("page_id")
    .order("sort_order");
  if (staffErr) throw new Error(staffErr.message);

  let processed = 0;
  let savedFields = 0;
  const failures = [];

  for (const row of staffRows ?? []) {
    if (processed >= LIMIT) break;

    const dept = pageById.get(row.page_id);
    const fieldsToProcess = PROFILES_ONLY
      ? STAFF_FIELDS.filter((f) => f.en === "detail_content_en")
      : SHORT_ONLY
        ? STAFF_FIELDS.filter((f) => f.en !== "detail_content_en")
        : STAFF_FIELDS;

    const gaps = fieldsToProcess.filter((f) => hasText(row[f.en]) && hiNeedsBackfill(row[f.hi]));
    if (!gaps.length) continue;

    processed += 1;
    console.log(
      `\n[${processed}] ${row.name_en} — ${dept?.title_en ?? row.page_id} (${gaps.length} field(s))`,
    );

    for (const field of gaps) {
      const preview = String(row[field.en]).slice(0, 70).replace(/\s+/g, " ");
      console.log(`  ${field.en} → ${field.hi}: ${preview}${String(row[field.en]).length > 70 ? "…" : ""}`);

      if (!APPLY) {
        console.log("    (dry-run)");
        continue;
      }

      try {
        const translated = await translateField(String(row[field.en]), field.html);
        const { error } = await supabase
          .from("ccshau_page_staff")
          .update({ [field.hi]: translated })
          .eq("id", row.id);
        if (error) throw new Error(error.message);
        row[field.hi] = translated;
        savedFields += 1;
        console.log(`    ✓ ${translated.slice(0, 70)}${translated.length > 70 ? "…" : ""}`);
        await sleep(field.html ? 500 : 350);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push({ id: row.id, name: row.name_en, field: field.hi, error: msg });
        console.error(`    FAIL: ${msg}`);
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Staff processed: ${processed}`);
  console.log(`Fields saved: ${savedFields}`);
  if (failures.length) console.log(`Failures: ${failures.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
