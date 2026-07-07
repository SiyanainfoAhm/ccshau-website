import type { PageType } from "@/lib/database/types";

import {
  PG_STUDIES_HUB_SLUG,
  getCollegeSectionPath,
  getCollegeSubsectionPath,
  getPgStudiesSectionPath,
  getPublicPagePath,
  pgStudiesSectionUrlSegment,
} from "./routes";

export interface PagePathAncestors {
  parentSlug?: string | null;
  parentPageType?: PageType | null;
  grandparentSlug?: string | null;
  grandparentPageType?: PageType | null;
}

export function isParentUnderCollege(parent: {
  page_type: PageType;
  ancestors: PagePathAncestors;
}): boolean {
  return (
    parent.page_type === "college" ||
    parent.ancestors.parentPageType === "college" ||
    parent.ancestors.grandparentPageType === "college"
  );
}

export const COLLEGES_CONTAINER_SLUG = "colleges";

export function isCollegesContainerSlug(slug: string | null | undefined): boolean {
  return slug === COLLEGES_CONTAINER_SLUG;
}

/** College microsites live under the colleges container page but keep page_type college. */
export function resolveCollegeRootPageType(
  formPageType: "standard" | "college",
  parentId: string | null | undefined,
  parentSlug: string | null | undefined,
): PageType {
  if (formPageType === "college" && (!parentId || isCollegesContainerSlug(parentSlug))) {
    return "college";
  }
  return "standard";
}

export function ancestorsForChildPage(parent: {
  slug: string;
  page_type: PageType;
  ancestors: PagePathAncestors;
}): PagePathAncestors {
  if (parent.page_type === "college") {
    return {
      parentSlug: parent.slug,
      parentPageType: "college",
    };
  }

  if (parent.ancestors.parentPageType === "college" && parent.ancestors.parentSlug) {
    return {
      parentSlug: parent.slug,
      parentPageType: parent.page_type,
      grandparentSlug: parent.ancestors.parentSlug,
      grandparentPageType: "college",
    };
  }

  return {
    parentSlug: parent.slug,
    parentPageType: parent.page_type,
    grandparentSlug: parent.ancestors.grandparentSlug,
    grandparentPageType: parent.ancestors.grandparentPageType,
  };
}

export function resolvePublicPagePath(
  slug: string,
  pageType: PageType = "standard",
  ancestors: PagePathAncestors = {},
): string {
  const { parentSlug, parentPageType, grandparentSlug, grandparentPageType } = ancestors;

  if (
    parentSlug &&
    grandparentSlug &&
    grandparentPageType === "college" &&
    parentPageType !== "college"
  ) {
    return getCollegeSubsectionPath(grandparentSlug, parentSlug, slug);
  }

  if (parentSlug && parentPageType === "college") {
    return getCollegeSectionPath(parentSlug, slug);
  }

  if (parentSlug === PG_STUDIES_HUB_SLUG && parentPageType === "standard" && pageType === "standard") {
    return getPgStudiesSectionPath(pgStudiesSectionUrlSegment(slug));
  }

  if (pageType === "college") {
    return getPublicPagePath(slug, "college");
  }

  return getPublicPagePath(slug, pageType);
}

interface PageLike {
  id: string;
  slug: string;
  title_en?: string;
  page_type?: PageType | null;
  parent_id?: string | null;
}

export type CollegePagePlacement = "root" | "section" | "subsection" | null;

export function getCollegePagePlacement(
  page: PageLike,
  pageById: Map<string, PageLike>,
): CollegePagePlacement {
  if (page.page_type !== "college" && !page.parent_id) return null;

  const parent = page.parent_id ? pageById.get(page.parent_id) : undefined;
  if (!parent) {
    return page.page_type === "college" ? "root" : null;
  }

  if (parent.page_type === "college") {
    return "section";
  }

  const grandparent = parent.parent_id ? pageById.get(parent.parent_id) : undefined;
  if (grandparent?.page_type === "college") {
    return "subsection";
  }

  return page.page_type === "college" ? "root" : null;
}

export function getPagePathAncestors(
  page: PageLike,
  pageById: Map<string, PageLike>,
): PagePathAncestors {
  const parent = page.parent_id ? pageById.get(page.parent_id) : undefined;
  const grandparent = parent?.parent_id ? pageById.get(parent.parent_id) : undefined;

  return {
    parentSlug: parent?.slug ?? null,
    parentPageType: parent?.page_type ?? null,
    grandparentSlug: grandparent?.slug ?? null,
    grandparentPageType: grandparent?.page_type ?? null,
  };
}

export function resolvePagePublicPath(page: PageLike, pageById: Map<string, PageLike>): string {
  return resolvePublicPagePath(
    page.slug,
    page.page_type ?? "standard",
    getPagePathAncestors(page, pageById),
  );
}

export function buildAdminParentPageOptions(pages: PageLike[]) {
  const pageById = new Map(pages.map((p) => [p.id, p]));

  return pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    title_en: p.title_en ?? p.slug,
    page_type: p.page_type ?? "standard",
    publicPath: resolvePagePublicPath(p, pageById),
    ancestors: getPagePathAncestors(p, pageById),
  }));
}
