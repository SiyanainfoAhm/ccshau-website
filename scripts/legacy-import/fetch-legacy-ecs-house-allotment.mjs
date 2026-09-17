/**
 * Fetch legacy ECS House Allotment department page and summarize.
 * Legacy: https://hau.ac.in/department/NTM=/MTAz  (college 53 / dept 103)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPORT = join(dirname(fileURLToPath(import.meta.url)), "reports");
mkdirSync(REPORT, { recursive: true });

const PAGE_URL = "https://hau.ac.in/department/NTM=/MTAz";
const APIS = [
  "https://hau.ac.in/page-data/house-allotment/53",
  "https://hau.ac.in/page-data/ecs-house-allotment/53",
  "https://hau.ac.in/page-data/house-allotment/103",
  "https://hau.ac.in/department-data/53/103",
];

async function tryFetch(url) {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/json,*/*",
        Referer: "https://hau.ac.in/college/eo-cum-se",
      },
      redirect: "follow",
    });
    const text = await r.text();
    return { url, status: r.status, len: text.length, text };
  } catch (err) {
    return { url, status: 0, len: 0, text: "", error: err.message };
  }
}

function summarizeHtml(html) {
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map(
    (m) => ({
      href: m[1],
      label: m[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    }),
  );
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    textPreview: text.slice(0, 800),
    fileLinks: links.filter((l) =>
      /\.(pdf|doc|docx|xls|xlsx|rtf)(\?|$)/i.test(l.href) ||
      /storage\/app\/uploads/i.test(l.href),
    ),
    allLabels: links.map((l) => l.label).filter(Boolean).slice(0, 40),
  };
}

const page = await tryFetch(PAGE_URL);
writeFileSync(join(REPORT, "legacy-ecs-house-allotment-page.html"), page.text || "");
console.log("page", { status: page.status, len: page.len, error: page.error });
if (page.text) {
  console.log(JSON.stringify(summarizeHtml(page.text), null, 2));
}

// Pull JS APIs used by college department pages
const homeJs = await tryFetch("https://hau.ac.in/public/js/home.js");
const apiHints = [...(homeJs.text || "").matchAll(/SITE_URL\+['"]([^'"]+)/g)].map(
  (m) => m[1],
);
console.log("apiHints", [...new Set(apiHints)]);

for (const api of APIS) {
  const res = await tryFetch(api);
  console.log("api", { url: api, status: res.status, len: res.len });
  if (res.status === 200 && res.len > 20 && !/^\s*null\s*$/i.test(res.text)) {
    writeFileSync(
      join(REPORT, `legacy-ecs-api-${api.split("/").slice(-2).join("-")}.json`),
      res.text,
    );
  }
}

// Also try common department content endpoints with ids 53 / 103
const more = [
  "https://hau.ac.in/getDepartmentContent/53/103",
  "https://hau.ac.in/college/department-detail/53/103",
  "https://hau.ac.in/department-detail/53/103",
  "https://hau.ac.in/page-data/house-allotment/15",
];
for (const api of more) {
  const res = await tryFetch(api);
  console.log("more", { url: api, status: res.status, len: res.len, head: res.text.slice(0, 120) });
}
