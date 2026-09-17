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
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: page } = await sb
  .from("ccshau_pages")
  .select(
    "id,slug,title_en,status,content_en,parent_id,page_type,layout_template,excerpt_en",
  )
  .eq("slug", "ecs-house-allotment")
  .maybeSingle();

let parent = null;
if (page?.parent_id) {
  const { data } = await sb
    .from("ccshau_pages")
    .select("id,slug,title_en,parent_id")
    .eq("id", page.parent_id)
    .maybeSingle();
  parent = data;
}

mkdirSync(REPORT, { recursive: true });
writeFileSync(
  join(REPORT, "local-ecs-house-allotment.html"),
  page?.content_en || "",
);

const text = (page?.content_en || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

console.log(
  JSON.stringify(
    {
      page: page
        ? {
            id: page.id,
            slug: page.slug,
            title: page.title_en,
            status: page.status,
            parent: parent?.slug,
            contentLen: (page.content_en || "").length,
            preview: text.slice(0, 500),
            linkCount: (page.content_en || "").match(/href=/gi)?.length ?? 0,
          }
        : null,
    },
    null,
    2,
  ),
);
