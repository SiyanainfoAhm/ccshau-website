import type { SupabaseClient } from "@supabase/supabase-js";

import type { AttachmentPath } from "@/lib/database/types";
import {
  bannerImagePath,
  circularFilePath,
  corrigendumAttachmentPath,
  downloadFilePath,
  downloadVersionPath,
  facultyImagePath,
  getMediaBucket,
  getStorageBucket,
  homepageDignitaryImagePath,
  homepageInitiativeImagePath,
  mediaAlbumCoverPath,
  mediaItemPath,
  pageGalleryImagePath,
  pageFeaturedImagePath,
  pageLogoImagePath,
  pageHeadImagePath,
  pageNewsTickerFilePath,
  pageStudentCornerFilePath,
  newsAttachmentPath,
  STORAGE_BUCKETS,
  tenderAttachmentPath,
  tenderCancellationPath,
} from "@/lib/storage/config";
import {
  prepareValidatedMediaUpload,
  prepareValidatedUpload,
  sanitizeFileName,
} from "@/lib/storage/validate";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";

export function getPublicFileUrl(bucket: string, path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function getStoredFileUrl(storedPath: string): string | null {
  if (storedPath.startsWith("https://") || storedPath.startsWith("http://")) {
    return storedPath;
  }
  const slash = storedPath.indexOf("/");
  if (slash === -1) return null;
  return getPublicFileUrl(storedPath.slice(0, slash), storedPath.slice(slash + 1));
}

export async function uploadNewsAttachments(
  admin: SupabaseClient,
  newsId: string,
  files: File[],
  isPublished: boolean,
): Promise<ActionResult<AttachmentPath[]>> {
  const uploaded: AttachmentPath[] = [];
  const bucket = getStorageBucket(isPublished);

  for (const file of files) {
    const prepared = await prepareValidatedUpload(file);
    if (!prepared.ok) return fail(prepared.error);

    const path = newsAttachmentPath(newsId, sanitizeFileName(file.name));
    const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) return fail(`Upload failed for ${file.name}: ${error.message}`);

    uploaded.push({ path: `${bucket}/${path}`, name: file.name, size: file.size });
  }

  return ok(uploaded);
}

async function uploadFilesToStorage(
  admin: SupabaseClient,
  bucket: string,
  files: File[],
  pathForFile: (file: File) => string,
): Promise<ActionResult<AttachmentPath[]>> {
  const uploaded: AttachmentPath[] = [];

  for (const file of files) {
    const prepared = await prepareValidatedUpload(file);
    if (!prepared.ok) return fail(prepared.error);

    const path = pathForFile(file);
    const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) return fail(`Upload failed for ${file.name}: ${error.message}`);

    uploaded.push({ path: `${bucket}/${path}`, name: file.name, size: file.size });
  }

  return ok(uploaded);
}

export async function uploadTenderDocuments(
  admin: SupabaseClient,
  tenderId: string,
  files: File[],
  isPublic: boolean,
): Promise<ActionResult<AttachmentPath[]>> {
  const bucket = getStorageBucket(isPublic);
  return uploadFilesToStorage(admin, bucket, files, (file) =>
    tenderAttachmentPath(tenderId, sanitizeFileName(file.name)),
  );
}

export async function uploadCorrigendumDocument(
  admin: SupabaseClient,
  tenderId: string,
  corrigendumId: string,
  file: File,
  isPublic: boolean,
): Promise<ActionResult<AttachmentPath>> {
  const bucket = getStorageBucket(isPublic);
  const result = await uploadFilesToStorage(admin, bucket, [file], (f) =>
    corrigendumAttachmentPath(tenderId, corrigendumId, sanitizeFileName(f.name)),
  );
  if (!result.success) return result;
  const first = result.data[0];
  if (!first) return fail("Upload failed");
  return ok(first);
}

export async function uploadTenderCancellationDocument(
  admin: SupabaseClient,
  tenderId: string,
  file: File,
  isPublic: boolean,
): Promise<ActionResult<AttachmentPath>> {
  const bucket = getStorageBucket(isPublic);
  const result = await uploadFilesToStorage(admin, bucket, [file], (f) =>
    tenderCancellationPath(tenderId, sanitizeFileName(f.name)),
  );
  if (!result.success) return result;
  const first = result.data[0];
  if (!first) return fail("Upload failed");
  return ok(first);
}

export async function removeStorageObjects(
  admin: SupabaseClient,
  attachmentPaths: string[],
): Promise<void> {
  const byBucket = new Map<string, string[]>();

  for (const fullPath of attachmentPaths) {
    // External video URLs are stored as absolute http(s) values — not storage paths.
    if (fullPath.startsWith("http://") || fullPath.startsWith("https://")) continue;
    if (fullPath === "pending") continue;
    const slash = fullPath.indexOf("/");
    if (slash === -1) continue;
    const bucket = fullPath.slice(0, slash);
    const path = fullPath.slice(slash + 1);
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket)!.push(path);
  }

  for (const [bucket, paths] of byBucket) {
    await admin.storage.from(bucket).remove(paths);
  }
}

export async function uploadBannerImage(
  admin: SupabaseClient,
  bannerId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Banner must be an image file.");

  const bucket = STORAGE_BUCKETS.public;
  const path = bannerImagePath(bannerId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadHomepageDignitaryImage(
  admin: SupabaseClient,
  dignitaryId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Photo must be an image file.");

  const bucket = STORAGE_BUCKETS.public;
  const path = homepageDignitaryImagePath(dignitaryId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadFacultyImage(
  admin: SupabaseClient,
  staffId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Photo must be an image file.");

  const bucket = STORAGE_BUCKETS.public;
  const path = facultyImagePath(staffId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadHomepageInitiativeImage(
  admin: SupabaseClient,
  initiativeId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Banner must be an image file.");

  const bucket = STORAGE_BUCKETS.public;
  const path = homepageInitiativeImagePath(initiativeId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadPageFeaturedImage(
  admin: SupabaseClient,
  pageId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Hero banner must be an image file.");

  const bucket = STORAGE_BUCKETS.public;
  const path = pageFeaturedImagePath(pageId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadPageLogoImage(
  admin: SupabaseClient,
  pageId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Logo must be an image file.");

  const bucket = STORAGE_BUCKETS.public;
  const path = pageLogoImagePath(pageId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadPageHeadImage(
  admin: SupabaseClient,
  pageId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Head officer photo must be an image file.");

  const bucket = STORAGE_BUCKETS.public;
  const path = pageHeadImagePath(pageId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadPageGalleryImage(
  admin: SupabaseClient,
  pageId: string,
  file: File,
  itemId?: string,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!file.type.startsWith("image/")) return fail("Gallery file must be an image.");

  const bucket = STORAGE_BUCKETS.public;
  const id = itemId ?? crypto.randomUUID();
  const path = pageGalleryImagePath(pageId, id, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadPageNewsTickerFile(
  admin: SupabaseClient,
  pageId: string,
  itemId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);

  const bucket = STORAGE_BUCKETS.public;
  const path = pageNewsTickerFilePath(pageId, itemId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadPageStudentCornerFile(
  admin: SupabaseClient,
  pageId: string,
  itemId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);

  const bucket = STORAGE_BUCKETS.public;
  const path = pageStudentCornerFilePath(pageId, itemId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(path, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${path}`);
}

export async function uploadSingleDocument(
  admin: SupabaseClient,
  file: File,
  bucket: string,
  storagePath: string,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);

  const { error } = await admin.storage.from(bucket).upload(storagePath, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${storagePath}`);
}

export async function uploadCircularFile(
  admin: SupabaseClient,
  circularId: string,
  file: File,
  isPublished: boolean,
): Promise<ActionResult<string>> {
  const bucket = getStorageBucket(isPublished);
  return uploadSingleDocument(
    admin,
    file,
    bucket,
    circularFilePath(circularId, sanitizeFileName(file.name)),
  );
}

export async function uploadDownloadFile(
  admin: SupabaseClient,
  downloadId: string,
  file: File,
  usePublicBucket: boolean,
): Promise<ActionResult<string>> {
  const bucket = getStorageBucket(usePublicBucket);
  return uploadSingleDocument(
    admin,
    file,
    bucket,
    downloadFilePath(downloadId, sanitizeFileName(file.name)),
  );
}

export async function uploadDownloadVersionFile(
  admin: SupabaseClient,
  downloadId: string,
  versionId: string,
  file: File,
  usePublicBucket: boolean,
): Promise<ActionResult<string>> {
  const bucket = getStorageBucket(usePublicBucket);
  return uploadSingleDocument(
    admin,
    file,
    bucket,
    downloadVersionPath(downloadId, versionId, sanitizeFileName(file.name)),
  );
}

export async function uploadMediaCover(
  admin: SupabaseClient,
  albumId: string,
  file: File,
): Promise<ActionResult<string>> {
  if (!file.type.startsWith("image/")) return fail("Cover must be an image.");
  const bucket = getMediaBucket();
  return uploadSingleDocument(
    admin,
    file,
    bucket,
    mediaAlbumCoverPath(albumId, sanitizeFileName(file.name)),
  );
}

export async function uploadMediaItemFile(
  admin: SupabaseClient,
  albumId: string,
  itemId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = getMediaBucket();
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) return fail("Media must be an image or video file.");

  const prepared = await prepareValidatedMediaUpload(file);
  if (!prepared.ok) return fail(prepared.error);

  const storagePath = mediaItemPath(albumId, itemId, sanitizeFileName(file.name));
  const { error } = await admin.storage.from(bucket).upload(storagePath, prepared.buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return fail(`Upload failed: ${error.message}`);
  return ok(`${bucket}/${storagePath}`);
}
