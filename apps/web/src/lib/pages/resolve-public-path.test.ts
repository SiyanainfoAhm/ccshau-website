/**
 * Tests for `@/lib/pages/resolve-public-path`.
 * Covers college ancestry, public path resolution, and page placement helpers.
 */

import { describe, expect, it } from "vitest";

import {
  ancestorsForChildPage,
  getCollegePagePlacement,
  getPagePathAncestors,
  isCollegesContainerSlug,
  isParentUnderCollege,
  resolveCollegeRootPageType,
  resolvePagePublicPath,
  resolvePublicPagePath,
} from "@/lib/pages/resolve-public-path";

// Suite: resolve-public-path helpers.
describe("resolve-public-path", () => {
  // Detects colleges container slug and college parent ancestry.
  it("detects colleges container and college ancestry", () => {
    expect(isCollegesContainerSlug("colleges")).toBe(true);
    expect(isCollegesContainerSlug("other")).toBe(false);

    expect(
      isParentUnderCollege({
        page_type: "college",
        ancestors: {},
      }),
    ).toBe(true);
    expect(
      isParentUnderCollege({
        page_type: "standard",
        ancestors: { parentPageType: "college" },
      }),
    ).toBe(true);
    expect(
      isParentUnderCollege({
        page_type: "standard",
        ancestors: {},
      }),
    ).toBe(false);
  });

  // College root type stays college only under colleges container (or no parent).
  it("resolves college root page type under colleges container", () => {
    expect(resolveCollegeRootPageType("college", null, null)).toBe("college");
    expect(resolveCollegeRootPageType("college", "p1", "colleges")).toBe(
      "college",
    );
    expect(resolveCollegeRootPageType("college", "p1", "other")).toBe(
      "standard",
    );
    expect(resolveCollegeRootPageType("standard", null, null)).toBe("standard");
  });

  // Builds parent/grandparent ancestor objects for nested child pages.
  it("builds ancestor chain for child pages", () => {
    expect(
      ancestorsForChildPage({
        slug: "coa",
        page_type: "college",
        ancestors: {},
      }),
    ).toEqual({
      parentSlug: "coa",
      parentPageType: "college",
    });

    expect(
      ancestorsForChildPage({
        slug: "agronomy",
        page_type: "standard",
        ancestors: {
          parentSlug: "coa",
          parentPageType: "college",
        },
      }),
    ).toEqual({
      parentSlug: "agronomy",
      parentPageType: "standard",
      grandparentSlug: "coa",
      grandparentPageType: "college",
    });
  });

  // Maps section/subsection/PG/college/standard slugs to public URLs.
  it("maps public paths for college section, subsection, and PG studies", () => {
    expect(
      resolvePublicPagePath("about", "standard", {
        parentSlug: "coa",
        parentPageType: "college",
      }),
    ).toBe("/college/coa/about");

    expect(
      resolvePublicPagePath("faculty", "standard", {
        parentSlug: "agronomy",
        parentPageType: "standard",
        grandparentSlug: "coa",
        grandparentPageType: "college",
      }),
    ).toBe("/college/coa/agronomy/faculty");

    expect(
      resolvePublicPagePath("about", "standard", {
        parentSlug: "pg-studies",
        parentPageType: "standard",
      }),
    ).toBe("/pages/pg-studies/about");

    expect(resolvePublicPagePath("coa", "college")).toBe("/college/coa");
    expect(resolvePublicPagePath("about")).toBe("/pages/about");
  });

  // Placement and path resolution walk the page map correctly.
  it("computes placement and path from page map", () => {
    const college = {
      id: "c1",
      slug: "coa",
      page_type: "college" as const,
      parent_id: null,
    };
    const section = {
      id: "s1",
      slug: "agronomy",
      page_type: "standard" as const,
      parent_id: "c1",
    };
    const subsection = {
      id: "ss1",
      slug: "faculty",
      page_type: "standard" as const,
      parent_id: "s1",
    };
    const pageById = new Map([
      ["c1", college],
      ["s1", section],
      ["ss1", subsection],
    ]);

    expect(getCollegePagePlacement(college, pageById)).toBe("root");
    expect(getCollegePagePlacement(section, pageById)).toBe("section");
    expect(getCollegePagePlacement(subsection, pageById)).toBe("subsection");

    expect(getPagePathAncestors(subsection, pageById)).toEqual({
      parentSlug: "agronomy",
      parentPageType: "standard",
      grandparentSlug: "coa",
      grandparentPageType: "college",
    });

    expect(resolvePagePublicPath(subsection, pageById)).toBe(
      "/college/coa/agronomy/faculty",
    );
  });
});
