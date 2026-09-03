#!/usr/bin/env node
/**
 * Set Hindi titles (title_hi) for college department menu pages.
 *
 * Usage:
 *   node scripts/ops/apply-college-department-menu-hindi.mjs --college=college-of-agriculture-hisar
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const collegeSlug =
  process.argv.find((a) => a.startsWith("--college="))?.split("=")[1] ??
  "college-of-agriculture-hisar";

/** slug → title_hi for Hisar agriculture college departments */
const HISAR_DEPARTMENT_TITLES_HI = {
  "hisar-agricultural-economics": "कृषि अर्थशास्त्र",
  "hisar-agricultural-extension-education": "कृषि विस्तार शिक्षा",
  "hisar-agricultural-meteorology": "कृषि मौसम विज्ञान",
  "hisar-agronomy": "कृषि विज्ञान",
  "hisar-bajra-section": "बाजरा अनुभाग",
  "hisar-business-management": "व्यवसाय प्रबंधन",
  "hisar-cotton-section": "कपास अनुभाग",
  "hisar-entomology": "कीट विज्ञान",
  "hisar-forages-section": "चारा अनुभाग",
  "hisar-forestry": "वानिकी",
  "hisar-genetics-and-plant-breeding": "आनुवंशिकी और पादप प्रजनन",
  "hisar-horticulture": "उद्यान विज्ञान",
  "hisar-medicinal-aromatic-and-potential-crops-section":
    "औषधीय, सुगंधित और संभावित फसल अनुभाग",
  "hisar-nematology": "सूत्रकृमि विज्ञान",
  "hisar-oil-seeds-section": "तिलहन अनुभाग",
  "hisar-plant-pathology": "पादप रोग विज्ञान",
  "hisar-pulses-section": "दलहन अनुभाग",
  "hisar-seed-science-technology": "बीज विज्ञान एवं प्रौद्योगिकी",
  "hisar-soil-science": "मृदा विज्ञान",
  "hisar-teaching-section": "शिक्षण अनुभाग",
  "hisar-vegetable-science": "सब्जी विज्ञान",
  "hisar-wheat-and-barley-section": "गेहूँ एवं जौ अनुभाग",
};

const SECTION_TITLES_HI = {
  department: "विभाग",
  departments: "विभाग",
  gallery: "गैलरी",
  contact: "संपर्क करें",
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const { data: college } = await supabase
    .from("ccshau_pages")
    .select("id, title_en")
    .eq("slug", collegeSlug)
    .eq("page_type", "college")
    .maybeSingle();
  if (!college) throw new Error(`College not found: ${collegeSlug}`);

  const titleMap =
    collegeSlug === "college-of-agriculture-hisar" ? HISAR_DEPARTMENT_TITLES_HI : {};

  let updated = 0;

  for (const [slug, titleHi] of Object.entries(titleMap)) {
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ title_hi: titleHi })
      .eq("college_root_id", college.id)
      .eq("slug", slug);
    if (error) throw new Error(`${slug}: ${error.message}`);
    console.log(`✓ ${slug} → ${titleHi}`);
    updated += 1;
  }

  const { data: sections } = await supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, title_hi")
    .eq("parent_id", college.id)
    .eq("status", "published");

  for (const section of sections ?? []) {
    const key = String(section.slug || section.title_en || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    const titleHi = SECTION_TITLES_HI[key] ?? SECTION_TITLES_HI[String(section.title_en).toLowerCase()];
    if (!titleHi || section.title_hi === titleHi) continue;
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ title_hi: titleHi })
      .eq("id", section.id);
    if (error) throw new Error(`section ${section.slug}: ${error.message}`);
    console.log(`✓ section ${section.slug} → ${titleHi}`);
    updated += 1;
  }

  console.log(`\nUpdated ${updated} page title(s) for ${college.title_en}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
