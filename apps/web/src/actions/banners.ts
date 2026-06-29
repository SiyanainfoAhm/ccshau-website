"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { Banner } from "@/lib/database/types";
import { removeStorageObjects, uploadBannerImage } from "@/lib/storage/upload";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { bannerFormSchema } from "@/lib/validations/banners";
import { createAdminClient } from "@/lib/supabase/admin";

const BANNER_ROLES = ["super_admin", "dept_admin", "editor"] as const;

function parseBannerForm(formData: FormData) {
  return bannerFormSchema.safeParse({
    title: formData.get("title"),
    targetUrl: formData.get("targetUrl") || "",
    altText: formData.get("altText") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    priority: formData.get("priority") ?? 0,
    isActive: formData.get("isActive") !== "off",
    removeImage: formData.get("removeImage") === "on",
  });
}

function getImageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

function toBannerRow(input: ReturnType<typeof bannerFormSchema.parse>, userId: string) {
  return {
    title: input.title,
    target_url: input.targetUrl || null,
    alt_text: input.altText || null,
    start_date: input.startDate ? new Date(input.startDate).toISOString() : null,
    end_date: input.endDate ? new Date(input.endDate).toISOString() : null,
    priority: input.priority,
    is_active: input.isActive ?? true,
    created_by: userId,
  };
}

export async function listBannersForAdmin(): Promise<Banner[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.banners)
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []) as Banner[];
}

export async function getBannerById(id: string): Promise<Banner | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.banners).select("*").eq("id", id).maybeSingle();
  return (data as Banner) ?? null;
}

export async function createBannerAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...BANNER_ROLES]);
    const parsed = parseBannerForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const imageFile = getImageFile(formData);
    if (!imageFile) return fail("Banner image is required.");

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data, error } = await admin
      .from(Tables.banners)
      .insert({ ...toBannerRow(parsed.data, session.userId), image_path: "pending" })
      .select("id")
      .single();

    if (error) return fail(error.message);

    const upload = await uploadBannerImage(admin, data.id, imageFile);
    if (!upload.success) {
      await admin.from(Tables.banners).delete().eq("id", data.id);
      return upload;
    }

    const { error: updateError } = await admin
      .from(Tables.banners)
      .update({ image_path: upload.data })
      .eq("id", data.id);

    if (updateError) return fail(updateError.message);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "banner",
      entityId: data.id,
      details: { title: parsed.data.title },
    });

    revalidatePath("/admin/banners");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed.");
  }
}

export async function updateBannerAction(
  bannerId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...BANNER_ROLES]);
    const parsed = parseBannerForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getBannerById(bannerId);
    if (!existing) return fail("Banner not found.");

    let imagePath = existing.image_path;
    const imageFile = getImageFile(formData);

    if (parsed.data.removeImage && !imageFile) {
      return fail("Upload a replacement image or keep the current one.");
    }

    if (parsed.data.removeImage && existing.image_path !== "pending") {
      await removeStorageObjects(admin, [existing.image_path]);
      imagePath = "pending";
    }

    if (imageFile) {
      if (existing.image_path && existing.image_path !== "pending") {
        await removeStorageObjects(admin, [existing.image_path]);
      }
      const upload = await uploadBannerImage(admin, bannerId, imageFile);
      if (!upload.success) return upload;
      imagePath = upload.data;
    }

    const { error } = await admin
      .from(Tables.banners)
      .update({
        ...toBannerRow(parsed.data, session.userId),
        image_path: imagePath,
      })
      .eq("id", bannerId);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "banner",
      entityId: bannerId,
      details: { title: parsed.data.title },
    });

    revalidatePath("/admin/banners");
    revalidatePath(`/admin/banners/${bannerId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}

export async function deleteBannerAction(bannerId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...BANNER_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getBannerById(bannerId);
    if (!existing) return fail("Banner not found.");

    if (existing.image_path && existing.image_path !== "pending") {
      await removeStorageObjects(admin, [existing.image_path]);
    }

    const { error } = await admin.from(Tables.banners).delete().eq("id", bannerId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "banner",
      entityId: bannerId,
    });

    revalidatePath("/admin/banners");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed.");
  }
}
