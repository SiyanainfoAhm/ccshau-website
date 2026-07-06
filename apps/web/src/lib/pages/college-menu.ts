import { Tables } from "@/lib/database/names";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Add a published college root page to Academics → Colleges mega-menu when missing. */
export async function syncPublishedCollegeToMenu(
  admin: SupabaseClient,
  collegePageId: string,
): Promise<void> {
  const { data: page } = await admin
    .from(Tables.pages)
    .select("id, title_en, title_hi, sort_order, page_type, status, parent_id")
    .eq("id", collegePageId)
    .maybeSingle();

  if (!page || page.page_type !== "college" || page.status !== "published") return;

  const { data: parent } = page.parent_id
    ? await admin.from(Tables.pages).select("slug").eq("id", page.parent_id).maybeSingle()
    : { data: null };

  if (parent?.slug !== "colleges") return;

  const { data: existing } = await admin
    .from(Tables.menuItems)
    .select("id")
    .eq("page_id", collegePageId)
    .maybeSingle();

  if (existing) return;

  const { data: headerMenu } = await admin
    .from(Tables.menus)
    .select("id")
    .eq("location", "header")
    .maybeSingle();

  if (!headerMenu) return;

  const { data: academicsItem } = await admin
    .from(Tables.menuItems)
    .select("id")
    .eq("menu_id", headerMenu.id)
    .eq("label_en", "Academics")
    .is("parent_id", null)
    .maybeSingle();

  if (!academicsItem) return;

  const { data: collegesItem } = await admin
    .from(Tables.menuItems)
    .select("id")
    .eq("menu_id", headerMenu.id)
    .eq("parent_id", academicsItem.id)
    .eq("label_en", "Colleges")
    .maybeSingle();

  if (!collegesItem) return;

  await admin.from(Tables.menuItems).insert({
    menu_id: headerMenu.id,
    parent_id: collegesItem.id,
    label_en: page.title_en,
    label_hi: page.title_hi,
    page_id: collegePageId,
    sort_order: page.sort_order ?? 0,
  });
}

/** Remove mega-menu entries linked to a college page. */
export async function removeCollegeFromMenu(
  admin: SupabaseClient,
  collegePageId: string,
): Promise<void> {
  await admin.from(Tables.menuItems).delete().eq("page_id", collegePageId);
}
