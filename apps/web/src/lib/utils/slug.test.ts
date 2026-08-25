import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/utils/slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("College of Agriculture")).toBe("college-of-agriculture");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("  PG Studies — Gallery!! ")).toBe("pg-studies-gallery");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});
