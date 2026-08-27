/**
 * Tests for `@/lib/utils/slug`.
 * Covers slugify lowercasing, punctuation stripping, and empty-input handling.
 */

import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/utils/slug";

// Suite: slugify.
describe("slugify", () => {
  // Spaces become hyphens; letters are lowercased.
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("College of Agriculture")).toBe("college-of-agriculture");
  });

  // Punctuation stripped; separators collapsed to single hyphens.
  it("strips punctuation and collapses separators", () => {
    expect(slugify("  PG Studies — Gallery!! ")).toBe("pg-studies-gallery");
  });

  // Leading/trailing hyphens are trimmed.
  it("trims leading and trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello");
  });

  // Empty or whitespace-only input yields empty string.
  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});
