"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import { hasRole } from "@/lib/auth/rbac";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { AttachmentPath, ContentStatus, NewsItem, NoticeType } from "@/lib/database/types";
import { removeStorageObjects, uploadNewsAttachments } from "@/lib/storage/upload";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { newsFormSchema } from "@/lib/validations/news";
import { createAdminClient } from "@/lib/supabase/admin";

const NEWS_ROLES = ["super_admin", "dept_admin", "editor"] as const;
const PUBLISH_ROLES = ["super_admin", "dept_admin"] as const;

export { listDepartments };

function parseNewsForm(formData: FormData) {
  return newsFormSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    slug: formData.get("slug"),
    bodyEn: formData.get("bodyEn") || undefined,
    bodyHi: formData.get("bodyHi") || undefined,
    noticeType: formData.get("noticeType"),
    category: formData.get("category") || undefined,
    departmentId: formData.get("departmentId") || "",
    status: formData.get("status"),
    expiresAt: formData.get("expiresAt") || undefined,
    isFeatured: formData.get("isFeatured") === "on",
    isPinned: formData.get("isPinned") === "on",
    removedAttachments: formData.get("removedAttachments") || undefined,
  });
}

function getFilesFromForm(formData: FormData): File[] {
  return formData
    .getAll("attachments")
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function parseRemovedPaths(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function toNewsRow(input: ReturnType<typeof newsFormSchema.parse>, userId: string) {
  const publishedAt = input.status === "published" ? new Date().toISOString() : null;
  return {
    slug: input.slug,
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    body_en: input.bodyEn || null,
    body_hi: input.bodyHi || null,
    notice_type: input.noticeType as NoticeType,
    category: input.category || null,
    department_id: input.departmentId || null,
    status: input.status as ContentStatus,
    published_at: publishedAt,
    expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    is_featured: input.isFeatured ?? false,
    is_pinned: input.isPinned ?? false,
    content_owner_id: userId,
    updated_by: userId,
  };
}

async function mergeAttachments(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  newsId: string,
  formData: FormData,
  parsed: ReturnType<typeof newsFormSchema.parse>,
  existing: AttachmentPath[] = [],
): Promise<ActionResult<AttachmentPath[]>> {
  const removed = parseRemovedPaths(parsed.removedAttachments);
  const kept = existing.filter((a) => !removed.includes(a.path));

  if (removed.length > 0) {
    await removeStorageObjects(admin, removed);
  }

  const files = getFilesFromForm(formData);
  if (files.length === 0) return ok(kept);

  const upload = await uploadNewsAttachments(
    admin,
    newsId,
    files,
    parsed.status === "published",
  );
  if (!upload.success) return upload;

  return ok([...kept, ...upload.data]);
}

export async function createNewsAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...NEWS_ROLES]);
    const parsed = parseNewsForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish news.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const row = {
      ...toNewsRow(parsed.data, session.userId),
      attachment_paths: [] as AttachmentPath[],
      created_by: session.userId,
    };

    const { data, error } = await admin.from(Tables.news).insert(row).select("id").single();
    if (error) return fail(error.message);

    const attachments = await mergeAttachments(admin, data.id, formData, parsed.data);
    if (!attachments.success) return fail(attachments.error);

    await admin
      .from(Tables.news)
      .update({ attachment_paths: attachments.data })
      .eq("id", data.id);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "create",
      entityType: "news",
      entityId: data.id,
      details: { slug: parsed.data.slug, attachments: attachments.data.length },
    });

    revalidatePath("/admin/news");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create news");
  }
}

export async function updateNewsAction(
  newsId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...NEWS_ROLES]);
    const parsed = parseNewsForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish news.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.news)
      .select("attachment_paths")
      .eq("id", newsId)
      .maybeSingle();

    const currentAttachments = (existing?.attachment_paths ?? []) as AttachmentPath[];
    const attachments = await mergeAttachments(
      admin,
      newsId,
      formData,
      parsed.data,
      currentAttachments,
    );
    if (!attachments.success) return fail(attachments.error);

    const row = {
      ...toNewsRow(parsed.data, session.userId),
      attachment_paths: attachments.data,
    };

    const { error } = await admin.from(Tables.news).update(row).eq("id", newsId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "update",
      entityType: "news",
      entityId: newsId,
      details: { slug: parsed.data.slug },
    });

    revalidatePath("/admin/news");
    revalidatePath(`/admin/news/${newsId}`);
    return ok({ id: newsId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update news");
  }
}

export async function deleteNewsAction(newsId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles(["super_admin", "dept_admin"]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: item } = await admin
      .from(Tables.news)
      .select("attachment_paths")
      .eq("id", newsId)
      .maybeSingle();

    const paths = ((item?.attachment_paths ?? []) as AttachmentPath[]).map((a) => a.path);
    if (paths.length > 0) await removeStorageObjects(admin, paths);

    const { error } = await admin.from(Tables.news).delete().eq("id", newsId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "news",
      entityId: newsId,
    });

    revalidatePath("/admin/news");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete news");
  }
}

export async function listNewsForAdmin(): Promise<NewsItem[]> {
  const session = await requireAdminSession();
  if (!hasRole(session.roles, ["super_admin", "dept_admin", "editor", "viewer"])) {
    return [];
  }

  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin.from(Tables.news).select("*").order("updated_at", { ascending: false });

  const isSuperAdmin = session.roles.some((r) => r.role === "super_admin");
  if (!isSuperAdmin && session.departmentId) {
    query = query.eq("department_id", session.departmentId);
  }

  const { data } = await query;
  return (data ?? []) as NewsItem[];
}

export async function getNewsById(newsId: string): Promise<NewsItem | null> {
  const session = await requireAdminSession();
  if (!hasRole(session.roles, ["super_admin", "dept_admin", "editor", "viewer"])) {
    return null;
  }

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.news).select("*").eq("id", newsId).maybeSingle();
  return (data as NewsItem) ?? null;
}
