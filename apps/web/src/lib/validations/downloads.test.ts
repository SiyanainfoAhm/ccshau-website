/**
 * Vitest coverage for downloadFormSchema plus parseDownloadTags and
 * formatDownloadCategory helpers.
 */
import { describe, expect, it } from "vitest";

import {
  downloadFormSchema,
  formatDownloadCategory,
  parseDownloadTags,
} from "@/lib/validations/downloads";

// Suite: download form and tag/category helpers.
describe("downloads validation", () => {
  // Accepts titled download; rejects empty titleEn.
  it("validates download form payload", () => {
    expect(
      downloadFormSchema.safeParse({
        titleEn: "Admission Form",
        category: "forms",
        status: "published",
      }).success,
    ).toBe(true);
    expect(
      downloadFormSchema.safeParse({
        titleEn: "",
        status: "draft",
      }).success,
    ).toBe(false);
  });

  // Dedupes/lowercases tags; formats category or em dash for null.
  it("parses tags and formats categories", () => {
    expect(parseDownloadTags(" Forms, PDF , forms ")).toEqual(["forms", "pdf"]);
    expect(parseDownloadTags("")).toEqual([]);
    expect(formatDownloadCategory("forms")).toBe("Forms");
    expect(formatDownloadCategory(null)).toBe("—");
  });
});
