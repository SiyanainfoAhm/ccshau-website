/**
 * Probe 4 Major Initiative college microsites on live HAU + Supabase.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const SLUGS = [
  "sports-facilities",
  "experiential-learning-programme",
  "deendayal-upadhyay-centre-of-excellence-for-organic-farming",
  "agri-tourism-center",
];

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
  { auth: { persistSession: false } },
);

const report = {};

for (const slug of SLUGS) {
  const liveHtml = await (await fetch(`https://hau.ac.in/college/${slug}`)).text();
  const collegeIds = [
    ...new Set(
      [...liveHtml.matchAll(/getPageDetail\('(\d+)'/g)].map((m) => Number(m[1])),
    ),
  ];
  const menu = [
    ...liveHtml.matchAll(/getPageDetail\('(\d+)','([^']+)'\)[^>]*>([^<]+)/gi),
  ].map((m) => ({
    collegeId: Number(m[1]),
    path: m[2],
    label: m[3].replace(/&#039;/g, "'").trim(),
  }));

  const uniqueMenu = [];
  const seen = new Set();
  for (const item of menu) {
    const key = `${item.path}|${item.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueMenu.push(item);
  }

  const collegeId = collegeIds[0] ?? null;
  const pages = {};
  if (collegeId != null) {
    for (const item of uniqueMenu) {
      const pageSlug = item.path.replace(/^page\//, "");
      const r = await fetch(`https://hau.ac.in/page-data/${pageSlug}/${collegeId}`);
      const t = await r.text();
      if (!t || t === "null" || t.startsWith("<")) {
        // try college 0
        const r0 = await fetch(`https://hau.ac.in/page-data/${pageSlug}/0`);
        const t0 = await r0.text();
        if (!t0 || t0 === "null" || t0.startsWith("<")) {
          pages[pageSlug] = null;
          continue;
        }
        const d0 = JSON.parse(t0);
        pages[pageSlug] = {
          title: d0.page_title,
          contentLen: String(d0.page_content || "").length,
          file: d0.file,
          via: 0,
        };
        continue;
      }
      const d = JSON.parse(t);
      pages[pageSlug] = {
        title: d.page_title,
        contentLen: String(d.page_content || "").length,
        file: d.file,
        via: collegeId,
      };
    }
  }

  // home about snippet
  const about = liveHtml
    .match(/<div[^>]*class="[^"]*about[^"]*"[^>]*>[\s\S]{0,2000}|Experiential learning[\s\S]{0,600}|Deendayal Upadhyay[\s\S]{0,600}|Botanical Garden[\s\S]{0,600}|Sports and games[\s\S]{0,600}/i)?.[0]
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

  const { data: row } = await sb
    .from("ccshau_pages")
    .select(
      "id,slug,title_en,page_type,layout_template,college_root_id,content_en,layout_config,logo_image_path,featured_image_path",
    )
    .eq("slug", slug)
    .maybeSingle();

  let children = [];
  if (row?.id) {
    const { data: kids } = await sb
      .from("ccshau_pages")
      .select("id,slug,title_en,parent_id,status")
      .or(`parent_id.eq.${row.id},college_root_id.eq.${row.id}`)
      .limit(40);
    children = kids || [];
  }

  report[slug] = {
    collegeIds,
    collegeId,
    menu: uniqueMenu,
    pages,
    about,
    supabase: row,
    children: children.map((c) => ({ slug: c.slug, title: c.title_en, parent: c.parent_id === row?.id })),
  };
}

mkdirSync(join(__dirname, "reports"), { recursive: true });
writeFileSync(
  join(__dirname, "reports", "probe-major-initiative-colleges.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
