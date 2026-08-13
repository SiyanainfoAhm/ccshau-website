"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { assertPageAccess } from "@/lib/auth/college-scope-server";
import { isDepartmentHodOnlyUser } from "@/lib/auth/department-hod-scope";
import { requireAdminSession, requirePageEditSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type {
  PageContactLine,
  PageGalleryItem,
  PageNewsTickerItem,
  PageStudentCornerItem,
  PageSidebarItem,
  PageStaff,
} from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  pageContactLineSchema,
  pageGalleryItemSchema,
  pageNewsTickerItemSchema,
  pageStudentCornerItemSchema,
  pageSidebarItemSchema,
  pageStaffSchema,
} from "@/lib/validations/office-portal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  removeStorageObjects,
  uploadPageGalleryImage,
  uploadPageNewsTickerFile,
  uploadPageStaffImage,
  uploadPageStudentCornerFile,
} from "@/lib/storage/upload";

async function requireOfficePageAccess(pageId: string, edit = false) {
  const session = edit ? await requirePageEditSession() : await requireAdminSession();
  await assertPageAccess(session, pageId);
  return session;
}

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
  await requireOfficePageAccess(pageId);
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

/** Client-side lazy load for page edit (P1) — avoids blocking RSC on 6 office-portal queries. */
export async function loadOfficePortalDataForAdminAction(pageId: string): Promise<{
  contactLines: PageContactLine[];
  staff: PageStaff[];
  galleryItems: PageGalleryItem[];
  newsTickerItems: PageNewsTickerItem[];
  studentCornerItems: PageStudentCornerItem[];
  sidebarItems: PageSidebarItem[];
}> {
  await requireOfficePageAccess(pageId);
  const [contactLines, staff, galleryItems, newsTickerItems, studentCornerItems, sidebarItems] =
    await Promise.all([
      listPageContactLinesForAdmin(pageId),
      listPageStaffForAdmin(pageId),
      listPageGalleryItemsForAdmin(pageId),
      listPageNewsTickerItemsForAdmin(pageId),
      listPageStudentCornerItemsForAdmin(pageId),
      listPageSidebarItemsForAdmin(pageId),
    ]);
  return {
    contactLines,
    staff,
    galleryItems,
    newsTickerItems,
    studentCornerItems,
    sidebarItems,
  };
}

export async function createPageContactLineAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
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
    const session = await requireOfficePageAccess(pageId, true);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const { error } = await admin
      .from(Tables.pageContactLines)
      .delete()
      .eq("id", id)
      .eq("page_id", pageId);
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
  await requireOfficePageAccess(pageId);
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
    const session = await requireOfficePageAccess(pageId, true);
    if (isDepartmentHodOnlyUser(session)) {
      return fail("Add faculty from Admin → Faculty, not from the page Staff directory.");
    }
    const imageFile = formData.get("staffImageFile");
    const uploadedImage = imageFile instanceof File && imageFile.size > 0 ? imageFile : null;
    const imagePathInput = String(formData.get("imagePath") ?? "").trim();

    const parsed = pageStaffSchema.safeParse({
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi") || undefined,
      designationEn: formData.get("designationEn"),
      designationHi: formData.get("designationHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      imagePath: imagePathInput || undefined,
      detailHref: formData.get("detailHref") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    let imagePath = imagePathInput || null;
    if (uploadedImage) {
      const upload = await uploadPageStaffImage(admin, pageId, uploadedImage);
      if (!upload.success) return upload;
      imagePath = upload.data;
    }

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
        image_path: imagePath,
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

export async function updatePageStaffAction(
  pageId: string,
  staffId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    if (isDepartmentHodOnlyUser(session)) {
      return fail("Manage faculty from Admin → Faculty, not from the page Staff directory.");
    }

    const imageFile = formData.get("staffImageFile");
    const uploadedImage = imageFile instanceof File && imageFile.size > 0 ? imageFile : null;
    const imagePathInput = String(formData.get("imagePath") ?? "").trim();
    const removeImage = formData.get("removeImage") === "on";

    const parsed = pageStaffSchema.safeParse({
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi") || undefined,
      designationEn: formData.get("designationEn"),
      designationHi: formData.get("designationHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      imagePath: imagePathInput || undefined,
      detailHref: formData.get("detailHref") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing, error: existingError } = await admin
      .from(Tables.pageStaff)
      .select("id, image_path")
      .eq("id", staffId)
      .eq("page_id", pageId)
      .maybeSingle();
    if (existingError) return fail(existingError.message);
    if (!existing) return fail("Staff member not found.");

    const input = parsed.data;
    let imagePath = existing.image_path as string | null;
    const previousPath = imagePath;

    if (removeImage) {
      imagePath = null;
    } else if (uploadedImage) {
      const upload = await uploadPageStaffImage(admin, pageId, uploadedImage, staffId);
      if (!upload.success) return upload;
      imagePath = upload.data;
    } else if (imagePathInput) {
      imagePath = imagePathInput;
    }

    const { error } = await admin
      .from(Tables.pageStaff)
      .update({
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        designation_en: input.designationEn,
        designation_hi: input.designationHi || null,
        specialization_en: input.specializationEn || null,
        specialization_hi: input.specializationHi || null,
        image_path: imagePath,
        detail_href: input.detailHref || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .eq("id", staffId)
      .eq("page_id", pageId);

    if (error) return fail(error.message);

    if (
      previousPath &&
      previousPath !== imagePath &&
      !previousPath.startsWith("http://") &&
      !previousPath.startsWith("https://")
    ) {
      await removeStorageObjects(admin, [previousPath]);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "page_staff",
      entityId: staffId,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update staff row.");
  }
}

export async function deletePageStaffAction(pageId: string, id: string): Promise<ActionResult> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    if (isDepartmentHodOnlyUser(session)) {
      return fail("Manage faculty from Admin → Faculty, not from the page Staff directory.");
    }
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.pageStaff)
      .select("image_path")
      .eq("id", id)
      .eq("page_id", pageId)
      .maybeSingle();

    const { error } = await admin
      .from(Tables.pageStaff)
      .delete()
      .eq("id", id)
      .eq("page_id", pageId);
    if (error) return fail(error.message);

    if (
      existing?.image_path &&
      !existing.image_path.startsWith("http://") &&
      !existing.image_path.startsWith("https://")
    ) {
      await removeStorageObjects(admin, [existing.image_path]);
    }

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
  await requireOfficePageAccess(pageId);
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
    const session = await requireOfficePageAccess(pageId, true);
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
    const session = await requireOfficePageAccess(pageId, true);
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
    const session = await requireOfficePageAccess(pageId, true);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const { error } = await admin
      .from(Tables.pageSidebarItems)
      .delete()
      .eq("id", id)
      .eq("page_id", pageId);
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

export async function listPageGalleryItemsForAdmin(pageId: string): Promise<PageGalleryItem[]> {
  await requireOfficePageAccess(pageId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.pageGalleryItems)
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order");
  return (data ?? []) as PageGalleryItem[];
}

export async function createPageGalleryItemAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    const imageFile = formData.get("galleryFile");
    const thumbnailFile = formData.get("thumbnailFile");
    const uploadedImage = imageFile instanceof File && imageFile.size > 0 ? imageFile : null;
    const uploadedThumbnail =
      thumbnailFile instanceof File && thumbnailFile.size > 0 ? thumbnailFile : null;
    const imageUrlInput = String(formData.get("imageUrl") ?? "").trim();
    const thumbnailUrlInput = String(formData.get("thumbnailUrl") ?? "").trim();

    if (!uploadedImage && !imageUrlInput) {
      return fail("Upload an image file or enter an image URL.");
    }

    const parsed = pageGalleryItemSchema.safeParse({
      imageUrl: imageUrlInput || undefined,
      thumbnailUrl: thumbnailUrlInput || undefined,
      titleEn: formData.get("titleEn") || undefined,
      titleHi: formData.get("titleHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    let imageUrl = imageUrlInput;
    let thumbnailUrl = thumbnailUrlInput || null;

    if (uploadedImage) {
      const upload = await uploadPageGalleryImage(admin, pageId, uploadedImage);
      if (!upload.success) return upload;
      imageUrl = upload.data;
      if (!uploadedThumbnail && !thumbnailUrlInput) {
        thumbnailUrl = upload.data;
      }
    }

    if (uploadedThumbnail) {
      const thumbUpload = await uploadPageGalleryImage(admin, pageId, uploadedThumbnail);
      if (!thumbUpload.success) return thumbUpload;
      thumbnailUrl = thumbUpload.data;
    }

    const { data, error } = await admin
      .from(Tables.pageGalleryItems)
      .insert({
        page_id: pageId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        title_en: input.titleEn?.trim() || null,
        title_hi: input.titleHi?.trim() || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_gallery_item",
      entityId: data.id,
    });
    await revalidateOfficePage(pageId);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create gallery image.");
  }
}

export async function deletePageGalleryItemAction(
  pageId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: row } = await admin
      .from(Tables.pageGalleryItems)
      .select("image_url, thumbnail_url")
      .eq("id", id)
      .eq("page_id", pageId)
      .maybeSingle();

    const { error } = await admin
      .from(Tables.pageGalleryItems)
      .delete()
      .eq("id", id)
      .eq("page_id", pageId);
    if (error) return fail(error.message);

    if (row) {
      const storagePaths = [row.image_url, row.thumbnail_url].filter(
        (path): path is string => Boolean(path) && !path.startsWith("http"),
      );
      const uniquePaths = [...new Set(storagePaths)];
      if (uniquePaths.length > 0) {
        await removeStorageObjects(admin, uniquePaths);
      }
    }

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "page_gallery_item",
      entityId: id,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete gallery image.");
  }
}

export async function listPageNewsTickerItemsForAdmin(
  pageId: string,
): Promise<PageNewsTickerItem[]> {
  await requireOfficePageAccess(pageId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.pageNewsTickerItems)
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order");
  return (data ?? []) as PageNewsTickerItem[];
}

export async function createPageNewsTickerItemAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    const tickerFile = formData.get("tickerFile");
    const uploadedFile = tickerFile instanceof File && tickerFile.size > 0 ? tickerFile : null;
    const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

    const parsed = pageNewsTickerItemSchema.safeParse({
      titleEn: formData.get("titleEn"),
      titleHi: formData.get("titleHi") || undefined,
      href: formData.get("href") || undefined,
      expiresAt: expiresAtRaw || undefined,
      isNew: formData.get("isNew") !== "off",
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;
    const itemId = crypto.randomUUID();

    let filePath: string | null = null;
    if (uploadedFile) {
      const upload = await uploadPageNewsTickerFile(admin, pageId, itemId, uploadedFile);
      if (!upload.success) return upload;
      filePath = upload.data;
    }

    const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;

    const { data, error } = await admin
      .from(Tables.pageNewsTickerItems)
      .insert({
        id: itemId,
        page_id: pageId,
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        href: input.href?.trim() || null,
        file_path: filePath,
        expires_at: expiresAt,
        is_new: input.isNew ?? true,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_news_ticker_item",
      entityId: data.id,
    });
    await revalidateOfficePage(pageId);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create news ticker item.");
  }
}

export async function deletePageNewsTickerItemAction(
  pageId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: row } = await admin
      .from(Tables.pageNewsTickerItems)
      .select("file_path")
      .eq("id", id)
      .eq("page_id", pageId)
      .maybeSingle();

    const { error } = await admin
      .from(Tables.pageNewsTickerItems)
      .delete()
      .eq("id", id)
      .eq("page_id", pageId);
    if (error) return fail(error.message);

    if (row?.file_path && !row.file_path.startsWith("http")) {
      await removeStorageObjects(admin, [row.file_path]);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "page_news_ticker_item",
      entityId: id,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete news ticker item.");
  }
}

export async function listPageStudentCornerItemsForAdmin(
  pageId: string,
): Promise<PageStudentCornerItem[]> {
  await requireOfficePageAccess(pageId);
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.pageStudentCornerItems)
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order");
  return (data ?? []) as PageStudentCornerItem[];
}

export async function createPageStudentCornerItemAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    const cornerFile = formData.get("cornerFile");
    const uploadedFile = cornerFile instanceof File && cornerFile.size > 0 ? cornerFile : null;
    const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

    const parsed = pageStudentCornerItemSchema.safeParse({
      titleEn: formData.get("titleEn"),
      titleHi: formData.get("titleHi") || undefined,
      href: formData.get("href") || undefined,
      expiresAt: expiresAtRaw || undefined,
      isNew: formData.get("isNew") !== "off",
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstFieldError = Object.values(fieldErrors).flat().find(Boolean);
      return fail(firstFieldError ?? "Validation failed.", fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;
    const itemId = crypto.randomUUID();

    let filePath: string | null = null;
    if (uploadedFile) {
      const upload = await uploadPageStudentCornerFile(admin, pageId, itemId, uploadedFile);
      if (!upload.success) return fail(upload.error ?? "File upload failed.");
      filePath = upload.data;
    }

    let expiresAt: string | null = null;
    if (input.expiresAt) {
      const expiresDate = new Date(input.expiresAt);
      if (Number.isNaN(expiresDate.getTime())) {
        return fail("Invalid expiry date.");
      }
      expiresAt = expiresDate.toISOString();
    }

    const { data, error } = await admin
      .from(Tables.pageStudentCornerItems)
      .insert({
        id: itemId,
        page_id: pageId,
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        href: input.href?.trim() || null,
        file_path: filePath,
        expires_at: expiresAt,
        is_new: input.isNew ?? true,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) {
      return fail(
        error.message ||
          "Could not save student corner item. Ensure the database migration for student corner is applied.",
      );
    }
    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_student_corner_item",
      entityId: data.id,
    });
    await revalidateOfficePage(pageId);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create student corner item.");
  }
}

export async function deletePageStudentCornerItemAction(
  pageId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const session = await requireOfficePageAccess(pageId, true);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: row } = await admin
      .from(Tables.pageStudentCornerItems)
      .select("file_path")
      .eq("id", id)
      .eq("page_id", pageId)
      .maybeSingle();

    const { error } = await admin
      .from(Tables.pageStudentCornerItems)
      .delete()
      .eq("id", id)
      .eq("page_id", pageId);
    if (error) return fail(error.message);

    if (row?.file_path && !row.file_path.startsWith("http")) {
      await removeStorageObjects(admin, [row.file_path]);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "page_student_corner_item",
      entityId: id,
    });
    await revalidateOfficePage(pageId);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete student corner item.");
  }
}
