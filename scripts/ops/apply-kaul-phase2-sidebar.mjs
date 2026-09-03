#!/usr/bin/env node
/**
 * Phase 2 — Kaul sidebar labels (exact curated Hindi, no phrase substitution).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

/** Exact label_en → label_hi for Kaul Agriculture College dept page. */
export const KAUL_SIDEBAR_LABELS_HI = {
  "Faculty awards and recognitions": "संकाय पुरस्कार एवं सम्मान",
  "Ongoining Research Projects": "चल रही अनुसंधान परियोजनाएँ",
  "Students on Roll (2022-23)": "नामांकित छात्र (2022-23)",
  "Academic Achievements of Students": "छात्रों की शैक्षणिक उपलब्धियाँ",
  "NCC Unit and Acheivements": "एन.सी.सी. इकाई एवं उपलब्धियाँ",
  "NSS and its achievements": "एन.एस.एस. एवं इसकी उपलब्धियाँ",
  "Scholarships and Stipends": "छात्रवृत्ति एवं मानदेय",
  "Courses taught": "पढ़ाए गए पाठ्यक्रम",
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

const { data: page } = await supabase
  .from("ccshau_pages")
  .select("id")
  .eq("slug", "kaul-agriculture-college")
  .maybeSingle();
if (!page) throw new Error("kaul-agriculture-college not found");

const { data: items } = await supabase
  .from("ccshau_page_sidebar_items")
  .select("id, label_en, label_hi")
  .eq("page_id", page.id)
  .eq("is_active", true);

const plans = [];
for (const item of items ?? []) {
  const en = item.label_en?.trim();
  const target = en ? KAUL_SIDEBAR_LABELS_HI[en] : null;
  if (!target || target === item.label_hi) continue;
  plans.push({ id: item.id, en, from: item.label_hi, to: target });
}

console.log(`Phase 2 sidebar: ${plans.length} update(s) | ${APPLY ? "APPLY" : "dry-run"}`);
for (const p of plans) console.log(`  ${p.en}\n    ${p.from ?? "(null)"} → ${p.to}`);

if (APPLY) {
  for (const p of plans) {
    await supabase.from("ccshau_page_sidebar_items").update({ label_hi: p.to }).eq("id", p.id);
  }
}
