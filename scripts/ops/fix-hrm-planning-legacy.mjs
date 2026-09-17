#!/usr/bin/env node
/**
 * Align Planning & Evaluation Section with legacy:
 *   https://hau.ac.in/department/MjA=/NzE=
 *
 * - Sidebar: only Head of Department + Faculty (deactivate template tabs)
 * - HOD: legacy has empty name, designation OSD (Finance), blank photo,
 *   mailing address + phone/email
 * - Keep page about/objectives body under HOD (matches legacy)
 *
 *   node scripts/ops/fix-hrm-planning-legacy.mjs
 *   node scripts/ops/fix-hrm-planning-legacy.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const PAGE_ID = "dc855075-59a8-4db2-97e7-a379d6b0cef4";
const HOD_STAFF = "d07af487-3da8-4ec9-b93c-2518b516fb7e";
const HOD_PERSON = "c88342a3-4309-4907-a6be-0d398a60a90b";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("1) Sidebar → only Head of Department + Faculty");
  console.log("2) HOD → clear Staff 231 label; keep OSD (Finance) + contacts");
  console.log("3) Clear broken blank photo (legacy also has empty placeholder PNG)");
  console.log("4) Add mailing address contact lines like legacy");

  const { data: sides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("id,label_en,is_active")
    .eq("page_id", PAGE_ID)
    .order("sort_order");
  for (const s of sides ?? []) {
    const keep = /^(head of department|faculty)$/i.test(s.label_en.trim());
    console.log(`  sidebar ${s.label_en}: ${keep ? "KEEP" : "off"} (now ${s.is_active ? "ON" : "off"})`);
  }

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  // 1) sidebar
  for (const s of sides ?? []) {
    const keep = /^(head of department|faculty)$/i.test(s.label_en.trim());
    const { error } = await sb
      .from("ccshau_page_sidebar_items")
      .update({ is_active: keep, updated_at: now })
      .eq("id", s.id);
    if (error) throw error;
  }
  console.log("OK sidebar trimmed");

  // 2) HOD — legacy <h4> name is empty; visible title is "OSD (Finance)" only.
  // Store that as name and clear designation so our card doesn't duplicate the line.
  const personPatch = {
    name_en: "OSD (Finance)",
    name_hi: "ओ.एस.डी. (वित्त)",
    image_path: null, // blank 571B PNG looks like a white hole; use default silhouette
    email: "dhrmplanningcell@gmail.com",
    mobile: "9466381900",
    updated_at: now,
  };
  {
    const { error } = await sb.from("ccshau_faculty_people").update(personPatch).eq("id", HOD_PERSON);
    if (error) throw error;
    console.log("OK faculty_people HOD");
  }
  {
    const { error } = await sb
      .from("ccshau_page_staff")
      .update({
        name_en: "OSD (Finance)",
        name_hi: "ओ.एस.डी. (वित्त)",
        image_path: null,
        designation_en: "OSD (Finance)",
        designation_hi: "ओ.एस.डी. (वित्त)",
        email: "dhrmplanningcell@gmail.com",
        mobile: "9466381900",
        updated_at: now,
      })
      .eq("id", HOD_STAFF);
    if (error) throw error;
    console.log("OK page_staff HOD");
  }
  {
    const { error } = await sb
      .from("ccshau_faculty_assignments")
      .update({
        designation_en: "",
        designation_hi: "",
        member_type: "hod",
        is_active: true,
        updated_at: now,
      })
      .eq("page_id", PAGE_ID)
      .eq("source_staff_id", HOD_STAFF);
    if (error) throw error;
    console.log("OK assignment HOD");
  }

  // 3) contact lines (mailing + office phones as on legacy)
  await sb.from("ccshau_page_contact_lines").delete().eq("page_id", PAGE_ID);
  const { error: cErr } = await sb.from("ccshau_page_contact_lines").insert([
    {
      page_id: PAGE_ID,
      label_en: "Mailing Address",
      label_hi: "डाक पता",
      value_en:
        "Directorate of Human Resource Management, CCS Haryana Agricultural University-125004 (Haryana)",
      value_hi:
        "मानव संसाधन प्रबंधन निदेशालय, चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय-125004 (हरियाणा)",
      sort_order: 1,
      is_active: true,
    },
    {
      page_id: PAGE_ID,
      label_en: "Office",
      label_hi: "कार्यालय",
      value_en: "01662-284316, 255414",
      value_hi: "01662-284316, 255414",
      sort_order: 2,
      is_active: true,
    },
    {
      page_id: PAGE_ID,
      label_en: "Phone No",
      label_hi: "दूरभाष संख्या",
      value_en: "9466381900",
      value_hi: "9466381900",
      sort_order: 3,
      is_active: true,
    },
    {
      page_id: PAGE_ID,
      label_en: "Email Id",
      label_hi: "ई-मेल आईडी",
      value_en: "dhrmplanningcell@gmail.com",
      value_hi: "dhrmplanningcell@gmail.com",
      sort_order: 4,
      is_active: true,
    },
  ]);
  if (cErr) throw cErr;
  console.log("OK contact lines");

  const { data: page } = await sb.from("ccshau_pages").select("layout_config").eq("id", PAGE_ID).single();
  await sb
    .from("ccshau_pages")
    .update({
      layout_config: { ...(page?.layout_config ?? {}), contacts: true, leftSidebar: true, mainContent: true },
      updated_at: now,
    })
    .eq("id", PAGE_ID);
  console.log("OK layout contacts enabled");

  const { data: afterSides } = await sb
    .from("ccshau_page_sidebar_items")
    .select("label_en,is_active")
    .eq("page_id", PAGE_ID)
    .eq("is_active", true)
    .order("sort_order");
  console.log(
    "\nActive sidebars:",
    (afterSides ?? []).map((s) => s.label_en).join(", "),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
