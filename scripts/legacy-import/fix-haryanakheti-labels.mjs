#!/usr/bin/env node
/**
 * Fix mojibake Hindi labels on /pages/haryanakheti from legacy hau.ac.in labels.
 * Preserves existing Azure PDF hrefs.
 *
 *   node scripts/legacy-import/fix-haryanakheti-labels.mjs
 *   node scripts/legacy-import/fix-haryanakheti-labels.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

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

const LABELS_BY_PDF = {
  "C9zMsqUPZk36V1R3jgneRzRyUcEAP9PjZvWliF3H.pdf": "हरियाणा खेती -2018",
  "mlB9qlfZetmo7YWeFkGmIf2rjEtSmlceTJVp21oO.pdf": "हरियाणा खेती -2019",
  "3uLz5U1AhEXzsn26wUFH2P5e4EpB0UtVHT3o4dVU.pdf": "हरियाणा खेती जनवरी - 2020",
  "sKVzoBB7PkUETY8XieDzOXZ7oORolT3qO2KcKHe5.pdf": "हरियाणा खेती जनवरी - 2021",
  "6vW4BV4QmDc3Zp7F7NplCVymEgOdxVJvIQLKVFc0.pdf": "हरियाणा खेती फरवरी - 2020",
  "hVjyACeOkAuFCwc5IRXTskfaZlMscstmzNQEf78D.pdf": "हरियाणा खेती फरवरी - 2021",
  "lF4GJu3VjUInKbucnphbYkz9AtDPiP5iBuPybBxk.pdf": "हरियाणा खेती मार्च - 2020",
  "QcS2QssSqyZMyCESEgmlVJRWvFdyl6JaHrvcJUr7.pdf": "हरियाणा खेती मार्च - 2021",
  "hRcq0UrMUmVctEw6XW2Gcg8xeeqWN9NLPPmogZm2.pdf": "हरियाणा खेती अप्रैल - 2020",
  "pUHfIuL9xcWbtfQH0difEzTAGgonsOuNztnaRziU.pdf": "हरियाणा खेती अप्रैल - 2021",
  "jeDobXXmeZ5yG3x7kPAoAksV97N87hAOtD011pHw.pdf": "हरियाणा खेती मई - 2020",
  "CddeK9NbiAchC9rYAJORj6VplIcMcrwHw5NMwVVw.pdf": "हरियाणा खेती जून - 2020",
  "XsDa34CgXbzmPOgZTLsHNTr49PBkblSZd100n6Cf.pdf": "हरियाणा खेती जुलाई - 2020",
  "Nhc6RJhzqOBajAE2Z3AY7KiLNne1YEnAWLqN9zMn.pdf": "हरियाणा खेती अगस्त - 2020",
  "aosp18O06e2k939MKQKQbb6qQFcGpn9OnWgXLsAY.pdf": "हरियाणा खेती सितंबर - 2020",
  "8FKtveevw7eR2kaDbxxKHb5T0hvXIqrQxm0ttSsj.pdf": "हरियाणा खेती अक्टूबर - 2020",
  "88tEmH1ToG3FsEBvVBtMj9kGj2ex5sqQgDCWybWA.pdf": "हरियाणा खेती नवंबर - 2020",
  "I99kAdYrtP5pf3vENpVyXsqjEfMWawYz7MzLqcGi.pdf": "हरियाणा खेती दिसंबर - 2020",
};

const TITLE = "हरियाणा खेती";

function replaceAnchorText(html) {
  return html.replace(
    /(<a\b[^>]*href="([^"]+\.pdf)"[^>]*>)([\s\S]*?)(<\/a>)/gi,
    (full, open, href, inner, close) => {
      const file = href.split("/").pop().split("?")[0];
      const label = LABELS_BY_PDF[file];
      if (!label) return full;
      const plain = inner.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      // Skip empty spacer duplicate anchors (whitespace-only)
      if (!plain && !/\?/.test(inner)) return full;
      // Keep nested span wrappers when present for year books
      if (/<span[\s\S]*<\/span>/i.test(inner) && /\?/.test(inner)) {
        return `${open}<span style="font-size:24px">${label}</span>${close}`;
      }
      return `${open}${label}${close}`;
    },
  );
}

function fixTitle(html) {
  return html.replace(
    /(<span style="color:rgb\(65, 168, 95\)">)([^<]*)(<\/span>)/,
    `$1${TITLE}$3`,
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
  const { createClient } = requireFromWeb("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("ccshau_pages")
    .select("id, title_en, title_hi, content_en")
    .eq("slug", "haryanakheti")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Page haryanakheti not found");

  let content = fixTitle(replaceAnchorText(data.content_en));
  // Remove leftover pure-whitespace duplicate PDF anchors that only add noise
  content = content.replace(
    /<a class="fr-file" href="[^"]+">(?:&nbsp;|\s| )+<\/a>/g,
    "",
  );

  const remainingQ = (content.match(/\?{5,}/g) || []).length;
  console.log({
    mode: APPLY ? "APPLY" : "dry-run",
    beforeQ: (data.content_en.match(/\?{5,}/g) || []).length,
    afterQ: remainingQ,
    titleWas: data.title_en,
  });

  writeFileSync(join(__dirname, "reports/haryanakheti-fixed.html"), content, "utf8");

  if (!APPLY) {
    console.log("Wrote preview to reports/haryanakheti-fixed.html — pass --apply to update Supabase.");
    return;
  }

  const { error: updErr } = await supabase
    .from("ccshau_pages")
    .update({
      title_en: "Haryana Kheti",
      title_hi: TITLE,
      content_en: content,
      content_hi: content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  if (updErr) throw updErr;
  console.log("Updated ccshau_pages.slug=haryanakheti");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
