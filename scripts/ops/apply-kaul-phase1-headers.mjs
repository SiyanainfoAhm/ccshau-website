#!/usr/bin/env node
/**
 * Phase 1 — Kaul college page headers (title_hi, excerpt_hi) + synced menu labels.
 *
 * Usage:
 *   node scripts/ops/apply-kaul-phase1-headers.mjs
 *   node scripts/ops/apply-kaul-phase1-headers.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

/** slug → curated Hindi headers (Phase 1). */
const KAUL_HEADERS = {
  "college-of-agriculture-kaul": {
    title_hi: "कृषि महाविद्यालय, कौल",
    excerpt_hi: "कृषि महाविद्यालय, कौल — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।",
  },
  "kaul-department": {
    excerpt_hi: "कृषि महाविद्यालय, कौल के विभाग।",
  },
  "kaul-agriculture-college": {
    title_hi: "कृषि महाविद्यालय",
    excerpt_hi: "कृषि महाविद्यालय, कौल — चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार का अंग।",
  },
};

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

function isMixed(t) {
  return /[\u0900-\u097F]/.test(t ?? "") && /[A-Za-z]/.test(t ?? "");
}

const plans = [];

for (const [slug, patch] of Object.entries(KAUL_HEADERS)) {
  const { data: page } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, title_hi, excerpt_en, excerpt_hi")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) {
    console.warn(`Missing page: ${slug}`);
    continue;
  }

  const updates = {};
  if (patch.title_hi && page.title_hi !== patch.title_hi) {
    updates.title_hi = patch.title_hi;
    plans.push({
      slug,
      field: "title_hi",
      from: page.title_hi,
      to: patch.title_hi,
      mixed_before: isMixed(page.title_hi),
    });
  }
  if (patch.excerpt_hi && page.excerpt_hi !== patch.excerpt_hi) {
    updates.excerpt_hi = patch.excerpt_hi;
    plans.push({
      slug,
      field: "excerpt_hi",
      from: page.excerpt_hi,
      to: patch.excerpt_hi,
    });
  }

  if (Object.keys(updates).length && APPLY) {
    await supabase.from("ccshau_pages").update(updates).eq("id", page.id);

    if (updates.title_hi) {
      await supabase.from("ccshau_menu_items").update({ label_hi: updates.title_hi }).eq("page_id", page.id);
    }
  }
}

console.log(`Phase 1 header updates: ${plans.length} field(s) | ${APPLY ? "APPLY" : "dry-run"}\n`);
for (const p of plans) {
  console.log(`  ${p.slug}.${p.field}`);
  console.log(`    from: ${p.from ?? "(null)"}${p.mixed_before ? " [MIXED]" : ""}`);
  console.log(`    to:   ${p.to}`);
}

if (!APPLY && plans.length) {
  console.log("\nDry-run only. Pass --apply to write.");
}
