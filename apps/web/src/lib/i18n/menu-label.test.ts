/**
 * Tests for `@/lib/i18n/menu-label`.
 * Covers upper/title casing for English nav labels and leaving Hindi unchanged.
 */

import { describe, expect, it } from "vitest";

import {
  formatMenuLabel,
  toTitleMenuLabel,
  toUpperMenuLabel,
} from "@/lib/i18n/menu-label";

// Suite: menu label formatting helpers.
describe("menu-label", () => {
  // English nav labels are uppercased.
  it("uppercases English nav labels", () => {
    expect(toUpperMenuLabel("administration")).toBe("ADMINISTRATION");
  });

  // Title case keeps small words lowercase and preserves known acronyms.
  it("title-cases submenu labels and keeps small words lowercase", () => {
    expect(toTitleMenuLabel("Directorate Of Research")).toBe(
      "Directorate of Research",
    );
    expect(toTitleMenuLabel("CCS HAU Hisar")).toMatch(/CCS/);
  });

  // Hindi labels pass through; English still formats by mode.
  it("leaves Hindi unchanged", () => {
    expect(formatMenuLabel("प्रशासन", "hi", "upper")).toBe("प्रशासन");
    expect(formatMenuLabel("home", "en", "upper")).toBe("HOME");
    expect(formatMenuLabel("about us", "en", "title")).toBe("About Us");
  });
});
