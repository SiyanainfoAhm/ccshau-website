/**
 * Inspect Bawal college content_en + normalizeCmsHtml output.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Import normalize from compiled? reimplement quickly by reading file
const { normalizeCmsHtml, sanitizeCmsHtml } = await import(
  join(ROOT, "apps/web/src/lib/html/sanitize-cms-html.ts")
).catch(async () => {
  // ts import may fail; use dynamic eval of the logic via spawning node with tsx
  return { normalizeCmsHtml: null, sanitizeCmsHtml: null };
});

const { data } = await sb
  .from("ccshau_pages")
  .select("id, slug, content_en, content_hi")
  .eq("slug", "college-of-agriculture-bawal")
  .maybeSingle();

const raw = data?.content_en || "";
console.log("len", raw.length);
console.log("hasHtml", /<[a-z][\s\S]*>/i.test(raw));
console.log("newline count", (raw.match(/\n/g) || []).length);
console.log("double newline count", (raw.match(/\n\s*\n/g) || []).length);
console.log("--- RAW (JSON) ---");
console.log(JSON.stringify(raw.slice(0, 800)));
console.log("--- RAW full preview ---");
console.log(raw.slice(0, 1200));

if (normalizeCmsHtml) {
  const n = normalizeCmsHtml(raw);
  console.log("--- NORMALIZED ---");
  console.log(n.slice(0, 1500));
}
