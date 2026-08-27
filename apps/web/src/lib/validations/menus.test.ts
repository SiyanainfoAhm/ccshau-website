/**
 * Vitest coverage for menu helpers: isValidMenuLocation and
 * menuItemFormSchema (English label requirement).
 */
import { describe, expect, it } from "vitest";

import {
  isValidMenuLocation,
  menuItemFormSchema,
} from "@/lib/validations/menus";

// Suite: menu location enum and menu item form rules.
describe("menus validation", () => {
  // Accepts header/footer; rejects unknown locations like sidebar.
  it("validates menu locations", () => {
    expect(isValidMenuLocation("header")).toBe(true);
    expect(isValidMenuLocation("footer")).toBe(true);
    expect(isValidMenuLocation("sidebar")).toBe(false);
  });

  // Requires non-empty labelEn; accepts item with href.
  it("requires an English label", () => {
    expect(
      menuItemFormSchema.safeParse({
        labelEn: "Home",
        href: "/",
      }).success,
    ).toBe(true);
    expect(menuItemFormSchema.safeParse({ labelEn: "" }).success).toBe(false);
  });
});
