import type { PageType } from "@/lib/database/types";

export const PG_STUDIES_HUB_SLUG = "pg-studies";

export function getPublicPagePath(slug: string, pageType: PageType = "standard"): string {
  return pageType === "college" ? `/college/${slug}` : `/pages/${slug}`;
}

export function getPgStudiesHubPath(): string {
  return `/pages/${PG_STUDIES_HUB_SLUG}`;
}

/** Map DB slug to nested URL segment under /pages/pg-studies/ */
export function pgStudiesSectionUrlSegment(pageSlug: string): string {
  if (pageSlug === "pg-studies-gallery") return "gallery";
  if (pageSlug === "pg-studies-contact") return "contact";
  return pageSlug;
}

/** Map nested URL segment to DB slug */
export function pgStudiesSectionSlugFromUrl(urlSegment: string): string {
  if (urlSegment === "gallery") return "pg-studies-gallery";
  if (urlSegment === "contact") return "pg-studies-contact";
  return urlSegment;
}

export function getPgStudiesSectionPath(urlSegment: string): string {
  return `${getPgStudiesHubPath()}/${urlSegment}`;
}

export function getCollegeSectionPath(collegeSlug: string, sectionSlug: string): string {
  return `/college/${collegeSlug}/${sectionSlug}`;
}

export function getCollegeSubsectionPath(
  collegeSlug: string,
  sectionSlug: string,
  subsectionSlug: string,
): string {
  return `/college/${collegeSlug}/${sectionSlug}/${subsectionSlug}`;
}

export function getCollegeContactPath(collegeSlug: string): string {
  return `/college/contact-us/${collegeSlug}`;
}

export function isMegaMenuItem(item: { children?: unknown[] }): boolean {
  return Boolean(item.children?.some((child) => (child as { children?: unknown[] }).children?.length));
}
