#!/usr/bin/env node
/**
 * Translate and apply COBSH department About page content_hi (content_en → content_hi).
 *
 * Usage:
 *   node scripts/ops/apply-cobsh-department-about-hindi.mjs
 *   node scripts/ops/apply-cobsh-department-about-hindi.mjs --apply
 *   node scripts/ops/apply-cobsh-department-about-hindi.mjs --apply --slug=cbs-biochemistry
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const slugFilter = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1];
const COLLEGE_SLUG = "college-basic-sciences-humanities";

const CBS_SLUGS = [
  "cbs-biochemistry",
  "cbs-botany-plant-physiology",
  "cbs-chemistry",
  "cbs-computer-section",
  "cbs-languages-haryanvi-culture",
  "cbs-mathematics-statistics",
  "cbs-microbiology",
  "cbs-physics",
  "cbs-sociology",
  "cbs-zoology",
];

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

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function translateWithGoogle(html, apiKey) {
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: html, source: "en", target: "hi", format: "html" }),
    },
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.data?.translations?.[0]?.translatedText?.trim() || null;
}

function chunkHtml(html, maxLen) {
  if (html.length <= maxLen) return [html];
  const chunks = [];
  const parts = html.split(/(?=<p[\s>])/i);
  let buf = "";
  for (const part of parts) {
    if ((buf + part).length > maxLen && buf) {
      chunks.push(buf);
      buf = part;
    } else {
      buf += part;
    }
  }
  if (buf) chunks.push(buf);
  if (chunks.length === 1 && chunks[0].length > maxLen) {
    return [html.slice(0, maxLen), html.slice(maxLen)];
  }
  return chunks;
}

async function translateHtml(html, apiKey) {
  if (apiKey) {
    const chunks = chunkHtml(html, 4500);
    const out = [];
    for (const chunk of chunks) {
      const translated = await translateWithGoogle(chunk, apiKey);
      if (!translated) throw new Error("Google translate failed");
      out.push(translated);
      await sleep(300);
    }
    return out.join("");
  }

  // Fallback: translate text nodes only via Google GTX on plain fragments
  const parts = html.split(/(<[^>]+>)/g);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^<[^>]+>$/.test(part) || !part.trim() || !/[A-Za-z]/.test(part)) continue;
    const text = part.replace(/&nbsp;/g, " ").trim();
    if (text.length < 4) continue;
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 20000);
      const response = await fetch(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([[text, "en", "hi", true], null, "html"]),
          signal: controller.signal,
        },
      );
      if (response.ok) {
        const data = await response.json();
        const translated = data?.[0]?.map((x) => x?.[0]).join("")?.trim();
        if (translated) parts[i] = part.replace(text, translated);
      }
      await sleep(200);
    } catch {
      /* keep English fragment */
    }
  }
  return parts.join("");
}

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text ?? "");
}

async function main() {
  const apiKey = await getGoogleApiKey();
  console.log(`Translation: ${apiKey ? "Google Cloud API" : "GTX HTML fragments"}`);

  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id")
    .eq("slug", COLLEGE_SLUG)
    .single();

  let slugs = CBS_SLUGS;
  if (slugFilter) slugs = slugs.filter((s) => s === slugFilter);

  const { data: pages } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, content_en, content_hi")
    .eq("college_root_id", college.id)
    .in("slug", slugs)
    .order("slug");

  const plans = [];
  for (const page of pages ?? []) {
    const en = page.content_en?.trim();
    if (!en) continue;
    const hi = page.content_hi?.trim();
    if (hi && hasDevanagari(hi)) continue;
    plans.push(page);
  }

  console.log(`Departments to translate: ${plans.length}`);
  for (const p of plans) console.log(`  - ${p.slug} (${p.content_en.length} chars)`);

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  let updated = 0;
  for (const page of plans) {
    console.log(`\nTranslating ${page.slug}...`);
    const contentHi = await translateHtml(page.content_en, apiKey);
    if (!hasDevanagari(contentHi)) {
      console.error(`  ✗ No Devanagari in output for ${page.slug}`);
      continue;
    }
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ content_hi: contentHi })
      .eq("id", page.id);
    if (error) throw error;
    console.log(`  ✓ ${page.slug} (${contentHi.length} chars)`);
    updated++;
  }

  console.log(`\nUpdated ${updated} department about page(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
