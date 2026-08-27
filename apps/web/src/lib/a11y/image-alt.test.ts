/**
 * Tests for `@/lib/a11y/image-alt`.
 * Covers accessible alt-text priority, language selection, and hero/staff/gallery helpers.
 */

import { describe, expect, it } from "vitest";

import {
  buildImageAlt,
  galleryImageAlt,
  heroSlideAlt,
  staffPhotoAlt,
} from "@/lib/a11y/image-alt";

// Suite: buildImageAlt and specialized alt helpers.
describe("image-alt", () => {
  // Prefers explicit alt, then name/designation, else default label.
  it("prefers explicit alt then caption then name/title", () => {
    expect(
      buildImageAlt({
        altEn: "Campus gate",
        titleEn: "Ignored",
      }),
    ).toBe("Campus gate");

    expect(
      buildImageAlt({
        nameEn: "Dr Test",
        designationEn: "Dean",
      }),
    ).toBe("Dr Test, Dean");

    expect(buildImageAlt({})).toBe("CCSHAU image");
  });

  // Uses Hindi alt when lang is hi.
  it("prefers Hindi when lang is hi", () => {
    expect(
      buildImageAlt({
        altEn: "English",
        altHi: "हिंदी",
        lang: "hi",
      }),
    ).toBe("हिंदी");
  });

  // heroSlideAlt, staffPhotoAlt, and galleryImageAlt use their own fallbacks.
  it("builds hero, staff, and gallery alts", () => {
    expect(
      heroSlideAlt({
        titleEn: "Welcome",
        imageAltEn: "Main banner",
      }),
    ).toBe("Main banner");

    expect(
      staffPhotoAlt({
        nameEn: "Ada",
        designationEn: "Professor",
      }),
    ).toBe("Ada, Professor");

    expect(galleryImageAlt({ titleEn: "Lab visit" })).toBe("Lab visit");
    expect(galleryImageAlt({})).toBe("Gallery image");
  });
});
