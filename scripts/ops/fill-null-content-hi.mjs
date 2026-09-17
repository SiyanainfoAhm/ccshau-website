#!/usr/bin/env node
/**
 * Force-fill content_hi where content_en is present and content_hi is NULL.
 *
 *   node scripts/ops/fill-null-content-hi.mjs
 *   node scripts/ops/fill-null-content-hi.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasDevanagari, translateFacultyProfileHtml } from "./department-hindi-shared.mjs";
import { EXTENDED_SIDEBAR_LABELS_HI } from "./college-sidebar-labels-extended.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const EXACT = {
  ...EXTENDED_SIDEBAR_LABELS_HI,
  "Histoiric Alumini meet": "ऐतिहासिक पूर्व छात्र मिलन",
  "Historic Alumni meet": "ऐतिहासिक पूर्व छात्र मिलन",
  "Alumini Meet": "पूर्व छात्र मिलन",
  "CALL US: 01662-255241,255462": "हमें कॉल करें: 01662-255241, 255462",
  "Alaknanda Girls Hostel": "अलकनंदा बालिका छात्रावास",
  "Alaknanda Hostel, Bawal": "अलकनंदा छात्रावास, बावल",
  "Prakriti Boys Hostel": "प्रकृति बालक छात्रावास",
  "Bawal Hostel": "बावल छात्रावास",
  "New Girls Hostel, Bawal": "नई बालिका छात्रावास, बावल",
  "New Girls Hostel Bawal": "नई बालिका छात्रावास, बावल",
  "Campus Achievers": "कैंपस उपलब्धिकर्ता",
  "Video Gallery": "वीडियो गैलरी",
  "Click here to download Tubewell Discharge App": "ट्यूबवेल डिस्चार्ज ऐप डाउनलोड करने के लिए यहाँ क्लिक करें",
  "Dicharge Tubwell App": "ट्यूबवेल डिस्चार्ज ऐप",
  "Dean's Control Panel ( For Fee Portal )": "डीन कंट्रोल पैनल (शुल्क पोर्टल हेतु)",
  "Employee Corner": "कर्मचारी कोना",
  "Independence Day Celebration  Campus School": "स्वतंत्रता दिवस समारोह, कैंपस स्कूल",
  "Your browser does not support HTML5 video.": "आपका ब्राउज़र HTML5 वीडियो का समर्थन नहीं करता।",
  "Content coming soon.": "सामग्री शीघ्र उपलब्ध होगी।",
  "Content coming soon": "सामग्री शीघ्र उपलब्ध होगी",
  "PensionSeva by State Bank of India": "पेंशनसेवा — स्टेट बैंक ऑफ इंडिया",
  "Vice-Chancellor": "कुलपति",
  "Thrust Area:": "प्रमुख कार्य क्षेत्र:",
  "Thurst Area": "प्रमुख कार्य क्षेत्र",
  "Thrust Area": "प्रमुख कार्य क्षेत्र",
  "High quality seed production of new varieties.": "नई किस्मों का उच्च गुणवत्ता वाला बीज उत्पादन।",
  "Event Registration link": "कार्यक्रम पंजीकरण लिंक",
  "Chaulai ke Paushtic Laddoo": "चौलाई के पौष्टिक लड्डू",
  "Peanut Nutties": "मूंगफली नट्टीज़",
  Departments: "विभाग",
};

const PHRASES = Object.entries(EXACT).sort((a, b) => b[0].length - a[0].length);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function gtx(text) {
  const q = (text ?? "").trim();
  if (!q) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `q=${encodeURIComponent(q.slice(0, 4500))}`,
        },
      );
      if (!response.ok) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      const data = await response.json();
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      const hi = data[0]
        .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
        .join("")
        .trim();
      if (hi && hasDevanagari(hi)) return hi;
      await sleep(150 * (attempt + 1));
    } catch {
      await sleep(200 * (attempt + 1));
    }
  }
  return null;
}

function applyExactPhrases(html) {
  let out = html;
  for (const [en, hi] of PHRASES) {
    if (out.includes(en)) out = out.split(en).join(hi);
  }
  return out;
}

function rewriteHauStorage(html) {
  return html.replace(
    /https?:\/\/(?:www\.)?hau\.ac\.in\/storage\/app\/uploads\/([^"'?\s>#]+)/gi,
    "https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/$1",
  );
}

function extractPdfStub(html) {
  const m = html.match(
    /Legacy document <code>([^<]+)<\/code> — pending Phase 4 upload \(<code>([^<]+)<\/code>\)\./,
  );
  return m ? { file: m[1], path: m[2] } : null;
}

function isMojibakeHeavy(text) {
  const plain = (text ?? "").replace(/<[^>]+>/g, " ");
  const qMarks = (plain.match(/\?/g) ?? []).length;
  const letters = (plain.match(/[A-Za-z]/g) ?? []).length;
  return qMarks >= 8 && qMarks > letters;
}

async function translateForced(row) {
  let html = rewriteHauStorage(row.content_en ?? "");
  const titleEn = (row.title_en ?? "").trim();
  const titleHi =
    EXACT[titleEn] ??
    EXTENDED_SIDEBAR_LABELS_HI[titleEn] ??
    (await gtx(titleEn.replace(/\?+/g, " ").trim())) ??
    titleEn;

  // Plain short body
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!html.includes("<") || (html.match(/<[a-zA-Z]/g) ?? []).length <= 2) {
    const hi = EXACT[plain] ?? (await gtx(plain)) ?? titleHi;
    return hasDevanagari(hi) ? `<p>${hi}</p>` : `<p>${hi}</p>`;
  }

  // PDF stub
  const stub = extractPdfStub(html);
  if (stub) {
    return `<p><strong>${titleHi}</strong></p><p>दस्तावेज़ <code>${stub.file}</code> शीघ्र उपलब्ध कराया जाएगा (<code>${stub.path}</code>)।</p>`;
  }

  // Phrase pass + faculty dict
  html = translateFacultyProfileHtml(html) ?? html;
  html = applyExactPhrases(html);

  // Translate remaining short English text nodes
  const nodes = new Set();
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(html))) {
    const t = m[1].replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    if (t.length >= 3 && t.length <= 220 && /[A-Za-z]{3,}/.test(t) && !hasDevanagari(t) && !/^https?:/i.test(t)) {
      nodes.add(t);
    }
  }
  for (const en of [...nodes].sort((a, b) => b.length - a.length).slice(0, 30)) {
    const hi = EXACT[en] ?? (await gtx(en));
    if (hi) html = html.split(en).join(hi);
    await sleep(30);
  }

  if (hasDevanagari(html) || isMojibakeHeavy(row.content_en)) {
    // Mojibake pages: keep structure (already intended as Hindi) but ensure English scraps are HI
    return html;
  }

  // Image/video-only pages: prepend Hindi title, keep media
  if (/<img\b|<iframe\b|<video\b/i.test(html)) {
    return `<p><strong>${titleHi}</strong></p>${html}`;
  }

  // Last resort: Hindi title + translated plain summary
  const summary = EXACT[plain] ?? (await gtx(plain.slice(0, 800))) ?? titleHi;
  return `<p><strong>${titleHi}</strong></p><p>${summary}</p>`;
}

async function main() {
  console.log(`fill-null-content-hi | ${APPLY ? "APPLY" : "dry-run"}`);
  const { data, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, title_hi, content_en, content_hi")
    .not("content_en", "is", null)
    .neq("content_en", "")
    .is("content_hi", null)
    .order("slug");
  if (error) throw error;

  console.log(`Rows: ${data?.length ?? 0}`);
  let updated = 0;
  let failed = 0;

  for (const row of data ?? []) {
    const hi = await translateForced(row);
    if (!hi?.trim()) {
      failed++;
      console.log(`  FAIL ${row.slug}`);
      continue;
    }
    updated++;
    const preview = hi.replace(/\s+/g, " ").slice(0, 100);
    console.log(`  ${APPLY ? "SET" : "WOULD"} ${row.slug}: ${preview}`);
    if (!APPLY) continue;
    const { error: upErr } = await supabase.from("ccshau_pages").update({ content_hi: hi }).eq("id", row.id);
    if (upErr) throw new Error(`${row.slug}: ${upErr.message}`);
  }

  console.log(`\n${APPLY ? "updated" : "would update"}: ${updated}, failed: ${failed}`);
  if (!APPLY) console.log("Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
