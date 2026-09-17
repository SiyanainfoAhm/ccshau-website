#!/usr/bin/env node
/**
 * Translate University Committees page Hindi fields.
 *
 *   node scripts/ops/fix-university-committees-hindi.mjs
 *   node scripts/ops/fix-university-committees-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const PAGE_ID = "8dd170b9-fcb6-463c-b07e-77c3adfe85e4";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const title_hi = "विश्वविद्यालय समितियाँ";
const excerpt_hi = "विश्वविद्यालय समितियाँ — सीसीएस एचएयू।";
const content_hi = [
  '<p><span style="font-size:24px"><strong>विश्वविद्यालय समितियाँ</strong></span></p>',
  '<p><a class="fr-file" href="https://hau.ac.in/storage/app/uploads/VB0E1o4YlpgPG3A5yzQgVBETWVUm29BwZS6I7vch.pdf">आंतरिक गुणवत्ता आश्वासन प्रकोष्ठ (IQAC)</a></p>',
  '<p><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/xCLmKxZdFoakQWgontbM650iJiToEp87SFtlpX27.pdf">आंतरिक शिकायत समिति</a></p>',
  '<p><a class="fr-file" href="https://hau.ac.in/storage/app/uploads/lDSDVtRwkGMEZhBh2dk2onKKjkrznCFpZaQnB9e0.pdf">आंतरिक शिकायत निवारण समिति (अनुसूचित जाति)</a></p>',
  '<p><a class="fr-file" href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/PettgcfiukHzhy7e26wtX66CU7xD7XZg3FojXsxQ.pdf">विश्वविद्यालय स्तरीय एंटी-रैगिंग समिति</a></p>',
  '<p><a class="fr-file" href="https://hau.ac.in/storage/app/uploads/dpFJ0gJifkexE5Fe44vv20kxY3SPB4IyEQ1TBSaH.pdf">गैर-शिक्षण कर्मचारियों की शिकायत समिति</a></p>',
  '<p><a class="fr-file" href="https://hau.ac.in/storage/app/uploads/hNnTuVkPxxURAzIcFXzkQnLlRPKZvTRGaYnUVafB.pdf">पुरस्कार एवं रैंकिंग प्रकोष्ठ समिति</a></p>',
  '<p><a class="fr-file" href="https://hau.ac.in/storage/app/uploads/TJbfneFSjw2k3dE3Xo1UqV58oBBFOeLoaHGAXNWc.pdf">फैकल्टी क्लब सलाहकार समिति</a></p>',
  '<p><a class="fr-file" href="https://hau.ac.in/storage/app/uploads/i3ZRwIcVvyqGQ09fARVAnBMuRfY8BOH0RBg1MtLB.pdf">महिलाओं के यौन उत्पीड़न संबंधी आंतरिक शिकायत समिति</a></p>',
].join("");

const { data: before, error: readError } = await supabase
  .from("ccshau_pages")
  .select("id, slug, title_hi, excerpt_hi")
  .eq("id", PAGE_ID)
  .single();
if (readError) throw readError;

console.log("before:", before);
console.log({ title_hi, excerpt_hi, content_hi_preview: content_hi.slice(0, 180) });

if (!APPLY) {
  console.log("Dry-run. Pass --apply to update CMS.");
  process.exit(0);
}

const { data, error } = await supabase
  .from("ccshau_pages")
  .update({
    title_hi,
    excerpt_hi,
    content_hi,
    updated_at: new Date().toISOString(),
  })
  .eq("id", PAGE_ID)
  .select("slug, title_hi, excerpt_hi")
  .single();
if (error) throw error;
console.log("updated:", data);
