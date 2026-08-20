/**
 * Probe major-initiative live data + current Supabase page.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

const html = await (await fetch("https://hau.ac.in/page/major-initiative")).text();

// Extract card-like blocks
const cards = [];
const cardRe =
  /<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h\d[^>]*>([\s\S]*?)<\/h\d>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
let m;
while ((m = cardRe.exec(html)) !== null) {
  cards.push({
    href: m[1],
    img: m[2],
    title: m[3].replace(/<[^>]+>/g, "").trim(),
    excerpt: m[4].replace(/<[^>]+>/g, "").trim().slice(0, 200),
  });
}

// Broader: look for initiative titles from web search
const titles = [
  "Sports Facilities",
  "Experiential Learning",
  "Deendayal",
  "Agri-tourism",
  "Agri tourism",
];
for (const t of titles) {
  const i = html.indexOf(t);
  if (i >= 0) {
    console.log("\n---", t, "---");
    console.log(html.slice(Math.max(0, i - 300), i + 500).replace(/\s+/g, " ").slice(0, 700));
  }
}

for (const slug of ["major-initiative", "major-initiatives"]) {
  for (const id of [0, 1, 52]) {
    const r = await fetch(`https://hau.ac.in/page-data/${slug}/${id}`);
    const text = await r.text();
    if (!text || text === "null" || text.startsWith("<")) continue;
    const data = JSON.parse(text);
    console.log("page-data", slug, id, {
      title: data.page_title,
      contentLen: String(data.page_content || "").length,
      file: data.file,
    });
  }
}

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: page } = await sb
  .from("ccshau_pages")
  .select("id,slug,title_en,content_en,page_type,layout_template,status")
  .eq("slug", "major-initiatives")
  .maybeSingle();

const { data: initiatives } = await sb
  .from("ccshau_homepage_initiatives")
  .select("id,title_en,slug,excerpt_en,image_path,href,sort_order,is_active")
  .order("sort_order")
  .limit(20);

console.log("\ncards found", cards.length, cards);
console.log("supabase page", page);
console.log(
  "homepage initiatives",
  (initiatives || []).map((i) => ({
    title: i.title_en,
    slug: i.slug,
    href: i.href,
    active: i.is_active,
  })),
);

mkdirSync(join(__dirname, "reports"), { recursive: true });
writeFileSync(
  join(__dirname, "reports", "major-initiative-probe.json"),
  JSON.stringify({ cards, page, initiatives }, null, 2),
);
