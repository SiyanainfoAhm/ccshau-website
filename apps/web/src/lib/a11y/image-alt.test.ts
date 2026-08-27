import { describe, expect, it } from "vitest";

import {
  buildImageAlt,
  galleryImageAlt,
  heroSlideAlt,
  staffPhotoAlt,
} from "@/lib/a11y/image-alt";

describe("image-alt", () => {
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

  it("prefers Hindi when lang is hi", () => {
    expect(
      buildImageAlt({
        altEn: "English",
        altHi: "हिंदी",
        lang: "hi",
      }),
    ).toBe("हिंदी");
  });

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
