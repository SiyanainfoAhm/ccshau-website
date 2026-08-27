/**
 * Tests for `@/lib/storage/config` path builders.
 * Covers deterministic blob keys and filename sanitization in path segments.
 */

import { describe, expect, it } from "vitest";

import {
  bannerImagePath,
  corrigendumAttachmentPath,
  downloadFilePath,
  facultyImagePath,
  mediaAlbumCoverPath,
  newsAttachmentPath,
  tenderAttachmentPath,
} from "@/lib/storage/config";

// Suite: storage path builders.
describe("storage path builders", () => {
  // Builds expected blob keys and sanitizes unsafe filename characters.
  it("builds deterministic blob keys and sanitizes filenames", () => {
    expect(newsAttachmentPath("n1", "Report (1).pdf")).toBe(
      "news/n1/Report__1_.pdf",
    );
    expect(tenderAttachmentPath("t1", "doc.pdf")).toBe("tenders/t1/doc.pdf");
    expect(corrigendumAttachmentPath("t1", "c1", "fix.pdf")).toBe(
      "tenders/t1/corrigenda/c1/fix.pdf",
    );
    expect(bannerImagePath("b1", "hero.png")).toBe("banners/b1/hero.png");
    expect(facultyImagePath("f1", "photo.jpg")).toBe("faculty/f1/photo.jpg");
    expect(downloadFilePath("d1", "form.pdf")).toBe("downloads/d1/form.pdf");
    expect(mediaAlbumCoverPath("a1", "cover.jpg")).toBe(
      "albums/a1/cover/cover.jpg",
    );
  });
});
