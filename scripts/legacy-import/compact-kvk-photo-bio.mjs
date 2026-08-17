/**
 * Compact leftover spacer markup in KVK coordinator photo+bio tables.
 *
 * Usage:
 *   node compact-kvk-photo-bio.mjs --dry-run
 *   node compact-kvk-photo-bio.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRM = process.argv.includes("--confirm");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractCoordinatorPhone(tableHtml) {
  const split = tableHtml.match(
    /Phone:<\/strong>\s*(\d)<\/p>([\d][\d\s/(),A-Za-z-]*)/i,
  );
  if (split) return `${split[1]}${split[2]}`.replace(/\s+/g, " ").trim();
  const labeled = tableHtml.match(
    /(?:Phone|Contact\s*No\.?)\s*:?\s*(?:<\/strong>\s*)?(\d[\d\s/()-]*(?:\([Mm]\))?)/i,
  );
  return labeled?.[1] ? labeled[1].replace(/\s+/g, " ").trim() : null;
}

function rewriteCoordinatorTable(html) {
  const source = String(html || "");
  const tableMatch = source.match(/<table\b[\s\S]*?<\/table>/i);
  if (!tableMatch) return source;
  const table = tableMatch[0];
  const img = table.match(/<img\b[^>]*>/i)?.[0];
  if (!img) return source;

  const email =
    table.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;
  const phone = extractCoordinatorPhone(table);
  const tds = [...table.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
  const bioRaw = tds.find((td) => !/<img\b/i.test(td)) || "";

  let text = bioRaw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|span)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
  if (email) text = text.replaceAll(email, " ");
  text = text
    .replace(/\be-?mail\s*:/gi, " ")
    .replace(/\b(?:phone|contact\s*no\.?)\s*:/gi, " ");
  if (phone) text = text.replace(phone, " ");

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line) return false;
      if (/^e-?mail:?$/i.test(line) || /^phone:?$/i.test(line)) return false;
      if (/^\d[\d\s/()-]*(\([Mm]\))?$/.test(line)) return false;
      return true;
    });

  const bioHtml = [
    ...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
    email
      ? `<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>`
      : "",
    phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : "",
  ]
    .filter(Boolean)
    .join("");

  const nextTable = `<table><tbody><tr><td>${img}</td><td>${bioHtml}</td></tr></tbody></table>`;
  return source.replace(table, nextTable);
}

function compactPhotoBioHtml(html) {
  return rewriteCoordinatorTable(html);
}

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

async function main() {
  if (!DRY_RUN && !CONFIRM) {
    console.error("Pass --dry-run or --confirm");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from("ccshau_pages")
    .select("id, slug, content_en")
    .like("slug", "krishi-vigyan-kendra-%");
  if (error) throw new Error(error.message);

  const summary = { mode: CONFIRM ? "apply" : "dry-run", patched: [], skipped: [] };

  for (const row of data ?? []) {
    const next = compactPhotoBioHtml(row.content_en);
    if (next === (row.content_en || "")) {
      summary.skipped.push(row.slug);
      continue;
    }
    summary.patched.push({
      slug: row.slug,
      before: (row.content_en || "").length,
      after: next.length,
    });
    if (CONFIRM) {
      const { error: updateErr } = await supabase
        .from("ccshau_pages")
        .update({ content_en: next })
        .eq("id", row.id);
      if (updateErr) throw new Error(`${row.slug}: ${updateErr.message}`);
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "compact-kvk-photo-bio.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`${summary.mode}: patched ${summary.patched.length}, skipped ${summary.skipped.length}`);
  for (const item of summary.patched) {
    console.log(`  ${item.slug} ${item.before} → ${item.after}`);
  }
  console.log(`Report: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
