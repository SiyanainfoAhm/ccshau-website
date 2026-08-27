import { describe, expect, it } from "vitest";

import {
  downloadFormSchema,
  formatDownloadCategory,
  parseDownloadTags,
} from "@/lib/validations/downloads";

describe("downloads validation", () => {
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

  it("parses tags and formats categories", () => {
    expect(parseDownloadTags(" Forms, PDF , forms ")).toEqual(["forms", "pdf"]);
    expect(parseDownloadTags("")).toEqual([]);
    expect(formatDownloadCategory("forms")).toBe("Forms");
    expect(formatDownloadCategory(null)).toBe("—");
  });
});
