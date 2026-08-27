/**
 * Vitest coverage for redirectFormSchema: absolute-path legacy/new paths
 * and allowed redirect type codes (301/etc.).
 */
import { describe, expect, it } from "vitest";

import { redirectFormSchema } from "@/lib/validations/redirects";

// Suite: URL redirect mapping form validation.
describe("redirectFormSchema", () => {
  // Accepts slash-prefixed paths with 301 type.
  it("accepts valid absolute-path redirects", () => {
    expect(
      redirectFormSchema.safeParse({
        legacyPath: "/old-page",
        newPath: "/pages/about",
        redirectType: 301,
      }).success,
    ).toBe(true);
  });

  // Rejects missing leading slash and disallowed redirect types.
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
