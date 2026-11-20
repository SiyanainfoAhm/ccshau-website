"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { canEditPages, sessionCanAccessCollegeRoot } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import { loadMicrositeMenuEditor, type MicrositeMenuAvailablePage } from "@/lib/data/microsite-menu";
import { assertCollegeRegisterAccess } from "@/lib/pages/college-register-helpers";
import { LAYOUT_PRESETS } from "@/lib/pages/layout-config";
import {
  normalizeMicrositeMenuDraft,
  parseMicrositeMenu,
  type MicrositeMenuDraftItem,
  type MicrositeMenuEditorItem,
  type MicrositeMenuStored,
  type MicrositeMenuStoredItem,
} from "@/lib/pages/microsite-menu";
import { getCollegeContactPath, getCollegePublicHomePath, getCollegeSectionPath } from "@/lib/pages/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { slugify } from "@/lib/utils/slug";

const NEW_MENU_PAGE_LAYOUT = {
  ...LAYOUT_PRESETS.minimal,
  mainContent: true,
  collegeTopMenu: true,
  showInDepartmentsMenu: false,
};

async function uniquePageSlug(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  base: string,
): Promise<string> {
  let slug = base;
  for (let n = 2; n < 50; n += 1) {
    const { data } = await admin.from(Tables.pages).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${n}`;
  }
  throw new Error("Could not create a unique page address.");
}

export async function saveMicrositeMenuAction(
  collegePageId: string,
  draft: MicrositeMenuDraftItem[],
): Promise<ActionResult<{ items: MicrositeMenuEditorItem[]; availablePages: MicrositeMenuAvailablePage[] }>> {
  try {
    const session = await requireAdminSession();
    if (!canEditPages(session) || !sessionCanAccessCollegeRoot(session, collegePageId)) {
      return fail("You do not have access to this microsite menu.");
    }
    const college = await assertCollegeRegisterAccess(session, collegePageId);
    const normalized = normalizeMicrositeMenuDraft(draft);
    if (!normalized.ok) return fail(normalized.error);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: collegeRow } = await admin
      .from(Tables.pages)
      .select("layout_config, slug")
      .eq("id", collegePageId)
      .maybeSingle();
    if (!collegeRow) return fail("Microsite not found.");

    const { data: children } = await admin
      .from(Tables.pages)
      .select("id, slug, title_en, title_hi, status")
      .eq("parent_id", collegePageId)
      .neq("status", "deleted");

    const pages = new Map((children ?? []).map((page) => [page.id as string, page]));
    const stored: MicrositeMenuStoredItem[] = [];

    for (const [index, item] of normalized.items.entries()) {
      if (item.kind === "home") {
        stored.push({
          id: "home",
          kind: "home",
          visible: item.visible,
          labelEn: item.labelEn,
          labelHi: item.labelHi,
        });
        continue;
      }
      if (item.kind === "contact") {
        stored.push({
          id: "contact",
          kind: "contact",
          visible: item.visible,
          labelEn: item.labelEn,
          labelHi: item.labelHi,
        });
        continue;
      }
      if (item.kind === "link") {
        stored.push({
          id: `link:${crypto.randomUUID()}`,
          kind: "link",
          visible: item.visible,
          labelEn: item.labelEn,
          labelHi: item.labelHi,
          href: String(item.href ?? "").trim(),
          openInNewTab: item.openInNewTab !== false,
        });
        continue;
      }

      let pageId = item.pageId ?? "";
      if (item.kind === "new-page") {
        const base = slugify(`${college.slug}-${item.labelEn}`);
        if (!base) return fail("Enter an English name that can be used in the page address.");
        const slug = await uniquePageSlug(admin, base);
        const { data: created, error } = await admin
          .from(Tables.pages)
          .insert({
            slug,
            title_en: item.labelEn,
            title_hi: item.labelHi || null,
            parent_id: collegePageId,
            college_root_id: collegePageId,
            page_type: "standard",
            layout_template: "standard",
            layout_config: NEW_MENU_PAGE_LAYOUT,
            status: "published",
            published_at: new Date().toISOString(),
            sort_order: index,
            office_cta_enabled: true,
            created_by: session.userId,
            updated_by: session.userId,
            content_owner_id: session.userId,
          })
          .select("id, slug, title_en, title_hi, status")
          .single();
        if (error || !created) return fail(error?.message ?? "Could not create the menu page.");
        pages.set(created.id, created);
        pageId = created.id;
      }

      const page = pages.get(pageId);
      if (!page || page.status === "deleted") {
        return fail("A selected page is not part of this microsite.");
      }
      const titleHi = item.labelHi || null;
      if (page.title_en !== item.labelEn || (page.title_hi ?? null) !== titleHi) {
        const { error } = await admin
          .from(Tables.pages)
          .update({
            title_en: item.labelEn,
            title_hi: titleHi,
            sort_order: index,
            updated_by: session.userId,
          })
          .eq("id", pageId);
        if (error) return fail(error.message);
      } else if (item.kind === "page") {
        await admin
          .from(Tables.pages)
          .update({ sort_order: index, updated_by: session.userId })
          .eq("id", pageId);
      }
      stored.push({ id: `page:${pageId}`, kind: "page", pageId, visible: item.visible });
    }

    const menu: MicrositeMenuStored = { items: stored };
    if (!parseMicrositeMenu({ micrositeMenu: menu })) {
      return fail("The menu could not be saved.");
    }

    const layout =
      collegeRow.layout_config && typeof collegeRow.layout_config === "object"
        ? { ...collegeRow.layout_config, micrositeMenu: menu }
        : { micrositeMenu: menu };

    const { error } = await admin
      .from(Tables.pages)
      .update({ layout_config: layout, updated_by: session.userId })
      .eq("id", collegePageId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "microsite_menu",
      entityId: collegePageId,
      details: { items: stored.length },
    });

    const collegeSlug = college.slug;
    revalidatePath(getCollegePublicHomePath(collegeSlug));
    revalidatePath(getCollegeContactPath(collegeSlug));
    revalidatePath(`/college/${collegeSlug}`);
    revalidatePath(`/admin/register/${collegePageId}`);
    revalidatePath(`/admin/register/${collegePageId}/menu`);
    for (const page of pages.values()) {
      if (page.slug) revalidatePath(getCollegeSectionPath(collegeSlug, page.slug));
    }

    const editor = await loadMicrositeMenuEditor(collegePageId);
    return ok({
      items: editor?.items ?? [],
      availablePages: editor?.availablePages ?? [],
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not save the menu.");
  }
}
