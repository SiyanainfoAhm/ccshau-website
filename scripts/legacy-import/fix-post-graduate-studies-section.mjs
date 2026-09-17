/**
 * Fix Post Graduate Studies section page:
 * - Dean name → Dr. Atul Dhingra
 * - layout_config so main content renders
 * - sort order first in dropdown
 *
 * Usage: node fix-post-graduate-studies-section.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");

function loadEnv(path) {
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

loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

const LAYOUT = {
  hero: true,
  headOfficer: false,
  contacts: false,
  staff: false,
  gallery: false,
  mainContent: true,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id,slug,content_en,content_hi,sort_order,layout_config,status")
    .eq("slug", "post-graduate-studies")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error("post-graduate-studies missing");

  const contentEn = (page.content_en || "")
    .replace(/Dr\.\s*Kamal\s*Dutt\s*Sharma/gi, "Dr. Atul Dhingra")
    .replace(/डॉ\.\s*कमल\s*दत्त\s*शर्मा/g, "डॉ. अतुल ढींगरा");
  const contentHi = (page.content_hi || "")
    .replace(/Dr\.\s*Kamal\s*Dutt\s*Sharma/gi, "Dr. Atul Dhingra")
    .replace(/डॉ\.\s*कमल\s*दत्त\s*शर्मा/g, "डॉ. अतुल ढींगरा");

  console.log({
    beforeHasKamal: /Kamal\s*Dutt\s*Sharma/i.test(page.content_en || ""),
    afterHasAtul: /Atul\s*Dhingra/i.test(contentEn),
    hasProgrammes: /Postgraduate Programmes/i.test(contentEn),
    mode: CONFIRM ? "apply" : "dry-run",
  });

  if (!CONFIRM) {
    console.log("Pass --confirm to write");
    return;
  }

  const { error: upErr } = await sb
    .from("ccshau_pages")
    .update({
      content_en: contentEn,
      content_hi: contentHi || null,
      layout_template: "standard",
      layout_config: LAYOUT,
      sort_order: 1,
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", page.id);
  if (upErr) throw new Error(upErr.message);

  // Keep sibling dropdown order stable
  const order = {
    "pg-course-catalogue": 2,
    "pg-proforma": 3,
    "seminar-registration": 4,
  };
  for (const [slug, sort] of Object.entries(order)) {
    await sb
      .from("ccshau_pages")
      .update({ sort_order: sort, updated_at: new Date().toISOString() })
      .eq("slug", slug);
  }

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
