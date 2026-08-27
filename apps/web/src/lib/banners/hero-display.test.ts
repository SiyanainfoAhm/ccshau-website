/**
 * Tests for `@/lib/banners/hero-display`.
 * Covers banner label normalization and when hero title/subtitle are shown or hidden.
 */

import { describe, expect, it } from "vitest";

import {
  heroBannerSubtitle,
  heroBannerTitle,
  isGenericHeroBannerLabel,
  normalizeBannerLabel,
} from "@/lib/banners/hero-display";

// Suite: hero banner label display rules.
describe("hero-display", () => {
  // Collapses extra whitespace in banner labels.
  it("normalizes whitespace", () => {
    expect(normalizeBannerLabel("  CCS   HAU  ")).toBe("CCS HAU");
  });

  // University-name and logo-like labels count as generic.
  it("treats university name labels as generic", () => {
    expect(isGenericHeroBannerLabel("CCS HAU")).toBe(true);
    expect(isGenericHeroBannerLabel("CCSHAU Hisar")).toBe(true);
    expect(isGenericHeroBannerLabel("logo campus gate")).toBe(true);
    expect(isGenericHeroBannerLabel("Degree Programmes")).toBe(false);
  });

  // Generic titles are hidden; meaningful titles are kept.
  it("hides generic hero titles", () => {
    expect(heroBannerTitle("CCS HAU")).toBeNull();
    expect(heroBannerTitle("Welcome to PG Studies")).toBe(
      "Welcome to PG Studies",
    );
  });

  // Subtitle hidden when generic, duplicate of title, or title is generic.
  it("hides subtitle when it matches title or is generic", () => {
    expect(heroBannerSubtitle("CCS HAU", "Anything")).toBeNull();
    expect(
      heroBannerSubtitle("Welcome to PG Studies", "Welcome to PG Studies"),
    ).toBeNull();
    expect(heroBannerSubtitle("Inspiring Agripreneurs", "Campus Gate")).toBe(
      "Inspiring Agripreneurs",
    );
  });
});
