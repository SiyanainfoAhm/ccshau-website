/**
 * Probe hau.ac.in PDF URLs in the 4 major-initiative college pages.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

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

const PAGE_IDS = [
  "bf8bef31-42b3-4a76-8fdb-7ae882d01ae4", // sports
  "25271522-2df4-4200-9d1d-34a7aaa89d2a", // elp
  "0d68f527-6616-4578-ae9f-dd69b94144fe", // deendayal
  "6c837a4d-697c-4f29-beff-6cd16c1d57ab", // agri
];

const PDF_RE =
  /https?:\/\/(?:www\.)?hau\.ac\.in\/[^"'\\\s>]+\.pdf(?:\?[^"'\\\s>]*)?/gi;

function collect(html) {
  return [...String(html || "").matchAll(PDF_RE)].map((m) => m[0]);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const all = new Map();

for (const pageId of PAGE_IDS) {
  const { data: page } = await sb
    .from("ccshau_pages")
    .select("id,slug,content_en")
    .eq("id", pageId)
    .maybeSingle();
  for (const u of collect(page?.content_en)) {
    all.set(u, (all.get(u) || 0) + 1);
  }
  console.log("root", page?.slug, "hauPdfs", collect(page?.content_en).length);

  const { data: side } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,content_en")
    .eq("page_id", pageId)
    .eq("is_active", true);
  for (const s of side || []) {
    const urls = collect(s.content_en);
    if (urls.length) {
      console.log("  sidebar", s.label_en, urls.length);
      for (const u of urls) all.set(u, (all.get(u) || 0) + 1);
    }
  }

  const { data: children } = await sb
    .from("ccshau_pages")
    .select("id,slug,content_en")
    .eq("college_root_id", pageId);
  for (const c of children || []) {
    const urls = collect(c.content_en);
    if (urls.length) {
      console.log("  child", c.slug, urls.length);
      for (const u of urls) all.set(u, (all.get(u) || 0) + 1);
    }
  }
}

console.log("\nUnique hau PDF URLs:", all.size);
for (const [u, n] of [...all.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(n, u);
}
