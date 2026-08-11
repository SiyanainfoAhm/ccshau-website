/**
 * Finalize ICCCS EECM HOD Dr. Monika:
 * - ensure HOD sort_order = 1
 * - set qualification from legacy user 222 (Ph.D)
 * - do NOT copy another Monika's profile
 *
 * Usage: node fix-icccs-monika-hod-finalize.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
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

const PAGE_ID = "7cd0e69b-ed95-461e-8da1-8c58857b75a7";
const HOD_ID = "76cc7695-43b2-4538-9b84-40c520161205";

const { data: staff } = await sb
  .from("ccshau_page_staff")
  .select(
    "id, name_en, member_type, sort_order, specialization_en, detail_content_en, qualification_en, is_active",
  )
  .eq("page_id", PAGE_ID)
  .eq("is_active", true)
  .order("sort_order");

console.log("Before:", staff);

const hod = (staff || []).find((s) => s.id === HOD_ID);
if (!hod) throw new Error("HOD missing");

const patch = {
  member_type: "hod",
  sort_order: 1,
  // From legacy users.id=222 — only field present
  qualification_en: hod.qualification_en || "Ph.D",
  // Clear any wrong cross-person profile
  specialization_en: null,
  detail_content_en: null,
};

const summary = { mode: CONFIRM ? "apply" : "dry-run", patch, before: hod };

if (!CONFIRM) {
  console.log("Dry-run", summary);
} else {
  const { error } = await sb.from("ccshau_page_staff").update(patch).eq("id", HOD_ID);
  if (error) throw new Error(error.message);

  const others = (staff || []).filter((s) => s.id !== HOD_ID);
  let next = 2;
  for (const row of others) {
    const { error: e2 } = await sb
      .from("ccshau_page_staff")
      .update({
        sort_order: next++,
        member_type: row.member_type === "hod" ? "faculty" : row.member_type,
      })
      .eq("id", row.id);
    if (e2) throw new Error(e2.message);
  }

  const { data: afterList } = await sb
    .from("ccshau_page_staff")
    .select("sort_order, name_en, member_type, specialization_en, qualification_en, detail_content_en")
    .eq("page_id", PAGE_ID)
    .eq("is_active", true)
    .order("sort_order");
  summary.afterList = afterList;
  console.log("After:", afterList);
}

mkdirSync(join(__dirname, "reports"), { recursive: true });
writeFileSync(
  join(__dirname, "reports", "fix-icccs-monika-hod-finalize-latest.json"),
  JSON.stringify(summary, null, 2),
);
