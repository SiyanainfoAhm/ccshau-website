#!/usr/bin/env node
/**
 * Fix mojibake Hindi on /pages/l (Bee Keeping / मधुमक्खी पालन)
 * from legacy https://hau.ac.in/page/l — keeps Azure media hrefs.
 *
 *   node scripts/legacy-import/fix-beekeping-labels.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const TITLE = "मधुमक्खी पालन";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const BY_PDF = {
  "96KHfAXpm2w5OQqvHNHJZRQYlDszEqJF6fVXlkZn.pdf": "1. मधुमक्खी पालन का महत्व एवं लाभ",
  "0H0v8lixwE9A6VrMLlZQAJyXT8ZNVBAwUQgCeLCX.pdf": "7. मधुमक्खियों का विभिन्न ऋतुओं में प्रबन्धन",
  "SU1VWIcEGMxSJZJDf9t1h3pAU7WN0o5BfIoip5ja.pdf": "13. मधुमक्खी वंश के अन्य उत्पाद, उपयोगिता एवं औषधीय गुण",
  "uukOCx6fe7eOAQfcdSiu9A7pYguyngwztREO9Zfm.pdf": "2. मधुमक्खियों की प्रमुख प्रजातियां",
  "UTEOPzVXwVr3qwFKkJMkOIYU5Yh0zCbXiknNuVe5.pdf": "8. मधुमक्खी पालन की विभिन्न प्रक्रियाएं",
  "xY91AMLPvk0UJytjKwyskU1A083dHw7f1urGiYRC.pdf": "14. मधुमक्खी परागण का कृषि एवं बागवानी फसलों में महत्त्व",
  "v9UrxL5BRos2qWdHMnIECbDI1v5jO1gcsudkwsel.pdf": "3. पाश्चात्य मधुमक्खी का जीवन चक्र एवं पारिवारिक संगठन",
  "AjvynIiaAKKNKwJXXNImXtLT60cy4NTO6Lxgn61u.pdf":
    "9. मधुमक्खी वंशों में कृत्रिम भोजन की आवश्यकता कब और क्यों",
  "RJR4jPy18Qr11ooICkpEFb7w69IWiUlxQ7cwJjAV.pdf": "15 मधुमक्खियों का प्रमुख शत्रु एवं रोगों से बचाव",
  "iH7EG6y8fe9Y46L9nHMNcASXi0kfmHKy9PgwDO13.pdf": "4. मधुमक्खी पालन की शुरूआत कैसे करें",
  "okCrDVG2IpPWrgHGZl3KNrEEmxSJDyddwW3xpHSU.pdf": "10 मधुमक्खी पालन के लिए उपयोगी पौधे व फसलें",
  "FxHw0VkL9g1px08LwGMmdRj3JvzJJL79B8eXWTA6.pdf": "16. मधुमक्खी वंशों में रानी प्रजनन की जानकारी",
  "LMv4LyvNyJPm97Yw0oR1OIUEnsurEdUPXj6VQy6A.pdf": "5. मधुमक्खी पालन के लिए आवश्यक सामग्री",
  "PszRJBumXqSRKxUOqemBgiFJ7hpXFDl2DcEidYXc.pdf":
    "11. मधुमक्खी परिवारों में वकछूट एवं घरछूट की समस्या तथा नियंत्रण",
  "TwIaDpbnwXZcCVh7SQQz0rrpRgejWfhB5NPTRZul.pdf": "17. मधुमक्खी पालन प्रशिक्षण",
  "ImViXvTqQTcH6POwbtD1dLwEPArsuKpzDXffLfGo.pdf": "6. मधुमक्खी वंशों का निरीक्षण-क्यों और कैसे",
  "nuGq1FhmCdulmT9MItYazXzjixkH7yaqCPO0Ak6N.pdf":
    "12. शहद औषधीय गुण, उपयोग, निष्कासन, शोधन एवं भण्डारण",
};

const BY_YOUTUBE = {
  ioYVRXMEAe0: "मधुमक्खी पालन व्यवसाय के लाभ",
  mhaJkrVs6BA: "शहद के बारे में महत्वपूर्ण जानकारी",
};

function fixContent(html) {
  let out = html.replace(
    /(<span style="font-size:30px;color:rgb\(226, 80, 65\)">)([^<]*)(<\/span>)/,
    `$1${TITLE}$3`,
  );

  out = out.replace(
    /(<a\b[^>]*href="([^"]+)"[^>]*>)([\s\S]*?)(<\/a>)/gi,
    (full, open, href, inner, close) => {
      const decoded = href.replace(/&amp;/g, "&");
      const yt = decoded.match(/[?&]v=([\w-]+)/) || decoded.match(/youtu\.be\/([\w-]+)/);
      if (yt && BY_YOUTUBE[yt[1]]) {
        const label = BY_YOUTUBE[yt[1]];
        if (/<span[\s\S]*<\/span>/i.test(inner)) {
          return `${open}<span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">${label}</span>${close}`;
        }
        return `${open}${label}${close}`;
      }

      const file = decoded.split("/").pop()?.split("?")[0] || "";
      const label = BY_PDF[file];
      if (!label) return full;
      if (!/\?/.test(inner) && !inner.replace(/<[^>]+>/g, "").trim()) return full;
      if (/<span[\s\S]*<\/span>/i.test(inner)) {
        return `${open}<span style="color:rgb(44, 130, 201)"><span style="font-size:18px;font-family:&quot;Times New Roman&quot;, Times, serif">${label}</span></span>${close}`;
      }
      return `${open}${label}${close}`;
    },
  );

  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
  const { createClient } = requireFromWeb("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("ccshau_pages")
    .select("id, title_en, excerpt_en, content_en")
    .eq("slug", "l")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Page slug=l not found");

  const content = fixContent(data.content_en);
  const remainingQ = (content.match(/\?{5,}/g) || []).length;
  console.log({
    mode: APPLY ? "APPLY" : "dry-run",
    beforeQ: (data.content_en.match(/\?{5,}/g) || []).length,
    afterQ: remainingQ,
  });

  mkdirSync(join(__dirname, "reports"), { recursive: true });
  writeFileSync(join(__dirname, "reports/beekeping-fixed.html"), content, "utf8");

  if (!APPLY) {
    console.log("Pass --apply to update Supabase.");
    return;
  }

  const { error: updErr } = await supabase
    .from("ccshau_pages")
    .update({
      title_en: "Bee Keeping",
      title_hi: TITLE,
      excerpt_en: `${TITLE} — CCS HAU.`,
      excerpt_hi: `${TITLE} — सीसीएस एचएयू.`,
      content_en: content,
      content_hi: content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  if (updErr) throw updErr;
  console.log("Updated ccshau_pages.slug=l");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
