export interface PublicHeroSlide {
  titleEn: string;
  titleHi?: string | null;
  subtitleEn?: string | null;
  image: string;
  targetUrl?: string | null;
}

export interface PublicNavItem {
  labelEn: string;
  labelHi: string | null;
  href: string;
  children?: PublicNavItem[];
  openInNewTab?: boolean;
}

export interface PublicQuickLink {
  labelEn: string;
  labelHi: string | null;
  href: string;
}

export interface PublicSidebarLink {
  id: string;
  labelEn: string;
  labelHi: string | null;
  href: string | null;
  contentEn: string | null;
  contentHi: string | null;
}

export interface PublicNewsItem {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string | null;
  bodyEn: string | null;
  bodyHi: string | null;
  category: string | null;
  noticeType: string;
  publishedAt: string | null;
  attachmentPaths: { path: string; name: string; url: string | null }[];
}

export interface PublicTenderItem {
  id: string;
  slug: string;
  tenderNumber: string | null;
  titleEn: string;
  titleHi: string | null;
  descriptionEn: string | null;
  descriptionHi: string | null;
  category: string | null;
  status: string;
  closingDate: string | null;
  publishedAt: string | null;
  departmentName: string | null;
  documents: { path: string; name: string; url: string | null }[];
  corrigenda: {
    id: string;
    title: string;
    description: string | null;
    publishedAt: string;
    fileUrl: string | null;
    fileName: string | null;
  }[];
}

export interface PublicPage {
  slug: string;
  titleEn: string;
  titleHi: string | null;
  contentEn: string | null;
  contentHi: string | null;
  excerptEn: string | null;
  excerptHi: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  pageType?: PageType;
  layoutTemplate?: LayoutTemplate;
  featuredImageUrl?: string | null;
  logoImageUrl?: string | null;
}

export type PageType = "standard" | "college";

export type LayoutTemplate = "college_home" | "office_portal" | "standard";

export interface PublicOfficeContactLine {
  labelEn: string;
  labelHi: string | null;
  valueEn: string;
  valueHi: string | null;
}

export interface PublicOfficeStaffMember {
  nameEn: string;
  nameHi: string | null;
  designationEn: string;
  designationHi: string | null;
  specializationEn: string | null;
  specializationHi: string | null;
  imageUrl: string | null;
  detailHref: string | null;
}

export interface PublicOfficeHeadOfficer {
  nameEn: string;
  nameHi: string | null;
  roleEn: string;
  roleHi: string | null;
  imageUrl: string | null;
}

export interface PublicOfficePortalData {
  contactLines: PublicOfficeContactLine[];
  staff: PublicOfficeStaffMember[];
  sidebarLeft: PublicSidebarLink[];
  sidebarRight: PublicSidebarLink[];
  headOfficer: PublicOfficeHeadOfficer | null;
  officeCtaEnabled: boolean;
}

export interface PublicCollegeSubsection {
  pageId: string;
  slug: string;
  titleEn: string;
  titleHi: string | null;
  excerptEn: string | null;
  excerptHi: string | null;
  contentEn: string | null;
  contentHi: string | null;
}

export interface PublicCollegeSection {
  pageId: string;
  slug: string;
  layoutTemplate?: LayoutTemplate;
  titleEn: string;
  titleHi: string | null;
  excerptEn: string | null;
  excerptHi: string | null;
  contentEn: string | null;
  contentHi: string | null;
  subsections: PublicCollegeSubsection[];
}

export interface PublicCollegePage extends PublicPage {
  pageId: string;
  pageType: "college";
  collegeSlug: string;
  layoutTemplate: LayoutTemplate;
  sections: PublicCollegeSection[];
}

export interface PublicSiteChrome {
  headerNav: PublicNavItem[];
  quickLinks: PublicQuickLink[];
  footerLinks: PublicQuickLink[];
}

export interface PublicCircularItem {
  id: string;
  circularNumber: string | null;
  titleEn: string;
  titleHi: string | null;
  publishedAt: string | null;
  departmentName: string | null;
  fileName: string | null;
  fileUrl: string | null;
}

export interface PublicDownloadItem {
  id: string;
  titleEn: string;
  titleHi: string | null;
  category: string | null;
  version: string | null;
  departmentName: string | null;
  fileName: string;
  fileUrl: string | null;
  downloadCount: number;
}

export interface PublicMediaAlbumItem {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string | null;
  albumType: string;
  eventDate: string | null;
  publishedAt: string | null;
  coverUrl: string | null;
  itemCount: number;
}

export interface PublicMediaItem {
  id: string;
  titleEn: string | null;
  titleHi: string | null;
  mediaType: "image" | "video";
  url: string | null;
  thumbnailUrl: string | null;
  captionEn: string | null;
  captionHi: string | null;
}

export interface PublicMediaAlbumDetail extends PublicMediaAlbumItem {
  items: PublicMediaItem[];
}

export type PublicSearchContentType =
  | "page"
  | "news"
  | "tender"
  | "circular"
  | "download"
  | "media";

export interface PublicSearchResult {
  id: string;
  type: PublicSearchContentType;
  titleEn: string;
  titleHi: string | null;
  excerpt: string | null;
  url: string;
  publishedAt: string | null;
}

export interface PublicRelatedLink {
  id: string;
  titleEn: string;
  titleHi: string | null;
  url: string;
  category: string | null;
  isExternal: boolean;
}

export interface PublicPageSummary {
  slug: string;
  titleEn: string;
  titleHi: string | null;
  excerptEn: string | null;
  excerptHi: string | null;
  imageUrl: string | null;
  logoImageUrl: string | null;
  pageType?: PageType;
}

export interface PublicCalendarEvent {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string | null;
  eventDate: string;
  url: string;
  source: "media" | "news";
  kind: string | null;
}

export type { PaginatedResult } from "@/lib/data/pagination";
