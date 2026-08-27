import { describe, expect, it } from "vitest";

import {
  formatMenuLabel,
  toTitleMenuLabel,
  toUpperMenuLabel,
} from "@/lib/i18n/menu-label";

describe("menu-label", () => {
  it("uppercases English nav labels", () => {
    expect(toUpperMenuLabel("administration")).toBe("ADMINISTRATION");
  });

  it("title-cases submenu labels and keeps small words lowercase", () => {
    expect(toTitleMenuLabel("Directorate Of Research")).toBe(
      "Directorate of Research",
    );
    expect(toTitleMenuLabel("CCS HAU Hisar")).toMatch(/CCS/);
  });

  it("leaves Hindi unchanged", () => {
    expect(formatMenuLabel("प्रशासन", "hi", "upper")).toBe("प्रशासन");
    expect(formatMenuLabel("home", "en", "upper")).toBe("HOME");
    expect(formatMenuLabel("about us", "en", "title")).toBe("About Us");
  });
});
