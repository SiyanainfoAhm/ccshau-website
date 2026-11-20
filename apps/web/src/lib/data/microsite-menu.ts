import { Tables } from "@/lib/database/names";
import {
  defaultMicrositeMenu,
  parseMicrositeMenu,
  toEditorItems,
  type CollegeMenuPageRef,
  type MicrositeMenuEditorItem,
} from "@/lib/pages/microsite-menu";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MicrositeMenuAvailablePage {
  id: string;
  titleEn: string;
  titleHi: string;
  slug: string;
}

export interface MicrositeMenuEditorData {
  collegeSlug: string;
  usingSavedMenu: boolean;
  items: MicrositeMenuEditorItem[];
  availablePages: MicrositeMenuAvailablePage[];
}

export async function loadMicrositeMenuEditor(
  collegePageId: string,
): Promise<MicrositeMenuEditorData | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: college } = await admin
    .from(Tables.pages)
    .select("id, slug, page_type, layout_config")
    .eq("id", collegePageId)
    .neq("status", "deleted")
    .maybeSingle();

  if (!college || college.page_type !== "college") return null;

  const { data: children } = await admin
    .from(Tables.pages)
    .select("id, slug, title_en, title_hi, sort_order, status")
    .eq("parent_id", collegePageId)
    .neq("status", "deleted")
    .order("sort_order")
    .order("title_en");

  const pages = (children ?? []) as CollegeMenuPageRef[];
  const saved = parseMicrositeMenu(college.layout_config);
  const menu = saved ?? defaultMicrositeMenu(college.slug, pages);
  const usedIds = new Set(
    menu.items.flatMap((item) => (item.kind === "page" ? [item.pageId] : [])),
  );

  return {
    collegeSlug: college.slug,
    usingSavedMenu: Boolean(saved),
    items: toEditorItems(menu, pages),
    availablePages: pages
      .filter((page) => page.status === "published" && !usedIds.has(page.id))
      .map((page) => ({
        id: page.id,
        titleEn: page.title_en,
        titleHi: page.title_hi ?? "",
        slug: page.slug,
      })),
  };
}
