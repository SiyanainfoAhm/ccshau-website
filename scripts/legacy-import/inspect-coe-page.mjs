import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT = join(dirname(fileURLToPath(import.meta.url)), "reports");

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
mkdirSync(REPORT, { recursive: true });

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en,content_en,parent_id,layout_config")
  .or("slug.eq.controller-of-examination,slug.eq.registrar-office");
if (error) throw error;

for (const r of data || []) {
  writeFileSync(join(REPORT, `${r.slug}-content.html`), r.content_en || "");
  console.log(r.slug, r.id, "len", (r.content_en || "").length);
  if (r.layout_config) {
    writeFileSync(
      join(REPORT, `${r.slug}-layout.json`),
      JSON.stringify(r.layout_config, null, 2),
    );
  }
}

// Also check child pages under registrar
const registrar = (data || []).find((d) => d.slug === "registrar-office");
if (registrar) {
  const { data: kids } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,content_en")
    .eq("parent_id", registrar.id);
  for (const k of kids || []) {
    writeFileSync(join(REPORT, `${k.slug}-content.html`), k.content_en || "");
    console.log("child", k.slug, "len", (k.content_en || "").length);
  }
}
