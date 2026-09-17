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

const id = "78105fbf-4a6f-413b-905d-d57fb43e82a1";
const { data, error } = await sb
  .from("ccshau_pages")
  .select(
    "id,slug,status,page_type,layout_template,excerpt_en,content_en,content_hi,published_at,updated_at",
  )
  .or(`id.eq.${id},slug.eq.vice-chancellor`);

console.log(
  JSON.stringify(
    {
      error: error?.message ?? null,
      rows: (data || []).map((r) => ({
        id: r.id,
        slug: r.slug,
        status: r.status,
        page_type: r.page_type,
        layout_template: r.layout_template,
        excerpt_en: r.excerpt_en,
        contentLen: (r.content_en || "").length,
        contentHiLen: (r.content_hi || "").length,
        contentPreview: String(r.content_en || "")
          .replace(/\s+/g, " ")
          .slice(0, 180),
        textOnlyLen: String(r.content_en || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim().length,
        updated_at: r.updated_at,
      })),
    },
    null,
    2,
  ),
);
