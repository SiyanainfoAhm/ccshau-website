import { describe, expect, it } from "vitest";

import { parseMicrositeHeader, publicHeaderFromSaved } from "@/lib/pages/microsite-header";

describe("microsite header", () => {
  it("stays off until custom is saved", () => {
    expect(publicHeaderFromSaved(parseMicrositeHeader(null), null)).toBeNull();
    expect(publicHeaderFromSaved(parseMicrositeHeader({ nameEn: "College" }), "/logo.png")).toBeNull();
  });

  it("reads the saved name, short line, and university menu flag", () => {
    const saved = parseMicrositeHeader({
      custom: true,
      nameEn: "College of Agriculture, Hisar",
      nameHi: "कृषि महाविद्यालय",
      taglineEn: "Established 1962",
      taglineHi: "स्थापित 1962",
      logoPath: "pages/logo.png",
      showUniversityMenu: true,
    });
    expect(publicHeaderFromSaved(saved, "https://cdn.example/logo.png")).toEqual({
      nameEn: "College of Agriculture, Hisar",
      nameHi: "कृषि महाविद्यालय",
      taglineEn: "Established 1962",
      taglineHi: "स्थापित 1962",
      logoUrl: "https://cdn.example/logo.png",
      showUniversityMenu: true,
    });
  });
});
