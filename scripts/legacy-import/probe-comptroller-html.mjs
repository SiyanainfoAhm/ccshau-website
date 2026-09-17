import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
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
    )
      v = v.slice(1, -1);
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
const { data } = await sb
  .from("ccshau_pages")
  .select("id,slug,content_en")
  .eq("slug", "comptroller-office")
  .maybeSingle();
const html = data?.content_en || "";
console.log(
  JSON.stringify(
    {
      id: data?.id,
      len: html.length,
      hasDivInP: /<p\b[^>]*>[\s\S]*?<div\b/i.test(html),
      hasPInP: /<p\b[^>]*>[\s\S]*?<p\b/i.test(html),
      openP: (html.match(/<p\b/gi) || []).length,
      closeP: (html.match(/<\/p>/gi) || []).length,
      snippet: html.slice(0, 400),
    },
    null,
    2,
  ),
);
