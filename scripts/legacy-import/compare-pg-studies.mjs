/**
 * Compare legacy PG Studies vs local DB content.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
loadEnv(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function decode(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const liveHtml = await (
  await fetch("https://hau.ac.in/college/pg-studies", {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
).text();

const live = {
  dean: decode(liveHtml.match(/Dr\.\s*Atul\s*Dhingra/i)?.[0] || ""),
  hasDean: /Atul\s*Dhingra/i.test(liveHtml),
  office: decode(liveHtml.match(/Office\s*:\s*([^<\n]+)/i)?.[1] || ""),
  email: decode(liveHtml.match(/dpgs@hau\.ac\.in/i)?.[0] || ""),
  mailing: /Postgraduate Studies CCS Hayana Agricultural University/i.test(liveHtml),
  responsibilities: [
    /upgrade the course work/i.test(liveHtml),
    /monitor the postgraduate research/i.test(liveHtml),
    /conduct the activities such as admissions/i.test(liveHtml),
  ],
  bodySnippet: decode(
    liveHtml.match(
      /Dean,\s*Postgraduate Studies office basically[\s\S]{0,400}/i,
    )?.[0] || "",
  ).slice(0, 280),
  news: /Date Sheet of PGS Courses/i.test(liveHtml),
  studentCornerEmpty: /No Information available/i.test(liveHtml),
  img: liveHtml.match(
    /src="(https:\/\/hau\.ac\.in\/storage\/[^"]+Dhingra[^"]*|https:\/\/hau\.ac\.in\/storage\/[^"]+college-user\/[^"]+)"/i,
  )?.[1],
  anyDeanImg: [
    ...liveHtml.matchAll(
      /src="(https:\/\/hau\.ac\.in\/storage\/app\/uploads\/[^"]+\.(?:jpe?g|png|webp))"/gi,
    ),
  ]
    .map((m) => m[1])
    .slice(0, 8),
};

const { data: page } = await sb
  .from("ccshau_pages")
  .select(
    "id,slug,title_en,status,page_type,layout_template,content_en,excerpt_en,head_name_en,head_role_en,head_image_path,featured_image_path",
  )
  .eq("slug", "pg-studies")
  .maybeSingle();

const { data: contacts } = await sb
  .from("ccshau_page_contact_lines")
  .select("label_en,value_en,sort_order")
  .eq("page_id", page?.id)
  .order("sort_order");

const { data: children } = await sb
  .from("ccshau_pages")
  .select("slug,title_en,status,sort_order")
  .eq("parent_id", page?.id)
  .order("sort_order");

const content = page?.content_en || "";
const local = {
  page: {
    id: page?.id,
    title: page?.title_en,
    status: page?.status,
    page_type: page?.page_type,
    layout: page?.layout_template,
    head_name_en: page?.head_name_en,
    head_role_en: page?.head_role_en,
    head_image_path: page?.head_image_path,
  },
  contacts,
  children,
  contentHasDean: /Atul\s*Dhingra/i.test(content),
  contentHasResponsibilities: /upgrade the course work/i.test(content),
  contentHasEmail: /dpgs@hau\.ac\.in/i.test(content),
  contentLen: content.length,
  contentPreview: decode(content).slice(0, 400),
};

const mismatches = [];
if (!local.contentHasDean && local.page.head_name_en !== "Dr. Atul Dhingra") {
  mismatches.push("Dean name missing/mismatched (expect Dr. Atul Dhingra)");
}
if (!/1662-255326/.test(JSON.stringify(contacts || [])) && !/1662-255326/.test(content)) {
  mismatches.push("Office phone 1662-255326 missing");
}
if (!/dpgs@hau\.ac\.in/i.test(JSON.stringify(contacts || [])) && !local.contentHasEmail) {
  mismatches.push("Email dpgs@hau.ac.in missing");
}
if (!local.contentHasResponsibilities) {
  mismatches.push("About responsibilities text missing from content_en");
}
if (!/Hayana|Haryana Agricultural University Hisar - 125 004/i.test(content) &&
    !/125\s*004/i.test(JSON.stringify(contacts || []))) {
  mismatches.push("Mailing address missing/mismatched");
}

mkdirSync(REPORT, { recursive: true });
const out = { live, local, mismatches };
writeFileSync(join(REPORT, "compare-pg-studies.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
