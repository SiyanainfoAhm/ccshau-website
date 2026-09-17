import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
for (const line of readFileSync(join(ROOT, "apps/web/.env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

// Load normalize via tsx-less: duplicate import from built? Use dynamic import of .ts may fail.
// Inline test by reading and eval is messy — spawn via node --experimental-strip-types if available
const mod = await import(
  pathToFileURL(join(ROOT, "apps/web/src/lib/html/sanitize-cms-html.ts")).href
);

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data } = await sb
  .from("ccshau_pages")
  .select("content_en")
  .eq("slug", "college-of-agriculture-bawal")
  .maybeSingle();

const out = mod.normalizeCmsHtml(data.content_en);
console.log(out.slice(0, 1800));
