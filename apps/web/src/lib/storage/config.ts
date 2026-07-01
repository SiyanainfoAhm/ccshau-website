export const STORAGE_BUCKETS = {
  public: process.env.NEXT_PUBLIC_STORAGE_BUCKET_PUBLIC ?? "ccshau-public",
  private: process.env.STORAGE_BUCKET_PRIVATE ?? "ccshau-private",
  media: process.env.NEXT_PUBLIC_STORAGE_BUCKET_MEDIA ?? "ccshau-media",
} as const;

export function newsAttachmentPath(newsId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `news/${newsId}/${safe}`;
}

export function tenderAttachmentPath(tenderId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `tenders/${tenderId}/${safe}`;
}

export function corrigendumAttachmentPath(
  tenderId: string,
  corrigendumId: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `tenders/${tenderId}/corrigenda/${corrigendumId}/${safe}`;
}

export function bannerImagePath(bannerId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `banners/${bannerId}/${safe}`;
}

export function homepageDignitaryImagePath(dignitaryId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `homepage/dignitaries/${dignitaryId}/${safe}`;
}

export function homepageInitiativeImagePath(initiativeId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `homepage/initiatives/${initiativeId}/${safe}`;
}

export function circularFilePath(circularId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `circulars/${circularId}/${safe}`;
}

export function downloadFilePath(downloadId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `downloads/${downloadId}/${safe}`;
}

export function mediaAlbumCoverPath(albumId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `albums/${albumId}/cover/${safe}`;
}

export function mediaItemPath(albumId: string, itemId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `albums/${albumId}/items/${itemId}/${safe}`;
}

export function getMediaBucket(): string {
  return STORAGE_BUCKETS.media;
}

export function getStorageBucket(isPublished: boolean): string {
  return isPublished ? STORAGE_BUCKETS.public : STORAGE_BUCKETS.private;
}
