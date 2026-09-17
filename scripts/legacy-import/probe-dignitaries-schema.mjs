/**
 * Probe ccshau_homepage_dignitaries columns on the configured Supabase DB.
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: sample, error: sampleErr } = await sb
  .from("ccshau_homepage_dignitaries")
  .select("*")
  .limit(1);
console.log("sample error:", sampleErr?.message ?? null);
console.log("sample keys:", sample?.[0] ? Object.keys(sample[0]) : []);

const { data: rpc, error: rpcErr } = await sb.rpc("exec_sql", {
  query: "select 1",
}).maybeSingle?.() ?? { data: null, error: { message: "no rpc" } };
console.log("rpc probe:", rpcErr?.message ?? rpc);

// Try selecting role columns explicitly
for (const cols of ["role_en,role_hi", "title_en,title_hi", "designation_en,designation_hi"]) {
  const { error } = await sb.from("ccshau_homepage_dignitaries").select(cols).limit(1);
  console.log("select", cols, "->", error?.message ?? "ok");
}
