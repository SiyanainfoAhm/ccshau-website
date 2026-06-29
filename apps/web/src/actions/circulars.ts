"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { Circular, ContentStatus } from "@/lib/database/types";
import { removeStorageObjects, uploadCircularFile } from "@/lib/storage/upload";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { circularFormSchema } from "@/lib/validations/circulars";
import { createAdminClient } from "@/lib/supabase/admin";

const CONTENT_ROLES = ["super_admin", "dept_admin", "editor"] as const;
const PUBLISH_ROLES = ["super_admin", "dept_admin"] as const;

export { listDepartments };

function parseForm(formData: FormData) {
  return circularFormSchema.safeParse({
    circularNumber: formData.get("circularNumber") || undefined,
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    departmentId: formData.get("departmentId") || "",
    status: formData.get("status"),
    removeFile: formData.get("removeFile") === "on",
  });
}

function getFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

function toRow(input: ReturnType<typeof circularFormSchema.parse>, userId: string) {
  return {
    circular_number: input.circularNumber || null,
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    department_id: input.departmentId || null,
    status: input.status as ContentStatus,
    published_at: input.status === "published" ? new Date().toISOString() : null,
    updated_by: userId,
  };
}

export async function listCircularsForAdmin(): Promise<Circular[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.circulars)
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Circular[];
}

export async function getCircularById(id: string): Promise<Circular | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.circulars).select("*").eq("id", id).maybeSingle();
  return (data as Circular) ?? null;
}

export async function createCircularAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_ROLES]);
    const parsed = parseForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish circulars.");
    }

    const file = getFile(formData);
    if (!file) return fail("PDF document is required.");

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data, error } = await admin
      .from(Tables.circulars)
      .insert({ ...toRow(parsed.data, session.userId), created_by: session.userId })
      .select("id")
      .single();
    if (error) return fail(error.message);

    const upload = await uploadCircularFile(
      admin,
      data.id,
      file,
      parsed.data.status === "published",
    );
    if (!upload.success) {
      await admin.from(Tables.circulars).delete().eq("id", data.id);
      return upload;
    }

    await admin
      .from(Tables.circulars)
      .update({
        file_path: upload.data,
        file_name: file.name,
        file_size: file.size,
      })
      .eq("id", data.id);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "circular",
      entityId: data.id,
    });

    revalidatePath("/admin/circulars");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed.");
  }
}

export async function updateCircularAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_ROLES]);
    const parsed = parseForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish circulars.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getCircularById(id);
    if (!existing) return fail("Circular not found.");

    let filePath = existing.file_path;
    let fileName = existing.file_name;
    let fileSize = existing.file_size;
    const file = getFile(formData);

    if (parsed.data.removeFile && !file) {
      return fail("Upload a replacement file or keep the current document.");
    }

    if (parsed.data.removeFile && existing.file_path) {
      await removeStorageObjects(admin, [existing.file_path]);
      filePath = null;
      fileName = null;
      fileSize = null;
    }

    if (file) {
      if (existing.file_path) await removeStorageObjects(admin, [existing.file_path]);
      const upload = await uploadCircularFile(
        admin,
        id,
        file,
        parsed.data.status === "published",
      );
      if (!upload.success) return upload;
      filePath = upload.data;
      fileName = file.name;
      fileSize = file.size;
    }

    const { error } = await admin
      .from(Tables.circulars)
      .update({
        ...toRow(parsed.data, session.userId),
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
      })
      .eq("id", id);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "circular",
      entityId: id,
    });

    revalidatePath("/admin/circulars");
    revalidatePath(`/admin/circulars/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}

export async function deleteCircularAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getCircularById(id);
    if (!existing) return fail("Circular not found.");
    if (existing.file_path) await removeStorageObjects(admin, [existing.file_path]);

    const { error } = await admin.from(Tables.circulars).delete().eq("id", id);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "circular",
      entityId: id,
    });

    revalidatePath("/admin/circulars");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed.");
  }
}
