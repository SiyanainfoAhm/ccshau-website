/**
 * Smoke tests for the upload pipeline (validate -> path -> public URL).
 * Offline/unit-style smoke: no live Azure/server; stubs env for URL resolution.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bannerImagePath,
  newsAttachmentPath,
  pageFeaturedImagePath,
} from "@/lib/storage/config";
import {
  prepareValidatedMediaUpload,
  prepareValidatedUpload,
  sanitizeFileName,
} from "@/lib/storage/validate";
import { getStoredFileUrl, resolvePublicMediaUrl } from "@/lib/storage/urls";
import { STORAGE_BUCKETS } from "@/lib/storage/config";

function fileFromBytes(name: string, type: string, bytes: Buffer): File {
  return new File([bytes], name, { type });
}

/** Minimal JPEG (SOI + APP0 marker). */
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

const PDF = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

/** ISO BMFF ftyp box (MP4). */
const MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00,
  0x00, 0x00, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
]);

// Suite: upload pipeline smoke (offline).
describe("upload pipeline smoke", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // JPEG validates, gets a banner path, and resolves to a public blob URL.
  it("accepts JPEG through validate → path → public URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT", "ccshau");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_BASE_URL", "");

    const file = fileFromBytes("campus hero.jpg", "image/jpeg", JPEG);
    const prepared = await prepareValidatedUpload(file);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    expect(prepared.contentType).toBe("image/jpeg");
    expect(prepared.buffer.length).toBe(JPEG.length);

    const blobPath = bannerImagePath("banner-1", sanitizeFileName(file.name));
    expect(blobPath).toBe("banners/banner-1/campus_hero.jpg");

    const storedPath = `${STORAGE_BUCKETS.public}/${blobPath}`;
    const url = resolvePublicMediaUrl(storedPath);
    expect(url).toBe(
      `https://ccshau.blob.core.windows.net/${STORAGE_BUCKETS.public}/banners/banner-1/campus_hero.jpg`,
    );
    expect(getStoredFileUrl(storedPath)).toBe(url);
  });

  // PDF news attachment validates and resolves under /news/{id}/.
  it("accepts PDF news attachment end-to-end", async () => {
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT", "ccshau");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_BASE_URL", "");

    const file = fileFromBytes("notice.pdf", "application/pdf", PDF);
    const prepared = await prepareValidatedUpload(file);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    const blobPath = newsAttachmentPath("news-1", sanitizeFileName(file.name));
    const storedPath = `${STORAGE_BUCKETS.public}/${blobPath}`;
    expect(resolvePublicMediaUrl(storedPath)).toContain(
      "/news/news-1/notice.pdf",
    );
  });

  // Page featured image path is built after successful validation.
  it("accepts page featured image path after validation", async () => {
    const file = fileFromBytes("featured.jpg", "image/jpeg", JPEG);
    const prepared = await prepareValidatedUpload(file);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    expect(pageFeaturedImagePath("page-1", sanitizeFileName(file.name))).toBe(
      "pages/hero/page-1/featured/featured.jpg",
    );
  });

  // Executables and magic-byte mismatches fail before upload.
  it("rejects executable and magic-byte mismatches before upload", async () => {
    const exe = fileFromBytes(
      "malware.exe",
      "application/octet-stream",
      Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
    );
    const exeResult = await prepareValidatedUpload(exe);
    expect(exeResult.ok).toBe(false);
    if (!exeResult.ok) expect(exeResult.error).toMatch(/not allowed/i);

    const spoofed = fileFromBytes("fake.jpg", "image/jpeg", PDF);
    const spoofResult = await prepareValidatedUpload(spoofed);
    expect(spoofResult.ok).toBe(false);
    if (!spoofResult.ok) expect(spoofResult.error).toMatch(/does not match|verify/i);
  });

  // Media pipeline accepts MP4 and rejects PDF as media.
  it("accepts MP4 via media upload pipeline and rejects PDF as media", async () => {
    const video = fileFromBytes("clip.mp4", "video/mp4", MP4);
    const okVideo = await prepareValidatedMediaUpload(video);
    expect(okVideo.ok).toBe(true);
    if (okVideo.ok) expect(okVideo.contentType).toBe("video/mp4");

    const pdfAsMedia = fileFromBytes("doc.pdf", "application/pdf", PDF);
    const bad = await prepareValidatedMediaUpload(pdfAsMedia);
    expect(bad.ok).toBe(false);
  });
});
