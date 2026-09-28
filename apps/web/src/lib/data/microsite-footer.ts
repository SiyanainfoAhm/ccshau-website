import "server-only";

import { Tables } from "@/lib/database/names";
import {
  footerFromContacts,
  parseMicrositeFooter,
  publicFooterFromSaved,
  type MicrositeContactLine,
  type MicrositeFooterInput,
  type MicrositeFooterLink,
  type PublicMicrositeFooter,
} from "@/lib/pages/microsite-footer";
import { compareBySortOrderThenTitle } from "@/lib/pages/college-nav";
import { readStoredLayoutConfig } from "@/lib/pages/layout-config";
import { getCollegeSubsectionPath } from "@/lib/pages/routes";
import { createAdminClient } from "@/lib/supabase/admin";

function missingFooterColumn(error: { message?: string } | null | undefined): boolean {
  return Boolean(error?.message && /microsite_footer/i.test(error.message));
}

export async function loadMicrositeFooterForAdmin(pageId: string): Promise<{
  footer: MicrositeFooterInput;
  contacts: MicrositeContactLine[];
  columnReady: boolean;
} | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const first = await admin
    .from(Tables.pages)
    .select("id, title_en, title_hi, page_type, microsite_footer")
    .eq("id", pageId)
    .maybeSingle();

  let row = first.data as {
    title_en: string;
    title_hi: string | null;
    page_type: string;
    microsite_footer?: unknown;
  } | null;
  let columnReady = true;
  if (missingFooterColumn(first.error)) {
    columnReady = false;
    const fallback = await admin
      .from(Tables.pages)
      .select("id, title_en, title_hi, page_type")
      .eq("id", pageId)
      .maybeSingle();
    row = fallback.data as typeof row;
  }
  if (!row || row.page_type !== "college") return null;

  const contacts = await loadContactLines(pageId);
  const saved = parseMicrositeFooter(columnReady ? row.microsite_footer : null);
  return {
    columnReady,
    contacts,
    footer: {
      ...saved,
      nameEn: saved.nameEn || row.title_en,
      nameHi: saved.nameHi || row.title_hi || "",
    },
  };
}

export async function loadPublicMicrositeFooter(slug: string): Promise<PublicMicrositeFooter | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const first = await admin
    .from(Tables.pages)
    .select("id, title_en, title_hi, page_type, microsite_footer")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  let row = first.data as {
    id: string;
    title_en: string;
    title_hi: string | null;
    page_type: string;
    microsite_footer?: unknown;
  } | null;
  if (missingFooterColumn(first.error)) {
    const fallback = await admin
      .from(Tables.pages)
      .select("id, title_en, title_hi, page_type")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    row = fallback.data as typeof row;
  }
  if (!row || row.page_type !== "college") return null;

  const saved = parseMicrositeFooter(row.microsite_footer);
  if (!saved.custom) return null;

  const contacts = await loadContactLines(row.id);
  const fallbackFooter = footerFromContacts(row.title_en, row.title_hi, contacts);
  return publicFooterFromSaved(saved, fallbackFooter);
}

async function loadContactLines(pageId: string): Promise<MicrositeContactLine[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.pageContactLines)
    .select("label_en, label_hi, value_en, value_hi")
    .eq("page_id", pageId)
    .eq("is_active", true)
    .order("sort_order");
  return ((data ?? []) as Array<{
    label_en: string;
    label_hi: string | null;
    value_en: string;
    value_hi: string | null;
  }>).map((line) => ({
    labelEn: line.label_en,
    labelHi: line.label_hi,
    valueEn: line.value_en,
    valueHi: line.value_hi,
  }));
}

export async function loadDepartmentFooterLinks(
  collegePageId: string,
  collegeSlug: string,
): Promise<MicrositeFooterLink[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.pages)
    .select("id, slug, title_en, title_hi, parent_id, layout_template, layout_config, sort_order, college_root_id, status")
    .eq("college_root_id", collegePageId)
    .eq("layout_template", "office_portal")
    .eq("status", "published")
    .neq("id", collegePageId)
    .order("sort_order")
    .order("title_en");

  const departments = (data ?? []) as Array<{
    slug: string;
    title_en: string;
    title_hi: string | null;
    parent_id: string | null;
    layout_config: unknown;
    sort_order: number | null;
  }>;
  const parentIds = [...new Set(departments.map((page) => page.parent_id).filter(Boolean))] as string[];
  const parentSlugById = new Map<string, string>();
  if (parentIds.length > 0) {
    const { data: parents } = await admin.from(Tables.pages).select("id, slug").in("id", parentIds);
    for (const parent of parents ?? []) {
      parentSlugById.set(parent.id, parent.slug);
    }
  }

  return departments
    .filter((page) => {
      const layout = readStoredLayoutConfig(page.layout_config, "office_portal");
      return layout.showInDepartmentsMenu !== false && page.parent_id && parentSlugById.has(page.parent_id);
    })
    .sort((a, b) =>
      compareBySortOrderThenTitle(
        { sortOrder: a.sort_order, titleEn: a.title_en },
        { sortOrder: b.sort_order, titleEn: b.title_en },
      ),
    )
    .map((page) => ({
      labelEn: page.title_en,
      labelHi: page.title_hi?.trim() ?? "",
      href: getCollegeSubsectionPath(collegeSlug, parentSlugById.get(page.parent_id!)!, page.slug),
    }));
}
