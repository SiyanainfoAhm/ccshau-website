#!/usr/bin/env node
/**
 * Fix leftover English fragments in Mountaineering Guidelines Hindi.
 *
 *   node scripts/ops/fix-dsw-mountaineering-guidelines-hi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");
const SIDEBAR_ID = "b1fde6bc-d6cf-4768-9526-16eff9624908";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

const FIXES = [
  [
    "The first step to planning a journey is",
    "यात्रा की योजना बनाने का पहला कदम है",
  ],
  [
    "मानचित्रs that follow international agreements usually use",
    "अंतरराष्ट्रीय समझौतों का पालन करने वाले मानचित्र सामान्यतः उपयोग करते हैं",
  ],
  [
    "maps that follow international agreements usually use",
    "अंतरराष्ट्रीय समझौतों का पालन करने वाले मानचित्र सामान्यतः उपयोग करते हैं",
  ],
  ["उपकरण required by the type of track", "पथ के प्रकारानुसार आवश्यक उपकरण"],
  ["Equipment required by the type of track", "पथ के प्रकारानुसार आवश्यक उपकरण"],
  [
    "compute 15 minutes of rest every hour of walk",
    "प्रत्येक घंटे चलने पर 15 मिनट विश्राम गिनें",
  ],
  [
    "added on the foot (i.e. in the shoes) equals to",
    "पैर पर (अर्थात् जूतों में) जोड़ने पर बराबर होता है",
  ],
  ["Last tip:", "अंतिम सुझाव:"],
  [
    ") start an excursion with a new pair of shoes, modern boots are very adaptable but some fitting (blisters included) is always required.",
    ") नए जूतों की जोड़ी से भ्रमण आरंभ न करें; आधुनिक जूते अनुकूल होते हैं किंतु कुछ फिटिंग (छाले सहित) सदैव आवश्यक होती है।",
  ],
  // orphaned leading "A " before मानचित्र (from "A map …")
  [
    `">A <b style="font-size:13.3333px;vertical-align:baseline;background:transparent">मानचित्र</b>`,
    `"><b style="font-size:13.3333px;vertical-align:baseline;background:transparent">मानचित्र</b>`,
  ],
  [">A <b", "><b"], // safer generic if style attrs differ slightly — only if still present
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,content_hi")
    .eq("id", SIDEBAR_ID)
    .single();
  if (error) throw error;

  let hi = data.content_hi || "";
  const applied = [];
  for (const [en, hiText] of FIXES) {
    if (hi.includes(en)) {
      hi = hi.split(en).join(hiText);
      applied.push(en.slice(0, 60));
    }
  }

  // Extra: if "A मानचित्र" pattern with any b/span
  hi = hi.replace(/(>[^<]*)\bA\s+(<(?:b|strong|span)[^>]*>मानचित्र)/gi, "$1$2");

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("fixes applied:", applied.length ? applied : "(none matched by exact string)");
  console.log("still has first-step EN?", hi.includes("The first step to planning"));
  console.log("still has A before map?", /A\s*<[^>]*>मानचित्र/.test(hi) || />A\s*<b/.test(hi));

  const plain = hi.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const leftover = [...new Set(plain.match(/\b[A-Za-z][A-Za-z'’\-]{3,}(?:\s+[A-Za-z][A-Za-z'’\-]{2,}){2,}\b/g) || [])];
  console.log("remaining multi-word EN:", leftover.slice(0, 15));

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const { error: upErr } = await sb
    .from("ccshau_page_sidebar_items")
    .update({ content_hi: hi, updated_at: new Date().toISOString() })
    .eq("id", SIDEBAR_ID);
  if (upErr) throw upErr;
  console.log("OK guidelines content_hi fixed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
