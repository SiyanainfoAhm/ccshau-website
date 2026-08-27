import { describe, expect, it } from "vitest";

import { redirectFormSchema } from "@/lib/validations/redirects";

describe("redirectFormSchema", () => {
  it("accepts valid absolute-path redirects", () => {
    expect(
      redirectFormSchema.safeParse({
        legacyPath: "/old-page",
        newPath: "/pages/about",
        redirectType: 301,
      }).success,
    ).toBe(true);
  });

  it("rejects paths without leading slash and invalid types", () => {
    expect(
      redirectFormSchema.safeParse({
        legacyPath: "old-page",
        newPath: "/pages/about",
        redirectType: 301,
      }).success,
    ).toBe(false);
    expect(
      redirectFormSchema.safeParse({
        legacyPath: "/old",
        newPath: "/new",
        redirectType: 307,
      }).success,
    ).toBe(false);
  });
});
