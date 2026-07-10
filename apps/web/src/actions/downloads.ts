"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  canPublishContent,
  CONTENT_EDIT_ROLES,
  isUniversityWideCmsSession,
} from "@/lib/auth/cms-roles";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, Download, DownloadVersion } from "@/lib/database/types";
import {
  removeStorageObjects,
  uploadDownloadFile,
} from "@/lib/storage/upload";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { downloadFormSchema, parseDownloadTags } from "@/lib/validations/downloads";
import { emptyPaginatedResult, mergeAdminListOptions, runPaginatedQuery } from "@/lib/data/admin-list";
import type { PaginatedResult } from "@/lib/data/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

export { listDepartments };

function parseForm(formData: FormData) {
  return downloadFormSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    category: formData.get("category") || undefined,
    version: formData.get("version") || undefined,
    tags: formData.get("tags") || undefined,
    departmentId: formData.get("departmentId") || "",
    status: formData.get("status"),
    isPublic: formData.get("isPublic") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    removeFile: formData.get("removeFile") === "on",
  });
}

function getFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

function usesPublicBucket(
  status: ContentStatus,
  isPublic: boolean,
): boolean {
  return status === "published" && isPublic;
}

function toRow(
  input: ReturnType<typeof downloadFormSchema.parse>,
  userId: string,
  existing?: { published_at?: string | null },
) {
  const now = new Date().toISOString();
  const publishedAt =
    input.status === "published"
      ? existing?.published_at ?? now
      : input.status === "draft"
        ? null
        : existing?.published_at ?? null;

  return {
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    category: input.category || null,
    version: input.version || null,
    tags: parseDownloadTags(input.tags),
    department_id: input.departmentId || null,
    status: input.status as ContentStatus,
    is_public: input.isPublic !== "false",
    expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    published_at: publishedAt,
    updated_by: userId,
  };
}

async function assertDownloadAccess(
  session: Awaited<ReturnType<typeof requireAdminSession>>,
  download: Pick<Download, "department_id">,
): Promise<ActionResult | null> {
  if (
    !isUniversityWideCmsSession(session) &&
    session.departmentId &&
    download.department_id !== session.departmentId
  ) {
    return fail("You do not have access to this download.");
  }
  return null;
}

async function archiveCurrentFileAsVersion(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  download: Download,
  userId: string,
): Promise<void> {
  if (!download.file_path || download.file_path === "pending") return;

  await admin.from(Tables.downloadVersions).insert({
    download_id: download.id,
    version_label: download.version,
    file_path: download.file_path,
    file_name: download.file_name,
    file_size: download.file_size,
    mime_type: download.mime_type,
    created_by: userId,
  });
}

const DOWNLOADS_LIST_SORTS = ["title_en", "category", "version", "status", "updated_at"] as const;

export async function listDownloadsForAdmin(
  options: import("@/lib/data/admin-list").AdminListOptions = {},
): Promise<PaginatedResult<Download>> {
  const opts = mergeAdminListOptions(options, {
    sortBy: "title_en",
    sortOrder: "asc",
    allowedSorts: DOWNLOADS_LIST_SORTS,
  });

  const session = await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  let query = admin.from(Tables.downloads).select("*", { count: "exact" });

  if (!isUniversityWideCmsSession(session) && session.departmentId) {
    query = query.eq("department_id", session.departmentId);
  }

  return runPaginatedQuery<Download>(query, opts);
}

export async function getDownloadById(id: string): Promise<Download | null> {
  const session = await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.downloads).select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  if (
    !isUniversityWideCmsSession(session) &&
    session.departmentId &&
    data.department_id !== session.departmentId
  ) {
    return null;
  }

  return data as Download;
}

export async function listDownloadVersions(downloadId: string): Promise<DownloadVersion[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.downloadVersions)
    .select("*")
    .eq("download_id", downloadId)
    .order("created_at", { ascending: false });

  return (data ?? []) as DownloadVersion[];
}

export async function createDownloadAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_EDIT_ROLES]);
    const parsed = parseForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (parsed.data.status === "published" && !canPublishContent(session)) {
      return fail("You do not have permission to publish downloads.");
    }

    const file = getFile(formData);
    if (!file) return fail("File is required.");

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const row = toRow(parsed.data, session.userId);

    const { data, error } = await admin
      .from(Tables.downloads)
      .insert({
        ...row,
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
      usesPublicBucket(row.status, row.is_public),
    );
    if (!upload.success) {
      await admin.from(Tables.downloads).delete().eq("id", data.id);
      return upload;
    }

    await admin.from(Tables.downloads).update({ file_path: upload.data }).eq("id", data.id);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "create",
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
    const session = await requireAdminWithRoles([...CONTENT_EDIT_ROLES]);
    const parsed = parseForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (parsed.data.status === "published" && !canPublishContent(session)) {
      return fail("You do not have permission to publish downloads.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.downloads)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return fail("Download not found.");

    const accessError = await assertDownloadAccess(session, existing as Download);
    if (accessError) return accessError;

    const download = existing as Download;
    const row = toRow(parsed.data, session.userId, { published_at: download.published_at });
    const usePublicBucket = usesPublicBucket(row.status, row.is_public);

    let filePath = download.file_path;
    let fileName = download.file_name;
    let fileSize = download.file_size;
    let mimeType = download.mime_type;
    const file = getFile(formData);

    if (parsed.data.removeFile && !file) {
      return fail("Upload a replacement file or keep the current document.");
    }

    if (file && download.file_path && download.file_path !== "pending") {
      await archiveCurrentFileAsVersion(admin, download, session.userId);
      const upload = await uploadDownloadFile(admin, id, file, usePublicBucket);
      if (!upload.success) return upload;
      filePath = upload.data;
      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type;
    } else if (parsed.data.removeFile && download.file_path !== "pending") {
      await archiveCurrentFileAsVersion(admin, download, session.userId);
      await removeStorageObjects(admin, [download.file_path]);
      filePath = "pending";
    }

    const { error } = await admin
      .from(Tables.downloads)
      .update({
        ...row,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
      })
      .eq("id", id);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "update",
      entityType: "download",
      entityId: id,
    });

    revalidatePath("/admin/downloads");
    revalidatePath(`/admin/downloads/${id}`);
    revalidatePath("/downloads");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}

export async function deleteDownloadAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...CONTENT_EDIT_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getDownloadById(id);
    if (!existing) return fail("Download not found.");

    const paths: string[] = [];
    if (existing.file_path && existing.file_path !== "pending") {
      paths.push(existing.file_path);
    }

    const { data: versions } = await admin
      .from(Tables.downloadVersions)
      .select("file_path")
      .eq("download_id", id);
    for (const version of versions ?? []) {
      if (version.file_path) paths.push(version.file_path);
    }

    if (paths.length > 0) {
      await removeStorageObjects(admin, paths);
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
    revalidatePath("/downloads");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed.");
  }
}
