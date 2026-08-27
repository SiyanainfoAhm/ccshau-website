/**
 * Vitest coverage for pageFormSchema: minimal page shape, slug/title rules,
 * college contact-location requirements, and map coordinate bounds.
 */
import { describe, expect, it } from "vitest";

import { pageFormSchema } from "@/lib/validations/pages";

const basePage = {
  titleEn: "About Us",
  slug: "about-us",
  pageType: "standard" as const,
  layoutTemplate: "standard" as const,
  status: "draft" as const,
};

// Suite: CMS page create/edit form validation.
describe("pageFormSchema", () => {
  // Accepts minimal standard draft page.
  it("accepts a minimal valid page", () => {
    const result = pageFormSchema.safeParse(basePage);
    expect(result.success).toBe(true);
  });

  // Rejects empty titleEn and invalid slug; accepts kebab slug.
  it("requires english title and valid slug", () => {
    expect(pageFormSchema.safeParse({ ...basePage, titleEn: "" }).success).toBe(
      false,
    );
    expect(
      pageFormSchema.safeParse({ ...basePage, slug: "Bad Slug" }).success,
    ).toBe(false);
    expect(
      pageFormSchema.safeParse({ ...basePage, slug: "ok-slug-1" }).success,
    ).toBe(true);
  });

  // When contactLocationEnabled, requires addressEn and phone paths.
  it("requires address and phone when college contact location is enabled", () => {
    const result = pageFormSchema.safeParse({
      ...basePage,
      pageType: "college",
      contactLocationEnabled: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("addressEn");
      expect(paths).toContain("phone");
    }
  });

  // Accepts college contact when address, phone, and email are present.
  it("accepts college contact location when address, phone, and email are set", () => {
    const result = pageFormSchema.safeParse({
      ...basePage,
      pageType: "college",
      contactLocationEnabled: true,
      addressEn: "Hisar",
      phone: "1800-1803001",
      email: "info@hau.ac.in",
    });
    expect(result.success).toBe(true);
  });

  // Rejects lat/lng outside range; accepts valid Hisar coords.
  it("rejects out-of-range map coordinates", () => {
    expect(
      pageFormSchema.safeParse({ ...basePage, mapLat: "120" }).success,
    ).toBe(false);
    expect(
      pageFormSchema.safeParse({ ...basePage, mapLng: "-200" }).success,
    ).toBe(false);
    expect(
      pageFormSchema.safeParse({ ...basePage, mapLat: "29.1", mapLng: "75.7" })
        .success,
    ).toBe(true);
  });
});
