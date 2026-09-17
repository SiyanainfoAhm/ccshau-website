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

const PAGE_ID = "47e309dd-e6d4-4857-a1fc-1ff45c665fb6";
const { data: sidebars } = await sb
  .from("ccshau_page_sidebar_items")
  .select("id,label_en,href,content_en,is_active,sort_order")
  .eq("page_id", PAGE_ID)
  .eq("is_active", true)
  .order("sort_order");

mkdirSync(REPORT, { recursive: true });
for (const s of sidebars || []) {
  const safe = String(s.label_en || s.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60);
  writeFileSync(join(REPORT, `ecs-ha-sidebar-${safe}.html`), s.content_en || "");
  const links = [...String(s.content_en || "").matchAll(/href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  console.log({
    label: s.label_en,
    href: s.href,
    sort: s.sort_order,
    contentLen: (s.content_en || "").length,
    links,
    preview: String(s.content_en || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180),
  });
}
