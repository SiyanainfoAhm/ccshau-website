import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
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

const { data: hub } = await sb
  .from("ccshau_pages")
  .select(
    "id,slug,title_en,head_name_en,head_role_en,head_image_path,content_en,layout_config,status,office_cta_enabled",
  )
  .eq("slug", "pg-studies")
  .maybeSingle();

const { data: contacts } = await sb
  .from("ccshau_page_contact_lines")
  .select("*")
  .eq("page_id", hub.id)
  .order("sort_order");

const { data: kids } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en,status,content_en,head_name_en")
  .eq("parent_id", hub.id)
  .order("slug");

const html = await (
  await fetch("http://localhost:3000/pages/pg-studies")
).text();

console.log(
  JSON.stringify(
    {
      hub: {
        head_name_en: hub.head_name_en,
        head_role_en: hub.head_role_en,
        head_image_path: hub.head_image_path,
        contentLen: (hub.content_en || "").length,
        contentHasResponsibilities: /upgrade the course work/i.test(
          hub.content_en || "",
        ),
        contentHasProgrammes: /Postgraduate Programmes/i.test(
          hub.content_en || "",
        ),
        layout_config: hub.layout_config,
      },
      contacts: contacts?.map((c) => ({
        label: c.label_en,
        value: c.value_en,
        active: c.is_active,
      })),
      kids: kids?.map((k) => ({
        slug: k.slug,
        title: k.title_en,
        status: k.status,
        head: k.head_name_en,
        contentLen: (k.content_en || "").length,
      })),
      localHtml: {
        hasAtul: /Atul Dhingra/i.test(html),
        hasResponsibilities: /upgrade the course work/i.test(html),
        hasProgrammes: /Postgraduate Programmes/i.test(html),
        hasAbout: /About PG Studies/i.test(html),
        hasMailing: /Mailing Address/i.test(html),
        hasDeanPhoto: /kLRPBxd|pg-studies\/dean/i.test(html),
      },
    },
    null,
    2,
  ),
);
