/**
 * Reorder Directorate of Research nav:
 * Home | Research services | Gallery | Contact us
 * Usage: node reorder-dor-nav.mjs --confirm
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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: college, error: cErr } = await sb
  .from("ccshau_pages")
  .select("id,slug")
  .eq("slug", "directorate-of-research")
  .maybeSingle();
if (cErr) throw new Error(cErr.message);
if (!college) throw new Error("College not found");

const { data: sections, error: sErr } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en,sort_order")
  .eq("parent_id", college.id)
  .order("sort_order");
if (sErr) throw new Error(sErr.message);

console.log(
  "before:",
  (sections || []).map((s) => `${s.sort_order} ${s.slug} | ${s.title_en}`),
);

const research =
  (sections || []).find((s) => s.slug === "departments") ||
  (sections || []).find((s) => /research services/i.test(s.title_en || ""));
const gallery =
  (sections || []).find((s) => /gallery/i.test(s.slug)) ||
  (sections || []).find((s) => /gallery/i.test(s.title_en || ""));

if (!research || !gallery) {
  throw new Error(
    `Missing sections research=${!!research} gallery=${!!gallery}`,
  );
}

// Home + Contact are fixed in code; middle order follows sort_order ascending.
const desired = [
  { id: research.id, slug: research.slug, sort_order: 10 },
  { id: gallery.id, slug: gallery.slug, sort_order: 20 },
];

console.log(
  "desired:",
  desired.map((d) => `${d.sort_order} ${d.slug}`),
);

if (!CONFIRM) {
  console.log("dry-run only; pass --confirm to write");
  process.exit(0);
}

for (const row of desired) {
  const { error } = await sb
    .from("ccshau_pages")
    .update({
      sort_order: row.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) throw new Error(`${row.slug}: ${error.message}`);
  console.log("updated", row.slug, "->", row.sort_order);
}

console.log("done");
