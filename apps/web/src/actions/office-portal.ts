"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { PageContactLine, PageSidebarItem, PageStaff } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  pageContactLineSchema,
  pageSidebarItemSchema,
  pageStaffSchema,
} from "@/lib/validations/office-portal";
import { createAdminClient } from "@/lib/supabase/admin";

const OFFICE_ROLES = ["super_admin", "dept_admin", "editor"] as const;

async function revalidateOfficePage(pageId: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin.from(Tables.pages).select("slug, parent_id").eq("id", pageId).maybeSingle();
  if (!data) return;

  const { data: parent } = data.parent_id
    ? await admin.from(Tables.pages).select("slug").eq("id", data.parent_id).maybeSingle()
    : { data: null };

  revalidatePath(`/college/${data.slug}`);
  if (parent?.slug) {
    revalidatePath(`/college/${parent.slug}`);
    revalidatePath(`/college/${parent.slug}/${data.slug}`);
  }
}

export async function listPageContactLinesForAdmin(pageId: string): Promise<PageContactLine[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.pageContactLines)
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order")
    .order("label_en");
  return (data ?? []) as PageContactLine[];
}

export async function createPageContactLineAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...OFFICE_ROLES]);
    const parsed = pageContactLineSchema.safeParse({
      labelEn: formData.get("labelEn"),
      labelHi: formData.get("labelHi") || undefined,
      valueEn: formData.get("valueEn"),
      valueHi: formData.get("valueHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data, error } = await admin
      .from(Tables.pageContactLines)
      .insert({
        page_id: pageId,
        label_en: parsed.data.labelEn,
        label_hi: parsed.data.labelHi || null,
        value_en: parsed.data.valueEn,
        value_hi: parsed.data.valueHi || null,
        sort_order: parsed.data.sortOrder,
        is_active: parsed.data.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_contact_line",
      entityId: data.id,
    });
    await revalidateOfficePage(pageId);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create contact line.");
  }
}

export async function deletePageContactLineAction(
  pageId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...OFFICE_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const { error } = await admin.from(Tables.pageContactLines).delete().eq("id", id);
    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "page_contact_line",
      entityId: id,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete contact line.");
  }
}

export async function listPageStaffForAdmin(pageId: string): Promise<PageStaff[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.pageStaff)
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order")
    .order("name_en");
  return (data ?? []) as PageStaff[];
}

export async function createPageStaffAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...OFFICE_ROLES]);
    const parsed = pageStaffSchema.safeParse({
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi") || undefined,
      designationEn: formData.get("designationEn"),
      designationHi: formData.get("designationHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      imagePath: formData.get("imagePath") || undefined,
      detailHref: formData.get("detailHref") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    const { data, error } = await admin
      .from(Tables.pageStaff)
      .insert({
        page_id: pageId,
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        designation_en: input.designationEn,
        designation_hi: input.designationHi || null,
        specialization_en: input.specializationEn || null,
        specialization_hi: input.specializationHi || null,
        image_path: input.imagePath || null,
        detail_href: input.detailHref || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_staff",
      entityId: data.id,
    });
    await revalidateOfficePage(pageId);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create staff row.");
  }
}

export async function deletePageStaffAction(pageId: string, id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...OFFICE_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const { error } = await admin.from(Tables.pageStaff).delete().eq("id", id);
    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "page_staff",
      entityId: id,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete staff row.");
  }
}

export async function listPageSidebarItemsForAdmin(pageId: string): Promise<PageSidebarItem[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.pageSidebarItems)
    .select("*")
    .eq("page_id", pageId)
    .order("side")
    .order("sort_order")
    .order("label_en");
  return (data ?? []) as PageSidebarItem[];
}

export async function createPageSidebarItemAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...OFFICE_ROLES]);
    const parsed = pageSidebarItemSchema.safeParse({
      side: formData.get("side"),
      labelEn: formData.get("labelEn"),
      labelHi: formData.get("labelHi") || undefined,
      href: formData.get("href") || undefined,
      linkedPageId: formData.get("linkedPageId") || "",
      contentEn: formData.get("contentEn") || undefined,
      contentHi: formData.get("contentHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;
    const hasUrl = !!(input.href?.trim() || input.linkedPageId);

    const { data, error } = await admin
      .from(Tables.pageSidebarItems)
      .insert({
        page_id: pageId,
        side: input.side,
        label_en: input.labelEn,
        label_hi: input.labelHi || null,
        href: input.linkedPageId ? null : input.href?.trim() || null,
        linked_page_id: input.linkedPageId || null,
        content_en: hasUrl ? null : input.contentEn?.trim() || null,
        content_hi: hasUrl ? null : input.contentHi?.trim() || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_sidebar_item",
      entityId: data.id,
    });
    await revalidateOfficePage(pageId);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create sidebar link.");
  }
}

export async function updatePageSidebarItemAction(
  pageId: string,
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...OFFICE_ROLES]);
    const parsed = pageSidebarItemSchema.safeParse({
      side: formData.get("side"),
      labelEn: formData.get("labelEn"),
      labelHi: formData.get("labelHi") || undefined,
      href: formData.get("href") || undefined,
      linkedPageId: formData.get("linkedPageId") || "",
      contentEn: formData.get("contentEn") || undefined,
      contentHi: formData.get("contentHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;
    const hasUrl = !!(input.href?.trim() || input.linkedPageId);

    const { error } = await admin
      .from(Tables.pageSidebarItems)
      .update({
        side: input.side,
        label_en: input.labelEn,
        label_hi: input.labelHi || null,
        href: input.linkedPageId ? null : input.href?.trim() || null,
        linked_page_id: input.linkedPageId || null,
        content_en: hasUrl ? null : input.contentEn?.trim() || null,
        content_hi: hasUrl ? null : input.contentHi?.trim() || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .eq("id", itemId)
      .eq("page_id", pageId);

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "page_sidebar_item",
      entityId: itemId,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update sidebar link.");
  }
}

export async function deletePageSidebarItemAction(
  pageId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...OFFICE_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const { error } = await admin.from(Tables.pageSidebarItems).delete().eq("id", id);
    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "page_sidebar_item",
      entityId: id,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete sidebar link.");
  }
}
