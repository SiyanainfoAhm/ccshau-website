/**
 * Tests for `@/lib/i18n/pick-bilingual`.
 * Covers English/Hindi preference and empty-string fallbacks.
 */

import { describe, expect, it } from "vitest";

import { pickBilingual } from "@/lib/i18n/pick-bilingual";

// Suite: pickBilingual language selection.
describe("pickBilingual", () => {
  // Hindi is preferred when lang is hi.
  it("prefers hindi when lang is hi", () => {
    expect(pickBilingual("hi", "About", "के बारे में")).toBe("के बारे में");
  });

  // Empty or null Hindi falls back to English.
  it("falls back to english when hindi is empty", () => {
    expect(pickBilingual("hi", "About", "  ")).toBe("About");
    expect(pickBilingual("hi", "About", null)).toBe("About");
  });

  // English is preferred when lang is en.
  it("prefers english when lang is en", () => {
    expect(pickBilingual("en", "About", "के बारे में")).toBe("About");
  });

  // Empty English falls back to Hindi.
  it("falls back to hindi when english is empty", () => {
    expect(pickBilingual("en", "", "के बारे में")).toBe("के बारे में");
  });

  // Both missing yields an empty string.
  it("returns empty string when both missing", () => {
    expect(pickBilingual("en", null, undefined)).toBe("");
  });
});
