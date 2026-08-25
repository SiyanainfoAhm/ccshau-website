import { describe, expect, it } from "vitest";

import { pickBilingual } from "@/lib/i18n/pick-bilingual";

describe("pickBilingual", () => {
  it("prefers hindi when lang is hi", () => {
    expect(pickBilingual("hi", "About", "के बारे में")).toBe("के बारे में");
  });

  it("falls back to english when hindi is empty", () => {
    expect(pickBilingual("hi", "About", "  ")).toBe("About");
    expect(pickBilingual("hi", "About", null)).toBe("About");
  });

  it("prefers english when lang is en", () => {
    expect(pickBilingual("en", "About", "के बारे में")).toBe("About");
  });

  it("falls back to hindi when english is empty", () => {
    expect(pickBilingual("en", "", "के बारे में")).toBe("के बारे में");
  });

  it("returns empty string when both missing", () => {
    expect(pickBilingual("en", null, undefined)).toBe("");
  });
});
