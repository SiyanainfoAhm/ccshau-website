import { describe, expect, it } from "vitest";

import { university } from "@/lib/mock/site-content";
import {
  DEFAULT_HEADER_ACCREDITATION_EN,
  DEFAULT_HEADER_ACCREDITATION_HI,
  DEFAULT_HEADER_LOGO,
  DEFAULT_HEADER_PORTRAIT,
  resolveHeaderBranding,
} from "@/lib/settings/header-branding";

const empty = {
  header_tagline_en: null,
  header_tagline_hi: "  ",
  header_logo_path: null,
  header_portrait_path: null,
  header_short_name: null,
  header_name_en: null,
  header_name_hi: null,
  header_accreditation_en: null,
  header_accreditation_hi: null,
};

describe("resolveHeaderBranding", () => {
  it("uses the built-in motto, titles, and images when settings are empty", () => {
    expect(resolveHeaderBranding(empty)).toEqual({
      taglineEn: university.taglineEn,
      taglineHi: university.taglineHi,
      shortName: university.shortName,
      nameEn: university.nameEn,
      nameHi: university.nameHi,
      accreditationEn: DEFAULT_HEADER_ACCREDITATION_EN,
      accreditationHi: DEFAULT_HEADER_ACCREDITATION_HI,
      logoUrl: DEFAULT_HEADER_LOGO,
      portraitUrl: DEFAULT_HEADER_PORTRAIT,
    });
  });

  it("uses saved text and absolute image URLs", () => {
    expect(
      resolveHeaderBranding({
        ...empty,
        header_tagline_en: " Grow with HAU ",
        header_tagline_hi: "हाउ के साथ बढ़ें",
        header_short_name: " HAU ",
        header_name_en: "Haryana Agricultural University",
        header_name_hi: "हरियाणा कृषि विश्वविद्यालय",
        header_accreditation_en: "A+ Accredited",
        header_accreditation_hi: "ए+ मान्यता",
        header_logo_path: "https://cdn.example/logo.png",
        header_portrait_path: "https://cdn.example/portrait.jpg",
      }),
    ).toEqual({
      taglineEn: "Grow with HAU",
      taglineHi: "हाउ के साथ बढ़ें",
      shortName: "HAU",
      nameEn: "Haryana Agricultural University",
      nameHi: "हरियाणा कृषि विश्वविद्यालय",
      accreditationEn: "A+ Accredited",
      accreditationHi: "ए+ मान्यता",
      logoUrl: "https://cdn.example/logo.png",
      portraitUrl: "https://cdn.example/portrait.jpg",
    });
  });
});
