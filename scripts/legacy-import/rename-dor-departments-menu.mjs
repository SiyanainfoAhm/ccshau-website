/**
 * Rename Directorate of Research nav "Departments" → "Research services"
 * Usage: node rename-dor-departments-menu.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIRM = process.argv.includes("--confirm");
const NEW_TITLE = "Research services";

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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: college, error: cErr } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en")
  .eq("slug", "directorate-of-research")
  .maybeSingle();
if (cErr) throw new Error(cErr.message);
if (!college) throw new Error("College not found");

const { data: sections, error: sErr } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en,parent_id")
  .eq("parent_id", college.id)
  .order("sort_order");
if (sErr) throw new Error(sErr.message);

console.log(
  "sections:",
  (sections || []).map((s) => `${s.slug} | ${s.title_en}`),
);

const target =
  (sections || []).find((s) => /^departments?$/i.test(s.slug)) ||
  (sections || []).find((s) => /department/i.test(s.title_en || ""));

if (!target) throw new Error("Departments section not found");

console.log("update", target.id, target.slug, target.title_en, "->", NEW_TITLE);

if (!CONFIRM) {
  console.log("dry-run only; pass --confirm to write");
  process.exit(0);
}

const { error } = await sb
  .from("ccshau_pages")
  .update({
    title_en: NEW_TITLE,
    updated_at: new Date().toISOString(),
  })
  .eq("id", target.id);
if (error) throw new Error(error.message);
console.log("done");
