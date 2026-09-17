import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
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
  .select(
    "id,slug,title_en,status,layout_template,layout_config,content_en,content_hi,head_name_en,parent_id,sort_order",
  )
  .eq("slug", "post-graduate-studies")
  .maybeSingle();

const text = (data?.content_en || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

mkdirSync(REPORT, { recursive: true });
writeFileSync(
  join(REPORT, "post-graduate-studies-content.txt"),
  data?.content_en || "",
);

console.log(
  JSON.stringify(
    {
      id: data?.id,
      status: data?.status,
      layout_template: data?.layout_template,
      layout_config: data?.layout_config,
      head: data?.head_name_en,
      sort_order: data?.sort_order,
      contentLen: (data?.content_en || "").length,
      hasAtul: /Atul/i.test(data?.content_en || ""),
      hasResponsibilities: /upgrade the course work/i.test(
        data?.content_en || "",
      ),
      hasProgrammes: /Postgraduate Programmes/i.test(data?.content_en || ""),
      preview: text.slice(0, 600),
    },
    null,
    2,
  ),
);
