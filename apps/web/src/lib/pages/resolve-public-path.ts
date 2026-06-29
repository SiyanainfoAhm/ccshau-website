import type { PageType } from "@/lib/database/types";

import { getCollegeSectionPath, getCollegeSubsectionPath, getPublicPagePath } from "./routes";

export interface PagePathAncestors {
  parentSlug?: string | null;
  parentPageType?: PageType | null;
  grandparentSlug?: string | null;
  grandparentPageType?: PageType | null;
}

export function resolvePublicPagePath(
  slug: string,
  pageType: PageType = "standard",
  ancestors: PagePathAncestors = {},
): string {
  if (pageType === "college") {
    return getPublicPagePath(slug, "college");
  }

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

  return getPublicPagePath(slug, pageType);
}

interface PageLike {
  id: string;
  slug: string;
  title_en?: string;
  page_type?: PageType | null;
  parent_id?: string | null;
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
