/**
 * Smoke tests for homepage college cards and college microsite path helpers.
 * Structure-only: no live HTTP; may still rely on mocked server-only imports.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveHomepageColleges } from "@/lib/data/homepage";
import type { PublicPageSummary } from "@/lib/data/public-types";
import { legacyColleges } from "@/lib/legacy/homepage-content";
import { LAYOUT_PRESETS, needsOfficeDataLoad } from "@/lib/pages/layout-config";
import {
  getCollegePublicHomePath,
  getCollegeSectionPath,
  getPublicPagePath,
} from "@/lib/pages/routes";

// Suite: homepage + college microsite public smoke (structure).
describe("homepage + college microsite public smoke (structure)", () => {
  // CMS college pages resolve to public /college/{slug} card hrefs.
  it("resolves homepage college cards to public college URLs", () => {
    const cmsPages: PublicPageSummary[] = [
      {
        slug: "college-of-agriculture-hisar",
        titleEn: "College of Agriculture, Hisar",
        titleHi: null,
        excerptEn: null,
        excerptHi: null,
        imageUrl: null,
        logoImageUrl: null,
        pageType: "college",
      },
    ];

    const colleges = resolveHomepageColleges(cmsPages);
    expect(colleges.length).toBe(legacyColleges.length);

    const coa = colleges.find((c) => c.slug === "college-of-agriculture-hisar");
    expect(coa).toBeDefined();
    expect(coa?.href).toBe("/college/college-of-agriculture-hisar");
    expect(coa?.nameEn).toContain("Agriculture");
  });

  // Alias CMS slug maps onto the matching legacy college card fields.
  it("maps alias CMS slug onto legacy college card", () => {
    const cmsPages: PublicPageSummary[] = [
      {
        slug: "ic-college-of-home-science",
        titleEn: "I.C. College of Community Science",
        titleHi: null,
        excerptEn: null,
        excerptHi: null,
        imageUrl: null,
        logoImageUrl: "https://cdn.example/logo.png",
        pageType: "college",
      },
    ];

    const colleges = resolveHomepageColleges(cmsPages);
    const community = colleges.find((c) =>
      c.nameEn.toLowerCase().includes("community science"),
    );
    expect(community?.slug).toBe("ic-college-of-home-science");
    expect(community?.href).toBe("/college/ic-college-of-home-science");
    expect(community?.logoUrl).toBe("https://cdn.example/logo.png");
  });

  // College home and section route builders produce expected paths.
  it("builds college microsite home and section paths", () => {
    const slug = "college-of-agriculture-hisar";
    expect(getPublicPagePath(slug, "college")).toBe(`/college/${slug}`);
    expect(getCollegePublicHomePath(slug)).toBe(`/college/${slug}`);
    expect(getCollegeSectionPath(slug, "about")).toBe(
      `/college/${slug}/about`,
    );
  });

  // Office portal layout requires portal data; minimal does not.
  it("office portal layout needs portal data load for microsite home", () => {
    expect(needsOfficeDataLoad(LAYOUT_PRESETS.office_portal)).toBe(true);
    expect(needsOfficeDataLoad(LAYOUT_PRESETS.minimal)).toBe(false);
  });
});
