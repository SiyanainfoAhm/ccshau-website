import type { PageType } from "@/lib/database/types";

export function getPublicPagePath(slug: string, pageType: PageType = "standard"): string {
  return pageType === "college" ? `/college/${slug}` : `/pages/${slug}`;
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

export function isMegaMenuItem(item: { children?: unknown[] }): boolean {
  return Boolean(item.children?.some((child) => (child as { children?: unknown[] }).children?.length));
}
