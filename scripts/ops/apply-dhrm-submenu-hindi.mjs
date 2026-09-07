#!/usr/bin/env node
/**
 * Fix DHRM submenu title_hi (broken Hinglish → curated Hindi).
 *
 *   node scripts/ops/apply-dhrm-submenu-hindi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

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
  {
    slug: "hrm-academy-of-agricultural-research-education-management",
    title_hi: "कृषि अनुसंधान एवं शिक्षा प्रबंधन अकादमी",
  },
  {
    slug: "hrm-ipr-cell-bpd-unit",
    title_hi: "आई.पी.आर. प्रकोष्ठ एवं बी.पी.डी. इकाई",
  },
  {
    slug: "hrm-manpower-assessment-cell",
    title_hi: "जनशक्ति आकलन प्रकोष्ठ",
  },
  // already Hindi — ensure consistent
  {
    slug: "hrm-directorate",
    title_hi: "निदेशालय",
  },
  {
    slug: "hrm-planning-and-evaluation-section",
    title_hi: "योजना और मूल्यांकन अनुभाग",
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  for (const fix of FIXES) {
    const { data, error } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, title_hi")
      .eq("slug", fix.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      console.log(`MISSING ${fix.slug}`);
      continue;
    }
    console.log(`  ${fix.slug}`);
    console.log(`    was: ${data.title_hi}`);
    console.log(`    now: ${fix.title_hi}`);
    if (!APPLY) continue;
    const { error: upErr } = await supabase
      .from("ccshau_pages")
      .update({ title_hi: fix.title_hi, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (upErr) throw new Error(`${fix.slug}: ${upErr.message}`);
    console.log(`    OK`);
  }
  if (!APPLY) console.log("Pass --apply to update.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
