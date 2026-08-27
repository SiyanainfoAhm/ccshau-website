import { describe, expect, it } from "vitest";

import {
  assertUploadMagicBytes,
  sanitizeFileName,
  sniffUploadMime,
  validateMediaUploadFile,
  validateUploadFile,
} from "@/lib/storage/validate";

function fakeFile(
  name: string,
  type: string,
  size: number,
): File {
  const file = {
    name,
    type,
    size,
  } as File;
  return file;
}

describe("sniffUploadMime", () => {
  it("detects common image and document magic bytes", () => {
    expect(sniffUploadMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffUploadMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
    expect(sniffUploadMime(Buffer.from("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffUploadMime(Buffer.from("xxxx"))).toBeNull();
    expect(sniffUploadMime(Buffer.from([0x01]))).toBeNull();
  });

  it("detects ZIP and OLE containers", () => {
    expect(sniffUploadMime(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(
      "application/zip",
    );
    expect(sniffUploadMime(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))).toBe(
      "application/x-ole-storage",
    );
  });
});

describe("validateUploadFile", () => {
  it("accepts allowed types under size limits", () => {
    expect(
      validateUploadFile(fakeFile("photo.jpg", "image/jpeg", 1024)),
    ).toBeNull();
    expect(
      validateUploadFile(fakeFile("doc.pdf", "application/pdf", 1024)),
    ).toBeNull();
  });

  it("rejects disallowed types and oversized files", () => {
    expect(
      validateUploadFile(fakeFile("x.exe", "application/octet-stream", 10)),
    ).toMatch(/not allowed/i);
    expect(
      validateUploadFile(
        fakeFile("huge.jpg", "image/jpeg", 6 * 1024 * 1024),
      ),
    ).toMatch(/too large/i);
  });
});

describe("validateMediaUploadFile", () => {
  it("allows video types within media limits", () => {
    expect(
      validateMediaUploadFile(fakeFile("clip.mp4", "video/mp4", 1024)),
    ).toBeNull();
    expect(
      validateMediaUploadFile(fakeFile("doc.pdf", "application/pdf", 1024)),
    ).toMatch(/not allowed/i);
  });
});

describe("assertUploadMagicBytes", () => {
  it("rejects mismatched content vs declared type", () => {
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(
      assertUploadMagicBytes(fakeFile("a.jpg", "image/jpeg", jpegBytes.length), jpegBytes),
    ).toBeNull();

    const pdfBytes = Buffer.from("%PDF-1.4\n");
    expect(
      assertUploadMagicBytes(
        fakeFile("fake.jpg", "image/jpeg", pdfBytes.length),
        pdfBytes,
      ),
    ).toMatch(/does not match/i);
  });

  it("allows JPEG bytes claimed as PNG (image quirk)", () => {
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(
      assertUploadMagicBytes(
        fakeFile("quirky.png", "image/png", jpegBytes.length),
        jpegBytes,
      ),
    ).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("strips unsafe characters", () => {
    expect(sanitizeFileName("My Report (final).pdf")).toBe(
      "My_Report_final_.pdf",
    );
    expect(sanitizeFileName("a___b.txt")).toBe("a_b.txt");
  });
});
