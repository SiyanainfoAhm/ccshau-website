#!/usr/bin/env node
/**
 * Audit / delete unused draft college: basic-sciences-humanities
 *
 * Usage:
 *   node scripts/ops/delete-basic-sciences-humanities-duplicate.mjs
 *   node scripts/ops/delete-basic-sciences-humanities-duplicate.mjs --delete
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DELETE = process.argv.includes("--delete");
const SLUG = "basic-sciences-humanities";
const KEEP_SLUG = "college-basic-sciences-humanities";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: draft } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, status, page_type, parent_id")
  .eq("slug", SLUG)
  .maybeSingle();
const { data: keep } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, status")
  .eq("slug", KEEP_SLUG)
  .maybeSingle();

if (!draft) {
  console.log(`Already gone: ${SLUG}`);
  process.exit(0);
}

const { data: tree } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, status, parent_id")
  .eq("college_root_id", draft.id)
  .order("slug");

const pageIds = (tree ?? []).map((p) => p.id);

const { data: menuHits } = await sb.from("ccshau_menu_items").select("id, label_en").in("page_id", pageIds);
const { data: menuHref } = await sb.from("ccshau_menu_items").select("id, href").ilike("href", `%${SLUG}%`);
const { count: activeStaff } = await sb
  .from("ccshau_page_staff")
  .select("id", { count: "exact", head: true })
  .in("page_id", pageIds)
  .eq("is_active", true);
const { count: allStaff } = await sb
  .from("ccshau_page_staff")
  .select("id", { count: "exact", head: true })
  .in("page_id", pageIds);
const { count: sidebars } = await sb
  .from("ccshau_page_sidebar_items")
  .select("id", { count: "exact", head: true })
  .in("page_id", pageIds);

const { data: liveDepts } = await sb
  .from("ccshau_pages")
  .select("slug")
  .eq("college_root_id", keep.id)
  .eq("layout_template", "office_portal")
  .order("slug");

console.log("=== Verdict ===");
console.log({
  draft: `${draft.title_en} (${draft.slug}) [${draft.status}]`,
  live: keep ? `${keep.title_en} (${keep.slug}) [${keep.status}]` : null,
  tree_pages: tree?.length ?? 0,
  menu_page_refs: menuHits?.length ?? 0,
  menu_href_refs: menuHref?.length ?? 0,
  active_staff: activeStaff ?? 0,
  inactive_staff: (allStaff ?? 0) - (activeStaff ?? 0),
  sidebar_items: sidebars ?? 0,
  live_dept_slugs: (liveDepts ?? []).map((d) => d.slug),
  useful: false,
  reason: "Duplicate empty shell of College of Basic Sciences & Humanities; already draft/unpublished from nav; no active staff; no menu refs.",
});

console.log("\nTree:");
for (const p of tree ?? []) console.log(`  ${p.status} ${p.slug} — ${p.title_en}`);

if (!DELETE) {
  console.log("\nDry-run. Pass --delete to remove.");
  process.exit(0);
}

if (!keep) throw new Error("Live college missing — abort");
if (draft.status === "published") throw new Error("Root is published — abort");
if ((menuHits?.length ?? 0) > 0 || (menuHref?.length ?? 0) > 0) throw new Error("Menu references exist — abort");
if ((activeStaff ?? 0) > 0) throw new Error("Active staff exist — abort");

async function del(table, column, ids, label = column) {
  if (!ids.length) return;
  const { error, count } = await sb.from(table).delete({ count: "exact" }).in(column, ids);
  if (error) {
    // table/column may not exist in this schema
    if (/Could not find|does not exist|schema cache/i.test(error.message)) {
      console.log(`  skip ${table}.${label}: ${error.message}`);
      return;
    }
    throw new Error(`${table}.${label}: ${error.message}`);
  }
  console.log(`  deleted ${count ?? "?"} from ${table}.${label}`);
}

console.log("\n=== Deleting ===");
await del("ccshau_page_staff", "page_id", pageIds);
await del("ccshau_page_documents", "page_id", pageIds);
await del("ccshau_page_sidebar_items", "page_id", pageIds);
await del("ccshau_page_sidebar_items", "linked_page_id", pageIds, "linked_page_id");
await del("ccshau_events", "page_id", pageIds);

// Delete child pages first (any with parent in tree except root), deepest first
const byId = new Map((tree ?? []).map((p) => [p.id, p]));
const children = (tree ?? []).filter((p) => p.id !== draft.id);

function depth(p) {
  let d = 0;
  let cur = p;
  while (cur?.parent_id && byId.has(cur.parent_id)) {
    d++;
    cur = byId.get(cur.parent_id);
  }
  return d;
}
children.sort((a, b) => depth(b) - depth(a));

for (const p of children) {
  const { error } = await sb.from("ccshau_pages").delete().eq("id", p.id);
  if (error) throw new Error(`page ${p.slug}: ${error.message}`);
  console.log(`  deleted page ${p.slug}`);
}

{
  const { error } = await sb.from("ccshau_pages").delete().eq("id", draft.id);
  if (error) throw new Error(`root: ${error.message}`);
  console.log(`  deleted root ${SLUG}`);
}

const { data: still } = await sb.from("ccshau_pages").select("id").eq("slug", SLUG).maybeSingle();
const { count: adminCount } = await sb
  .from("ccshau_pages")
  .select("id", { count: "exact", head: true })
  .eq("page_type", "college")
  .or("title_en.ilike.%basic sciences%,title_en.ilike.%Basic Sciences%");

console.log(still ? "ERROR: still exists" : "OK: removed from system");
console.log(`Remaining Basic Sciences college pages: ${adminCount ?? "?"}`);
