"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, Download } from "@/lib/database/types";
import { removeStorageObjects, uploadDownloadFile } from "@/lib/storage/upload";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { downloadFormSchema } from "@/lib/validations/downloads";
import { createAdminClient } from "@/lib/supabase/admin";

const CONTENT_ROLES = ["super_admin", "dept_admin", "editor"] as const;
const PUBLISH_ROLES = ["super_admin", "dept_admin"] as const;

export { listDepartments };

function parseForm(formData: FormData) {
  return downloadFormSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    category: formData.get("category") || undefined,
    version: formData.get("version") || undefined,
    departmentId: formData.get("departmentId") || "",
    status: formData.get("status"),
    removeFile: formData.get("removeFile") === "on",
  });
}

function getFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

function toRow(input: ReturnType<typeof downloadFormSchema.parse>, userId: string) {
  return {
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    category: input.category || null,
    version: input.version || null,
    department_id: input.departmentId || null,
    status: input.status as ContentStatus,
    updated_by: userId,
  };
}

export async function listDownloadsForAdmin(): Promise<Download[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.downloads)
    .select("*")
    .order("category")
    .order("title_en");
  return (data ?? []) as Download[];
}

export async function getDownloadById(id: string): Promise<Download | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.downloads).select("*").eq("id", id).maybeSingle();
  return (data as Download) ?? null;
}

export async function createDownloadAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_ROLES]);
    const parsed = parseForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish downloads.");
    }

    const file = getFile(formData);
    if (!file) return fail("File is required.");

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data, error } = await admin
      .from(Tables.downloads)
      .insert({
        ...toRow(parsed.data, session.userId),
        created_by: session.userId,
        file_path: "pending",
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select("id")
      .single();
    if (error) return fail(error.message);

    const upload = await uploadDownloadFile(
      admin,
      data.id,
      file,
      parsed.data.status === "published",
    );
    if (!upload.success) {
      await admin.from(Tables.downloads).delete().eq("id", data.id);
      return upload;
    }

    await admin.from(Tables.downloads).update({ file_path: upload.data }).eq("id", data.id);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "download",
      entityId: data.id,
    });

    revalidatePath("/admin/downloads");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed.");
  }
}

export async function updateDownloadAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_ROLES]);
    const parsed = parseForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish downloads.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getDownloadById(id);
    if (!existing) return fail("Download not found.");

    let filePath = existing.file_path;
    let fileName = existing.file_name;
    let fileSize = existing.file_size;
    let mimeType = existing.mime_type;
    const file = getFile(formData);

    if (parsed.data.removeFile && !file) {
      return fail("Upload a replacement file or keep the current document.");
    }

    if (parsed.data.removeFile && existing.file_path !== "pending") {
      await removeStorageObjects(admin, [existing.file_path]);
      filePath = "pending";
    }

    if (file) {
      if (existing.file_path && existing.file_path !== "pending") {
        await removeStorageObjects(admin, [existing.file_path]);
      }
      const upload = await uploadDownloadFile(
        admin,
        id,
        file,
        parsed.data.status === "published",
      );
      if (!upload.success) return upload;
      filePath = upload.data;
      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type;
    }

    const { error } = await admin
      .from(Tables.downloads)
      .update({
        ...toRow(parsed.data, session.userId),
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
      })
      .eq("id", id);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "download",
      entityId: id,
    });

    revalidatePath("/admin/downloads");
    revalidatePath(`/admin/downloads/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}

export async function deleteDownloadAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getDownloadById(id);
    if (!existing) return fail("Download not found.");
    if (existing.file_path && existing.file_path !== "pending") {
      await removeStorageObjects(admin, [existing.file_path]);
    }

    const { error } = await admin.from(Tables.downloads).delete().eq("id", id);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "download",
      entityId: id,
    });

    revalidatePath("/admin/downloads");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed.");
  }
}
