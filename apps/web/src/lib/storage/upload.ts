import "server-only";

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
  homepageQuoteImagePath,
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

export { getPublicFileUrl, getStoredFileUrl, resolvePublicMediaUrl } from "@/lib/storage/urls";

/** @deprecated Supabase client is unused — uploads go to Azure Blob Storage. Kept for call-site compatibility. */
type UnusedAdmin = SupabaseClient;

async function putBlob(
  container: string,
  blobPath: string,
  buffer: Buffer,
  contentType: string,
  fileLabel: string,
): Promise<ActionResult<string>> {
  try {
    const { uploadAzureBlob } = await import("@/lib/storage/azure");
    await uploadAzureBlob(container, blobPath, buffer, contentType);
    return ok(`${container}/${blobPath}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown upload error";
    return fail(`Upload failed for ${fileLabel}: ${message}`);
  }
}

async function uploadFilesToStorage(
  _admin: UnusedAdmin,
  container: string,
  files: File[],
  pathForFile: (file: File) => string,
): Promise<ActionResult<AttachmentPath[]>> {
  const uploaded: AttachmentPath[] = [];

  for (const file of files) {
    const prepared = await prepareValidatedUpload(file);
    if (!prepared.ok) return fail(prepared.error);

    const path = pathForFile(file);
    const result = await putBlob(container, path, prepared.buffer, prepared.contentType, file.name);
    if (!result.success) return result;

    uploaded.push({ path: result.data, name: file.name, size: file.size });
  }

  return ok(uploaded);
}

export async function uploadNewsAttachments(
  admin: UnusedAdmin,
  newsId: string,
  files: File[],
  isPublished: boolean,
): Promise<ActionResult<AttachmentPath[]>> {
  const bucket = getStorageBucket(isPublished);
  return uploadFilesToStorage(admin, bucket, files, (file) =>
    newsAttachmentPath(newsId, sanitizeFileName(file.name)),
  );
}

export async function uploadTenderDocuments(
  admin: UnusedAdmin,
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
  admin: UnusedAdmin,
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
  admin: UnusedAdmin,
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
  _admin: UnusedAdmin,
  attachmentPaths: string[],
): Promise<void> {
  const byContainer = new Map<string, string[]>();

  for (const fullPath of attachmentPaths) {
    if (fullPath.startsWith("http://") || fullPath.startsWith("https://")) continue;
    if (fullPath === "pending") continue;
    const slash = fullPath.indexOf("/");
    if (slash === -1) continue;
    const container = fullPath.slice(0, slash);
    const path = fullPath.slice(slash + 1);
    if (!byContainer.has(container)) byContainer.set(container, []);
    byContainer.get(container)!.push(path);
  }

  for (const [container, paths] of byContainer) {
    const { deleteAzureBlobs } = await import("@/lib/storage/azure");
    const single =
      process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
      process.env.AZURE_STORAGE_CONTAINER?.trim();
    const target =
      single &&
      (container === "ccshau-public" ||
        container === "ccshau-private" ||
        container === "ccshau-media")
        ? single
        : container;
    await deleteAzureBlobs(target, paths);
  }
}

async function uploadValidatedImage(
  file: File,
  container: string,
  blobPath: string,
  notImageMessage: string,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!prepared.contentType.startsWith("image/")) return fail(notImageMessage);
  return putBlob(container, blobPath, prepared.buffer, prepared.contentType, file.name);
}

export async function uploadBannerImage(
  _admin: UnusedAdmin,
  bannerId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = bannerImagePath(bannerId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Banner must be an image file.");
}

export async function uploadHomepageDignitaryImage(
  _admin: UnusedAdmin,
  dignitaryId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = homepageDignitaryImagePath(dignitaryId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Photo must be an image file.");
}

export async function uploadFacultyImage(
  _admin: UnusedAdmin,
  staffId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = facultyImagePath(staffId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Photo must be an image file.");
}

export async function uploadHomepageInitiativeImage(
  _admin: UnusedAdmin,
  initiativeId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = homepageInitiativeImagePath(initiativeId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Banner must be an image file.");
}

export async function uploadHomepageQuoteImage(
  _admin: UnusedAdmin,
  quoteId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = homepageQuoteImagePath(quoteId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Portrait must be an image file.");
}

export async function uploadPageFeaturedImage(
  _admin: UnusedAdmin,
  pageId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = pageFeaturedImagePath(pageId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Hero banner must be an image file.");
}

export async function uploadPageLogoImage(
  _admin: UnusedAdmin,
  pageId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = pageLogoImagePath(pageId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Logo must be an image file.");
}

export async function uploadPageHeadImage(
  _admin: UnusedAdmin,
  pageId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = STORAGE_BUCKETS.public;
  const path = pageHeadImagePath(pageId, sanitizeFileName(file.name));
  return uploadValidatedImage(file, bucket, path, "Head officer photo must be an image file.");
}

export async function uploadPageGalleryImage(
  _admin: UnusedAdmin,
  pageId: string,
  file: File,
  itemId?: string,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!prepared.contentType.startsWith("image/")) return fail("Gallery file must be an image.");

  const bucket = STORAGE_BUCKETS.public;
  const id = itemId ?? crypto.randomUUID();
  const path = pageGalleryImagePath(pageId, id, sanitizeFileName(file.name));
  return putBlob(bucket, path, prepared.buffer, prepared.contentType, file.name);
}

export async function uploadPageNewsTickerFile(
  _admin: UnusedAdmin,
  pageId: string,
  itemId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);

  const bucket = STORAGE_BUCKETS.public;
  const path = pageNewsTickerFilePath(pageId, itemId, sanitizeFileName(file.name));
  return putBlob(bucket, path, prepared.buffer, prepared.contentType, file.name);
}

export async function uploadPageStudentCornerFile(
  _admin: UnusedAdmin,
  pageId: string,
  itemId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);

  const bucket = STORAGE_BUCKETS.public;
  const path = pageStudentCornerFilePath(pageId, itemId, sanitizeFileName(file.name));
  return putBlob(bucket, path, prepared.buffer, prepared.contentType, file.name);
}

export async function uploadSingleDocument(
  _admin: UnusedAdmin,
  file: File,
  bucket: string,
  storagePath: string,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  return putBlob(bucket, storagePath, prepared.buffer, prepared.contentType, file.name);
}

export async function uploadCircularFile(
  admin: UnusedAdmin,
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
  admin: UnusedAdmin,
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
  admin: UnusedAdmin,
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
  _admin: UnusedAdmin,
  albumId: string,
  file: File,
): Promise<ActionResult<string>> {
  const prepared = await prepareValidatedUpload(file);
  if (!prepared.ok) return fail(prepared.error);
  if (!prepared.contentType.startsWith("image/")) return fail("Cover must be an image.");

  const bucket = getMediaBucket();
  const path = mediaAlbumCoverPath(albumId, sanitizeFileName(file.name));
  return putBlob(bucket, path, prepared.buffer, prepared.contentType, file.name);
}

export async function uploadMediaItemFile(
  _admin: UnusedAdmin,
  albumId: string,
  itemId: string,
  file: File,
): Promise<ActionResult<string>> {
  const bucket = getMediaBucket();
  const prepared = await prepareValidatedMediaUpload(file);
  if (!prepared.ok) return fail(prepared.error);

  const isVideo = prepared.contentType.startsWith("video/");
  const isImage = prepared.contentType.startsWith("image/");
  if (!isVideo && !isImage) return fail("Media must be an image or video file.");

  const storagePath = mediaItemPath(albumId, itemId, sanitizeFileName(file.name));
  return putBlob(bucket, storagePath, prepared.buffer, prepared.contentType, file.name);
}
