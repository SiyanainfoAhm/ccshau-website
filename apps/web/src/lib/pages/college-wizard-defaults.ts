import type { PageLayoutConfig } from "@/lib/pages/layout-config";
import { slugify } from "@/lib/utils/slug";

/** Matches migrated Hisar college home after legacy content import. */
export const COLLEGE_HOME_LAYOUT_CONFIG: PageLayoutConfig = {
  hero: false,
  headOfficer: true,
  contacts: true,
  staff: false,
  gallery: false,
  mainContent: true,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

export const GALLERY_SECTION_LAYOUT_CONFIG: PageLayoutConfig = {
  hero: false,
  headOfficer: false,
  contacts: false,
  staff: false,
  gallery: true,
  mainContent: false,
  leftSidebar: false,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

export const DEPARTMENT_SUBSECTION_LAYOUT_CONFIG: PageLayoutConfig = {
  hero: true,
  headOfficer: false,
  contacts: false,
  staff: true,
  gallery: false,
  mainContent: true,
  leftSidebar: true,
  rightSidebar: false,
  collegeTopMenu: true,
  farmersCta: false,
  heroContactButton: false,
};

export interface DefaultSectionSeed {
  slug: string;
  titleEn: string;
  titleHi: string;
  excerptEn: string;
  excerptHi: string;
  contentEn: string;
  contentHi: string;
  sortOrder: number;
  layoutTemplate: "standard" | "office_portal" | "college_home";
  layoutConfig: PageLayoutConfig | null;
}

export function buildDefaultSectionSeeds(
  shortPrefix: string,
  collegeTitleEn: string,
): DefaultSectionSeed[] {
  return [
    {
      slug: `${shortPrefix}-department`,
      titleEn: "Department",
      titleHi: "विभाग",
      excerptEn: `Academic departments at ${collegeTitleEn}.`,
      excerptHi: `${collegeTitleEn} के शैक्षणिक विभाग।`,
      contentEn: `<p>Departments under ${collegeTitleEn}. Add department sub-pages from the admin or college register wizard.</p>`,
      contentHi: `<p>${collegeTitleEn} के अंतर्गत विभाग।</p>`,
      sortOrder: 1,
      layoutTemplate: "standard",
      layoutConfig: null,
    },
    {
      slug: `${shortPrefix}-gallery`,
      titleEn: "Gallery",
      titleHi: "गैलरी",
      excerptEn: `Photo gallery from ${collegeTitleEn}.`,
      excerptHi: `${collegeTitleEn} की फोटो गैलरी।`,
      contentEn: "",
      contentHi: "",
      sortOrder: 2,
      layoutTemplate: "standard",
      layoutConfig: GALLERY_SECTION_LAYOUT_CONFIG,
    },
  ];
}

export function parseDepartmentNames(raw: string | undefined): { titleEn: string; slug: string }[] {
  if (!raw?.trim()) return [];

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((titleEn) => ({
      titleEn,
      slug: slugify(titleEn),
    }));
}
