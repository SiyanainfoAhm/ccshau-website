/**
 * Tests for `@/lib/pages/routes`.
 * Covers public/college/PG-studies path builders and mega-menu depth detection.
 */

import { describe, expect, it } from "vitest";

import {
  getCollegeContactPath,
  getCollegePublicHomePath,
  getCollegeSectionPath,
  getCollegeSlugForCmsPage,
  getCollegeSubsectionPath,
  getPgStudiesHubPath,
  getPgStudiesSectionPath,
  getPublicPagePath,
  isMegaMenuItem,
  pgStudiesSectionSlugFromUrl,
  pgStudiesSectionUrlSegment,
} from "@/lib/pages/routes";

// Suite: public and college route helpers.
describe("routes helpers", () => {
  // Standard pages use /pages; college type uses /college.
  it("maps public page paths by type", () => {
    expect(getPublicPagePath("about")).toBe("/pages/about");
    expect(getPublicPagePath("college-of-agriculture-hisar", "college")).toBe(
      "/college/college-of-agriculture-hisar",
    );
  });

  // HRM/estate CMS slugs map to college menu slugs; others return null.
  it("maps HRM / estate CMS pages to college menu slugs", () => {
    expect(getCollegeSlugForCmsPage("human-resource-management")).toBe("hrm");
    expect(getCollegeSlugForCmsPage("estate-office")).toBe("eo-cum-se");
    expect(getCollegeSlugForCmsPage("about")).toBeNull();
  });

  // HRM and estate homes stay under /pages; colleges use /college.
  it("uses /pages home for HRM and estate microsites", () => {
    expect(getCollegePublicHomePath("hrm")).toBe(
      "/pages/human-resource-management",
    );
    expect(getCollegePublicHomePath("eo-cum-se")).toBe("/pages/estate-office");
    expect(getCollegePublicHomePath("college-of-agriculture-hisar")).toBe(
      "/college/college-of-agriculture-hisar",
    );
  });

  // Builds section, subsection, and contact paths under /college.
  it("builds college section and contact paths", () => {
    expect(getCollegeSectionPath("coa", "about")).toBe("/college/coa/about");
    expect(getCollegeSubsectionPath("coa", "dept", "faculty")).toBe(
      "/college/coa/dept/faculty",
    );
    expect(getCollegeContactPath("coa")).toBe("/college/contact-us/coa");
  });

  // PG studies hub/section URL segments round-trip correctly.
  it("maps pg-studies nested url segments", () => {
    expect(getPgStudiesHubPath()).toBe("/pages/pg-studies");
    expect(pgStudiesSectionUrlSegment("pg-studies-gallery")).toBe("gallery");
    expect(pgStudiesSectionUrlSegment("pg-studies-contact")).toBe("contact");
    expect(pgStudiesSectionSlugFromUrl("gallery")).toBe("pg-studies-gallery");
    expect(getPgStudiesSectionPath("gallery")).toBe(
      "/pages/pg-studies/gallery",
    );
  });

  // Mega menu requires grandchildren; shallower trees are not mega.
  it("detects mega menu depth", () => {
    expect(isMegaMenuItem({ children: [{ children: [{}] }] })).toBe(true);
    expect(isMegaMenuItem({ children: [{}] })).toBe(false);
    expect(isMegaMenuItem({})).toBe(false);
  });
});
