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

describe("storage path builders", () => {
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
