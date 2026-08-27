/**
 * Vitest coverage for newsFormSchema: minimal notice shape, title/slug rules,
 * notice types, featured/pinned coercion, and unknown-type rejection.
 */
import { describe, expect, it } from "vitest";

import { newsFormSchema } from "@/lib/validations/news";

const baseNews = {
  titleEn: "Admission Notice",
  slug: "admission-notice",
  noticeType: "notice" as const,
  status: "draft" as const,
};

// Suite: news/notice admin form validation.
describe("newsFormSchema", () => {
  // Accepts minimal draft notice payload.
  it("accepts a minimal valid news item", () => {
    expect(newsFormSchema.safeParse(baseNews).success).toBe(true);
  });

  // Rejects empty titleEn and uppercase/invalid slug.
  it("requires english title and valid slug", () => {
    expect(newsFormSchema.safeParse({ ...baseNews, titleEn: "" }).success).toBe(
      false,
    );
    expect(
      newsFormSchema.safeParse({ ...baseNews, slug: "UPPER" }).success,
    ).toBe(false);
  });

  // Accepts noticeType news and coerces string flags to booleans.
  it("accepts notice types and coerces featured flags", () => {
    const result = newsFormSchema.safeParse({
      ...baseNews,
      noticeType: "news",
      isFeatured: "true",
      isPinned: "1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFeatured).toBe(true);
      expect(result.data.isPinned).toBe(true);
    }
  });

  // Rejects noticeType outside allowed enum.
  it("rejects unknown notice type", () => {
    expect(
      newsFormSchema.safeParse({ ...baseNews, noticeType: "blog" }).success,
    ).toBe(false);
  });
});
