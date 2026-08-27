import { describe, expect, it } from "vitest";

import {
  isValidMenuLocation,
  menuItemFormSchema,
} from "@/lib/validations/menus";

describe("menus validation", () => {
  it("validates menu locations", () => {
    expect(isValidMenuLocation("header")).toBe(true);
    expect(isValidMenuLocation("footer")).toBe(true);
    expect(isValidMenuLocation("sidebar")).toBe(false);
  });

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
