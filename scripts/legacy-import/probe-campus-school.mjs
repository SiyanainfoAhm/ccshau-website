/**
 * Probe Campus School (legacy college_id 52) live APIs + current Supabase row.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const LEGACY_COLLEGE_ID = 52;

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

async function pageData(slug) {
  const res = await fetch(`https://hau.ac.in/page-data/${slug}/${LEGACY_COLLEGE_ID}`);
  const text = await res.text();
  if (!text || text === "null" || text.startsWith("<")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const homeHtml = await (await fetch("https://hau.ac.in/college/campus-school")).text();

// Extract getPageDetail / menu labels from live HTML
const menuLabels = [
  ...homeHtml.matchAll(/getPageDetail\('52','([^']+)'\)[^>]*>([^<]+)/gi),
].map((m) => ({ path: m[1], label: m[2].trim() }));

const quickLinks = [
  ...homeHtml.matchAll(/onclick="getPageDetail\('52','([^']+)'\)"[^>]*>([^<]+)/gi),
].map((m) => ({ path: m[1], label: m[2].trim() }));

const uniqueSlugs = [
  ...new Set(
    [...menuLabels, ...quickLinks]
      .map((x) => {
        const p = x.path.replace(/^page\//, "").replace(/\/$/, "");
        return p;
      })
      .filter(Boolean),
  ),
];

const pages = {};
for (const slug of uniqueSlugs) {
  const data = await pageData(slug);
  pages[slug] = data
    ? {
        title: data.page_title,
        contentLen: String(data.page_content || "").length,
        hasDev: /[\u0900-\u097F]/.test(String(data.page_content || "")),
        hasQ: String(data.page_content || "").includes("????"),
        file: data.file,
      }
    : null;
}

const facultyRes = await fetch(
  `https://hau.ac.in/college/faculty/${LEGACY_COLLEGE_ID}/teaching_staff`,
);
const faculty = await facultyRes.json();

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data: row } = await supabase
  .from("ccshau_pages")
  .select("id, slug, page_type, layout_template, parent_id, college_root_id, content_en, title_en")
  .eq("slug", "campus-school")
  .maybeSingle();

const report = {
  menuLabels,
  quickLinksUnique: [...new Map(quickLinks.map((q) => [q.path, q])).values()],
  uniqueSlugs,
  pages,
  facultyCount: Array.isArray(faculty) ? faculty.length : 0,
  facultySample: Array.isArray(faculty)
    ? faculty.slice(0, 3).map((f) => ({
        name: `${f.first_name || ""} ${f.last_name || ""}`.trim(),
        designation: f.designation,
      }))
    : faculty,
  supabaseRow: row,
  homeAboutSnippet: (() => {
    const m = homeHtml.match(/WELCOME TO CAMPUS SCHOOL[\s\S]{0,500}/i);
    return m ? m[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400) : null;
  })(),
};

writeFileSync(
  join(__dirname, "reports", "campus-school-probe.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
