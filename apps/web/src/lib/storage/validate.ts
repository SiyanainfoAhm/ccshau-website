const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const DOC_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_UPLOAD_MIME = [...IMAGE_MIME, ...DOC_MIME] as const;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 25 * 1024 * 1024;

export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_UPLOAD_MIME.includes(file.type as (typeof ALLOWED_UPLOAD_MIME)[number])) {
    return `File type not allowed: ${file.type || "unknown"}`;
  }

  const max = file.type.startsWith("image/") ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (file.size > max) {
    return `File too large: ${file.name} (max ${Math.round(max / 1024 / 1024)} MB)`;
  }

  return null;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}
