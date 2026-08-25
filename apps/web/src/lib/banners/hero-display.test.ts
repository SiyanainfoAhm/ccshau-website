import { describe, expect, it } from "vitest";

import {
  heroBannerSubtitle,
  heroBannerTitle,
  isGenericHeroBannerLabel,
  normalizeBannerLabel,
} from "@/lib/banners/hero-display";

describe("hero-display", () => {
  it("normalizes whitespace", () => {
    expect(normalizeBannerLabel("  CCS   HAU  ")).toBe("CCS HAU");
  });

  it("treats university name labels as generic", () => {
    expect(isGenericHeroBannerLabel("CCS HAU")).toBe(true);
    expect(isGenericHeroBannerLabel("CCSHAU Hisar")).toBe(true);
    expect(isGenericHeroBannerLabel("logo campus gate")).toBe(true);
    expect(isGenericHeroBannerLabel("Degree Programmes")).toBe(false);
  });

  it("hides generic hero titles", () => {
    expect(heroBannerTitle("CCS HAU")).toBeNull();
    expect(heroBannerTitle("Welcome to PG Studies")).toBe(
      "Welcome to PG Studies",
    );
  });

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
