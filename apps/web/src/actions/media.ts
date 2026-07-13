"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  canPublishContent,
  CONTENT_EDIT_ROLES,
  isUniversityWideCmsSession,
} from "@/lib/auth/cms-roles";
import { hasCmsModuleAccess, requireAdminSessionForCmsModule } from "@/lib/auth/cms-module-access-server";
import { requireAdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, MediaAlbum, MediaAlbumType, MediaItem } from "@/lib/database/types";
import {
  removeStorageObjects,
  uploadMediaCover,
  uploadMediaItemFile,
} from "@/lib/storage/upload";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { mediaAlbumFormSchema, mediaItemFormSchema } from "@/lib/validations/media";
import {
  buildPaginatedResult,
  paginationRange,
} from "@/lib/data/pagination";
import {
  emptyPaginatedResult,
  mergeAdminListOptions,
  type AdminListOptions,
} from "@/lib/data/admin-list";
import type { PaginatedResult } from "@/lib/data/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

export { listDepartments };

export interface MediaAlbumWithCount extends MediaAlbum {
  item_count: number;
}

function parseAlbumForm(formData: FormData) {
  return mediaAlbumFormSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    slug: formData.get("slug"),
    albumType: formData.get("albumType"),
    eventDate: formData.get("eventDate") || undefined,
    departmentId: formData.get("departmentId") || "",
    status: formData.get("status"),
    removeCover: formData.get("removeCover") === "on",
  });
}

function parseItemForm(formData: FormData) {
  return mediaItemFormSchema.safeParse({
    titleEn: formData.get("titleEn") || undefined,
    titleHi: formData.get("titleHi") || undefined,
    captionEn: formData.get("captionEn") || undefined,
    captionHi: formData.get("captionHi") || undefined,
    mediaType: formData.get("mediaType"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
}

function toAlbumRow(input: ReturnType<typeof mediaAlbumFormSchema.parse>, userId: string) {
  return {
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    slug: input.slug,
    album_type: input.albumType as MediaAlbumType,
    event_date: input.eventDate || null,
    department_id: input.departmentId || null,
    status: input.status as ContentStatus,
    published_at: input.status === "published" ? new Date().toISOString() : null,
    updated_by: userId,
  };
}

const MEDIA_LIST_SORTS = ["title_en", "album_type", "status", "created_at", "event_date"] as const;

async function attachMediaItemCounts(
  albums: MediaAlbum[],
): Promise<MediaAlbumWithCount[]> {
  if (!albums.length) return [];

  const admin = createAdminClient();
  if (!admin) {
    return albums.map((album) => ({ ...album, item_count: 0 }));
  }

  const albumIds = albums.map((a) => a.id);
  const { data: counts } = await admin
    .from(Tables.mediaItems)
    .select("album_id")
    .in("album_id", albumIds);

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.album_id, (countMap.get(row.album_id) ?? 0) + 1);
  }

  return albums.map((album) => ({
    ...album,
    item_count: countMap.get(album.id) ?? 0,
  }));
}

export async function listMediaAlbumsForAdmin(
  options: AdminListOptions = {},
): Promise<PaginatedResult<MediaAlbumWithCount>> {
  const opts = mergeAdminListOptions(options, {
    sortBy: "created_at",
    sortOrder: "desc",
    allowedSorts: MEDIA_LIST_SORTS,
  });

  const session = await requireAdminSession();
  if (!(await hasCmsModuleAccess(session, "media"))) {
    return emptyPaginatedResult(opts);
  }
  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  const { from, to } = paginationRange(opts.page, opts.pageSize);
  let query = admin
    .from(Tables.mediaAlbums)
    .select("*", { count: "exact" })
    .order(opts.sortBy, { ascending: opts.sortOrder === "asc" });

  if (!isUniversityWideCmsSession(session) && session.departmentId) {
    query = query.eq("department_id", session.departmentId);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("Media albums list failed:", error.message);
    return emptyPaginatedResult(opts);
  }

  const items = await attachMediaItemCounts((data ?? []) as MediaAlbum[]);
  return buildPaginatedResult(items, count ?? 0, opts.page, opts.pageSize);
}

export async function getMediaAlbumById(id: string): Promise<MediaAlbum | null> {
  const session = await requireAdminSession();
  if (!(await hasCmsModuleAccess(session, "media"))) {
    return null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.mediaAlbums).select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  if (
    !isUniversityWideCmsSession(session) &&
    session.departmentId &&
    data.department_id !== session.departmentId
  ) {
    return null;
  }

  return data as MediaAlbum;
}

export async function listMediaItemsForAlbum(albumId: string): Promise<MediaItem[]> {
  const album = await getMediaAlbumById(albumId);
  if (!album) return [];

  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.mediaItems)
    .select("*")
    .eq("album_id", albumId)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as MediaItem[];
}

export async function createMediaAlbumAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminSessionForCmsModule("media", [...CONTENT_EDIT_ROLES]);
    const parsed = parseAlbumForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (parsed.data.status === "published" && !canPublishContent(session)) {
      return fail("You do not have permission to publish albums.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data, error } = await admin
      .from(Tables.mediaAlbums)
      .insert({ ...toAlbumRow(parsed.data, session.userId), created_by: session.userId })
      .select("id")
      .single();
    if (error) return fail(error.message);

    const cover = formData.get("cover");
    if (cover instanceof File && cover.size > 0) {
      const upload = await uploadMediaCover(admin, data.id, cover);
      if (upload.success) {
        await admin
          .from(Tables.mediaAlbums)
          .update({ cover_image_path: upload.data })
          .eq("id", data.id);
      }
    }

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "media_album",
      entityId: data.id,
    });

    revalidatePath("/admin/media");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed.");
  }
}

export async function updateMediaAlbumAction(
  albumId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminSessionForCmsModule("media", [...CONTENT_EDIT_ROLES]);
    const parsed = parseAlbumForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    if (parsed.data.status === "published" && !canPublishContent(session)) {
      return fail("You do not have permission to publish albums.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getMediaAlbumById(albumId);
    if (!existing) return fail("Album not found.");

    let coverPath = existing.cover_image_path;
    const cover = formData.get("cover");

    if (parsed.data.removeCover && existing.cover_image_path) {
      await removeStorageObjects(admin, [existing.cover_image_path]);
      coverPath = null;
    }

    if (cover instanceof File && cover.size > 0) {
      if (existing.cover_image_path) {
        await removeStorageObjects(admin, [existing.cover_image_path]);
      }
      const upload = await uploadMediaCover(admin, albumId, cover);
      if (!upload.success) return upload;
      coverPath = upload.data;
    }

    const { error } = await admin
      .from(Tables.mediaAlbums)
      .update({
        ...toAlbumRow(parsed.data, session.userId),
        cover_image_path: coverPath,
      })
      .eq("id", albumId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "media_album",
      entityId: albumId,
    });

    revalidatePath("/admin/media");
    revalidatePath(`/admin/media/${albumId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}

export async function deleteMediaAlbumAction(albumId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminSessionForCmsModule("media", [...CONTENT_EDIT_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await getMediaAlbumById(albumId);
    if (!existing) return fail("Album not found.");

    const items = await listMediaItemsForAlbum(albumId);
    const paths = [
      ...(existing.cover_image_path ? [existing.cover_image_path] : []),
      ...items.map((i) => i.storage_path),
      ...items.map((i) => i.thumbnail_path).filter(Boolean) as string[],
    ];
    if (paths.length) await removeStorageObjects(admin, paths);

    const { error } = await admin.from(Tables.mediaAlbums).delete().eq("id", albumId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "media_album",
      entityId: albumId,
    });

    revalidatePath("/admin/media");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed.");
  }
}

export async function addMediaItemAction(
  albumId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminSessionForCmsModule("media", [...CONTENT_EDIT_ROLES]);
    const parsed = parseItemForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const file = formData.get("mediaFile");
    if (!(file instanceof File) || file.size === 0) return fail("Media file is required.");

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const mediaType =
      parsed.data.mediaType ??
      (file.type.startsWith("video/") ? "video" : "image");

    const { data, error } = await admin
      .from(Tables.mediaItems)
      .insert({
        album_id: albumId,
        title_en: parsed.data.titleEn || null,
        title_hi: parsed.data.titleHi || null,
        caption_en: parsed.data.captionEn || null,
        caption_hi: parsed.data.captionHi || null,
        media_type: mediaType,
        storage_path: "pending",
        sort_order: parsed.data.sortOrder,
      })
      .select("id")
      .single();
    if (error) return fail(error.message);

    const upload = await uploadMediaItemFile(admin, albumId, data.id, file);
    if (!upload.success) {
      await admin.from(Tables.mediaItems).delete().eq("id", data.id);
      return upload;
    }

    await admin
      .from(Tables.mediaItems)
      .update({ storage_path: upload.data })
      .eq("id", data.id);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "media_item",
      entityId: data.id,
      details: { albumId },
    });

    revalidatePath(`/admin/media/${albumId}`);
    revalidatePath("/admin/media");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Add item failed.");
  }
}

export async function deleteMediaItemAction(
  itemId: string,
  albumId: string,
): Promise<ActionResult> {
  try {
    const session = await requireAdminSessionForCmsModule("media", [...CONTENT_EDIT_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: item } = await admin
      .from(Tables.mediaItems)
      .select("*")
      .eq("id", itemId)
      .maybeSingle();
    if (!item) return fail("Media item not found.");

    const paths = [item.storage_path, item.thumbnail_path].filter(
      (p): p is string => Boolean(p) && p !== "pending",
    );
    if (paths.length) await removeStorageObjects(admin, paths);

    const { error } = await admin.from(Tables.mediaItems).delete().eq("id", itemId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "media_item",
      entityId: itemId,
      details: { albumId },
    });

    revalidatePath(`/admin/media/${albumId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed.");
  }
}
