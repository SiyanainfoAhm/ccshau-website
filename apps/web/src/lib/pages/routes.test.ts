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

describe("routes helpers", () => {
  it("maps public page paths by type", () => {
    expect(getPublicPagePath("about")).toBe("/pages/about");
    expect(getPublicPagePath("college-of-agriculture-hisar", "college")).toBe(
      "/college/college-of-agriculture-hisar",
    );
  });

  it("maps HRM / estate CMS pages to college menu slugs", () => {
    expect(getCollegeSlugForCmsPage("human-resource-management")).toBe("hrm");
    expect(getCollegeSlugForCmsPage("estate-office")).toBe("eo-cum-se");
    expect(getCollegeSlugForCmsPage("about")).toBeNull();
  });

  it("uses /pages home for HRM and estate microsites", () => {
    expect(getCollegePublicHomePath("hrm")).toBe(
      "/pages/human-resource-management",
    );
    expect(getCollegePublicHomePath("eo-cum-se")).toBe("/pages/estate-office");
    expect(getCollegePublicHomePath("college-of-agriculture-hisar")).toBe(
      "/college/college-of-agriculture-hisar",
    );
  });

  it("builds college section and contact paths", () => {
    expect(getCollegeSectionPath("coa", "about")).toBe("/college/coa/about");
    expect(getCollegeSubsectionPath("coa", "dept", "faculty")).toBe(
      "/college/coa/dept/faculty",
    );
    expect(getCollegeContactPath("coa")).toBe("/college/contact-us/coa");
  });

  it("maps pg-studies nested url segments", () => {
    expect(getPgStudiesHubPath()).toBe("/pages/pg-studies");
    expect(pgStudiesSectionUrlSegment("pg-studies-gallery")).toBe("gallery");
    expect(pgStudiesSectionUrlSegment("pg-studies-contact")).toBe("contact");
    expect(pgStudiesSectionSlugFromUrl("gallery")).toBe("pg-studies-gallery");
    expect(getPgStudiesSectionPath("gallery")).toBe(
      "/pages/pg-studies/gallery",
    );
  });

  it("detects mega menu depth", () => {
    expect(isMegaMenuItem({ children: [{ children: [{}] }] })).toBe(true);
    expect(isMegaMenuItem({ children: [{}] })).toBe(false);
    expect(isMegaMenuItem({})).toBe(false);
  });
});
