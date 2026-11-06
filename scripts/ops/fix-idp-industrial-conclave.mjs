#!/usr/bin/env node
/**
 * Restore the IDP Industrial Conclave sidebar to the live hau.ac.in text.
 * The PDF stays on hau.ac.in because it is not in Azure and upload is forbidden.
 *
 *   node scripts/ops/fix-idp-industrial-conclave.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const SIDEBAR_ID = "b784c487-af72-4a01-aea4-53e8561940f2";
const FILE = "af49CYIBL5NeRiZX49AIJdWJSDoEgiCw4lvG5znw.pdf";
const FILE_URL = `https://hau.ac.in/storage/app/uploads/${FILE}`;
const CONTENT_EN = `<p>Industrial Conclave</p><p><a class="fr-file" href="${FILE_URL}" rel="noopener noreferrer" target="_blank">Glimpses of Industry Conclave 2020-converted</a></p>`;
const CONTENT_HI = `<p>औद्योगिक कॉन्क्लेव</p><p><a class="fr-file" href="${FILE_URL}" rel="noopener noreferrer" target="_blank">इंडस्ट्री कॉन्क्लेव 2020 की झलकियाँ-परिवर्तित</a></p>`;

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

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,content_en,content_hi")
    .eq("id", SIDEBAR_ID)
    .single();
  if (error) throw error;

  console.log("label:", data.label_en);
  console.log("current en:", String(data.content_en || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  const hiText = String(data.content_hi || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log("current hi:", hiText.slice(0, 180));
  console.log("mode:", APPLY ? "APPLY" : "dry-run");
  if (!APPLY) return;

  const patch = { content_en: CONTENT_EN, content_hi: CONTENT_HI };

  const { error: updateError } = await supabase
    .from("ccshau_page_sidebar_items")
    .update(patch)
    .eq("id", SIDEBAR_ID);
  if (updateError) throw updateError;
  console.log("updated fields:", Object.keys(patch).join(", "));
}

main().catch((error) => {
  const status = error && typeof error === "object" ? error.statusCode || error.code : "";
  console.error(status || "failed", error instanceof Error ? error.message : error);
  process.exit(1);
});
