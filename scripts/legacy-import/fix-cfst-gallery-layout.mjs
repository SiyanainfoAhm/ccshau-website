/**
 * Set CFST gallery/department section layout_config so college top menu stays on.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
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
    ) {
      v = v.slice(1, -1);
    }
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
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const GALLERY_LAYOUT = {
  hero: false,
  headOfficer: false,
  contacts: false,
  staff: false,
  gallery: true,
  newsTicker: false,
  studentCorner: false,
  mainContent: false,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

const DEPT_SECTION_LAYOUT = {
  hero: false,
  headOfficer: false,
  contacts: false,
  staff: false,
  gallery: false,
  newsTicker: false,
  studentCorner: false,
  mainContent: true,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

for (const slug of ["cfst-gallery", "cfst-department", "coaet-gallery", "hisar-gallery"]) {
  const { data, error } = await sb
    .from("ccshau_pages")
    .select("slug, layout_template, layout_config")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  console.log(slug, data);
}

if (!CONFIRM) {
  console.log("Dry-run only. Pass --confirm to apply CFST layout_config.");
  process.exit(0);
}

const updates = [
  { slug: "cfst-gallery", layout_config: GALLERY_LAYOUT },
  { slug: "cfst-department", layout_config: DEPT_SECTION_LAYOUT },
];

for (const u of updates) {
  const { error } = await sb
    .from("ccshau_pages")
    .update({ layout_config: u.layout_config })
    .eq("slug", u.slug);
  if (error) throw new Error(`${u.slug}: ${error.message}`);
  console.log("updated", u.slug);
}
