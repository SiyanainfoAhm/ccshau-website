const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const DOC_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const ALLOWED_UPLOAD_MIME = [...IMAGE_MIME, ...DOC_MIME] as const;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 25 * 1024 * 1024;

type AllowedMime = (typeof ALLOWED_UPLOAD_MIME)[number];

/** Detect MIME from file magic bytes (not client-declared Content-Type). */
export function sniffUploadMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer.toString("ascii", 0, 4) === "GIF8") {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  // OLE Compound Document (legacy .doc / .xls)
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return "application/x-ole-storage";
  }
  // ZIP container (OOXML .docx / .xlsx and others)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    return "application/zip";
  }

  return null;
}

function mimeMatchesClaim(sniffed: string, claimed: string): boolean {
  if (sniffed === claimed) return true;

  if (sniffed === "application/zip") {
    return (
      claimed ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      claimed ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  if (sniffed === "application/x-ole-storage") {
    return claimed === "application/msword" || claimed === "application/vnd.ms-excel";
  }

  return false;
}

export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_UPLOAD_MIME.includes(file.type as AllowedMime)) {
    return `File type not allowed: ${file.type || "unknown"}`;
  }

  const max = file.type.startsWith("image/") ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (file.size > max) {
    return `File too large: ${file.name} (max ${Math.round(max / 1024 / 1024)} MB)`;
  }

  return null;
}

/** Reject uploads whose content does not match the declared MIME type. */
export function assertUploadMagicBytes(file: File, buffer: Buffer): string | null {
  const sniffed = sniffUploadMime(buffer);
  if (!sniffed) {
    return `Could not verify file type from content: ${file.name}`;
  }
  if (!mimeMatchesClaim(sniffed, file.type)) {
    return `File content does not match declared type (${file.type || "unknown"}): ${file.name}`;
  }
  return null;
}

/**
 * Type/size allowlist + magic-byte sniff. Prefer this in upload paths so
 * callers always validate content after reading the buffer.
 */
export async function prepareValidatedUpload(
  file: File,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  const typeError = validateUploadFile(file);
  if (typeError) return { ok: false, error: typeError };

  const buffer = Buffer.from(await file.arrayBuffer());
  const magicError = assertUploadMagicBytes(file, buffer);
  if (magicError) return { ok: false, error: magicError };

  return { ok: true, buffer };
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}
