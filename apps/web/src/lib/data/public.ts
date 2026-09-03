import { unstable_cache } from "next/cache";

import { Functions, Tables } from "@/lib/database/names";
import type {
  AttachmentPath,
  Banner,
  Circular,
  Download,
  MediaAlbum,
  MediaItem,
  MenuItem,
  NewsItem,
  Page,
  PageContactLine,
  PageGalleryItem,
  PageNewsTickerItem,
  PageStudentCornerItem,
  PageSidebarItem,
  RelatedLink,
  Tender,
} from "@/lib/database/types";
import { heroBannerTitle } from "@/lib/banners/hero-display";
import type {
  PublicCalendarEvent,
  PublicCollegePage,
  PublicCollegeSection,
  PublicCollegeSubsection,
  PublicCircularItem,
  PublicDownloadItem,
  PublicGalleryImage,
  PublicNewsTickerItem,
  PublicStudentCornerItem,
  PublicHeroSlide,
  PublicMediaAlbumDetail,
  PublicMediaAlbumItem,
  PublicNavItem,
  PublicNewsItem,
  PublicOfficePortalData,
  PublicFacultyProfileStaff,
  PublicPage,
  PublicPgStudiesHub,
  PublicPgStudiesSection,
  PublicPageSummary,
  PublicQuickLink,
  PublicSidebarLink,
  PublicRelatedLink,
  PublicSiteChrome,
  PublicTenderItem,
  PublicResearchStationCard,
} from "@/lib/data/public-types";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  paginationRange,
  type PaginatedResult,
} from "@/lib/data/pagination";
import { navItems as mockNavItems, quickLinks as mockQuickLinks } from "@/lib/mock/site-content";
import {
  PG_STUDIES_HUB_SLUG,
  pgStudiesSectionSlugFromUrl,
  pgStudiesSectionUrlSegment,
} from "@/lib/pages/routes";
import { resolvePagePublicPath, getCollegePagePlacement } from "@/lib/pages/resolve-public-path";
import { KRISHI_VIGYAN_KENDRA_SLUGS } from "@/lib/pages/krishi-vigyan-kendras";
import { REGIONAL_RESEARCH_STATION_SLUGS } from "@/lib/pages/regional-research-stations";
import { compareBySortOrderThenTitle } from "@/lib/pages/college-nav";
import {
  readStoredLayoutConfig,
  type PageLayoutConfig,
} from "@/lib/pages/layout-config";
import { getStoredFileUrl, resolvePublicMediaUrl } from "@/lib/storage/urls";
import { getPublicFacultyFromAssignment, listPublicStaffForPage } from "@/lib/faculty/people";
import { getSiteSettings } from "@/lib/settings/site-settings";
import { socialLinksFromSettings } from "@/lib/social/public-social-links";
import { createAdminClient } from "@/lib/supabase/admin";

function mapAttachments(paths: AttachmentPath[]) {
  return paths.map((a) => ({
    path: a.path,
    name: a.name,
    url: getStoredFileUrl(a.path),
  }));
}

function isBannerActive(banner: Banner, now = Date.now()): boolean {
  if (!banner.is_active) return false;
  if (banner.start_date && new Date(banner.start_date).getTime() > now) return false;
  if (banner.end_date && new Date(banner.end_date).getTime() < now) return false;
  return true;
}

function resolveMenuHref(item: MenuItem, pageById: Map<string, Page>): string {
  if (item.page_id) {
    const page = pageById.get(item.page_id);
    if (page) return resolvePagePublicPath(page, pageById);
    // Fall back to stored href when page_id is set but missing from the published map
    // (e.g. pagination gaps or unpublished target).
    if (item.href?.trim()) return item.href.trim();
    return "#";
  }
  return item.href ?? "#";
}

function buildNavTree(items: MenuItem[], pageById: Map<string, Page>): PublicNavItem[] {
  const active = items.filter((i) => i.is_active);

  function compareMenuItems(a: MenuItem, b: MenuItem): number {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.label_en.localeCompare(b.label_en, undefined, { sensitivity: "base" });
  }

  function childrenOf(parentId: string | null): MenuItem[] {
    return active.filter((i) => i.parent_id === parentId).sort(compareMenuItems);
  }

  function mapItem(item: MenuItem): PublicNavItem {
    const kids = childrenOf(item.id).map(mapItem);
    return {
      labelEn: item.label_en,
      labelHi: item.label_hi,
      href: resolveMenuHref(item, pageById),
      openInNewTab: item.open_in_new_tab,
      children: kids.length > 0 ? kids : undefined,
    };
  }

  return childrenOf(null).map(mapItem);
}

function mapLayoutConfig(page: Page): PageLayoutConfig {
  const template = page.layout_template ?? "college_home";
  return readStoredLayoutConfig(page.layout_config, template);
}

function mapPublicPage(page: Page): PublicPage {
  const layoutTemplate = page.layout_template ?? "standard";
  return {
    slug: page.slug,
    titleEn: page.title_en,
    titleHi: page.title_hi,
    contentEn: page.content_en,
    contentHi: page.content_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    metaTitle: page.meta_title,
    metaDescription: page.meta_description,
    publishedAt: page.published_at,
    pageType: page.page_type ?? "standard",
    layoutTemplate,
    layoutConfig:
      page.page_type === "college" || layoutTemplate !== "standard"
        ? mapLayoutConfig(page)
        : undefined,
    featuredImageUrl:
      page.featured_image_path && page.featured_image_path !== "pending"
        ? getStoredFileUrl(page.featured_image_path)
        : null,
    logoImageUrl:
      page.logo_image_path && page.logo_image_path !== "pending"
        ? getStoredFileUrl(page.logo_image_path)
        : null,
  };
}

const MENU_ITEM_PUBLIC_SELECT =
  "id, menu_id, parent_id, label_en, label_hi, href, page_id, sort_order, is_active, open_in_new_tab";
const BANNER_PUBLIC_SELECT =
  "title, image_path, target_url, alt_text, start_date, end_date, priority, is_active";
const NEWS_LIST_PUBLIC_SELECT =
  "id, slug, title_en, title_hi, category, notice_type, published_at, expires_at, is_featured, is_pinned, attachment_paths";
const CIRCULAR_PUBLIC_SELECT =
  "id, circular_number, title_en, title_hi, published_at, department_id, file_name, file_path";
const TENDER_LIST_PUBLIC_SELECT =
  "id, slug, tender_number, title_en, title_hi, description_en, description_hi, category, status, closing_date, published_at, department_id, document_paths";
const DOWNLOAD_PUBLIC_SELECT =
  "id, title_en, title_hi, category, version, department_id, tags, file_name, file_path, download_count, expires_at";

function mockHeaderNav(): PublicNavItem[] {
  return mockNavItems.map((item) => ({
    labelEn: item.labelEn,
    labelHi: item.labelHi,
    href: item.href,
    children: item.children?.map((child) => ({
      labelEn: child,
      labelHi: null,
      href: "#",
    })),
  }));
}

function mockQuickLinkItems(): PublicQuickLink[] {
  return mockQuickLinks.map((label) => ({
    labelEn: label,
    labelHi: null,
    href: "#",
  }));
}

export async function getActiveBannersUncached(): Promise<PublicHeroSlide[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.banners)
    .select(BANNER_PUBLIC_SELECT)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  const slides: PublicHeroSlide[] = [];

  for (const banner of (data as Banner[]) ?? []) {
    if (!isBannerActive(banner)) continue;
    const image =
      banner.image_path !== "pending" &&
      !banner.image_path.startsWith("legacy-pending/")
        ? getStoredFileUrl(banner.image_path)
        : null;
    if (!image) continue;
    const rawTitle = banner.title?.trim() ?? "";
    slides.push({
      titleEn: heroBannerTitle(rawTitle) ?? "",
      titleHi: null,
      subtitleEn: null,
      imageAltEn: banner.alt_text ?? rawTitle ?? "CCSHAU homepage banner",
      imageAltHi: null,
      image,
      targetUrl: banner.target_url,
    });
  }

  return slides;
}

export const getActiveBanners = unstable_cache(
  getActiveBannersUncached,
  ["ccshau-public-active-banners"],
  { revalidate: 60, tags: ["public-banners"] },
);

export async function getPublishedNews(options?: {
  limit?: number;
  category?: string;
  /** When true, only homepage-featured news (for yellow ticker). */
  featuredOnly?: boolean;
}): Promise<PublicNewsItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.news)
    .select(NEWS_LIST_PUBLIC_SELECT)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.featuredOnly) {
    query = query.eq("is_featured", true);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  const now = Date.now();
  return ((data as NewsItem[] ?? [])
    .filter((item) => {
      if (!item.expires_at) return true;
      return new Date(item.expires_at).getTime() > now;
    })
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      titleEn: item.title_en,
      titleHi: item.title_hi,
      bodyEn: null,
      bodyHi: null,
      category: item.category,
      noticeType: item.notice_type,
      publishedAt: item.published_at,
      attachmentPaths: mapAttachments(item.attachment_paths ?? []),
    })));
}

export async function getPublishedNewsPage(options: {
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<PaginatedResult<PublicNewsItem>> {
  const admin = createAdminClient();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!admin) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  let query = admin
    .from(Tables.news)
    .select(NEWS_LIST_PUBLIC_SELECT, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (options.category && options.category !== "All") {
    query = query.eq("category", options.category);
  }

  const { from, to } = paginationRange(page, pageSize);
  const { data, count } = await query.range(from, to);

  const items = ((data as NewsItem[]) ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    bodyEn: null,
    bodyHi: null,
    category: item.category,
    noticeType: item.notice_type,
    publishedAt: item.published_at,
    attachmentPaths: mapAttachments(item.attachment_paths ?? []),
  }));

  return buildPaginatedResult(items, count ?? 0, page, pageSize);
}

export async function getPublishedNewsBySlug(slug: string): Promise<PublicNewsItem | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from(Tables.news)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  const item = data as NewsItem;
  return {
    id: item.id,
    slug: item.slug,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    bodyEn: item.body_en,
    bodyHi: item.body_hi,
    category: item.category,
    noticeType: item.notice_type,
    publishedAt: item.published_at,
    attachmentPaths: mapAttachments(item.attachment_paths ?? []),
  };
}

const PUBLIC_TENDER_STATUSES = ["open", "closed", "archived", "cancelled"] as const;

function mapTenderToPublicItem(
  item: Tender,
  deptMap: Map<string, string>,
  corrigenda: PublicTenderItem["corrigenda"] = [],
): PublicTenderItem {
  return {
    id: item.id,
    slug: item.slug,
    tenderNumber: item.tender_number,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    descriptionEn: item.description_en,
    descriptionHi: item.description_hi,
    category: item.category,
    status: item.status,
    closingDate: item.closing_date,
    publishedAt: item.published_at,
    departmentId: item.department_id,
    departmentName: item.department_id ? deptMap.get(item.department_id) ?? null : null,
    cancelledAt: item.cancelled_at,
    cancellationNoticeEn: item.cancellation_notice_en,
    cancellationNoticeHi: item.cancellation_notice_hi,
    cancellationDocument: item.cancellation_document_path
      ? {
          path: item.cancellation_document_path,
          name: item.cancellation_document_name ?? "Cancellation notice",
          url: getStoredFileUrl(item.cancellation_document_path),
        }
      : null,
    documents: mapAttachments(item.document_paths ?? []),
    corrigenda,
  };
}

export async function getPublicTenderFilterDepartments(): Promise<
  { id: string; nameEn: string; nameHi: string | null }[]
> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.departments)
    .select("id, name_en, name_hi")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((dept) => ({
    id: dept.id,
    nameEn: dept.name_en,
    nameHi: dept.name_hi,
  }));
}

export async function getPublicTenders(options?: {
  status?: "open" | "closed" | "archived" | "cancelled";
  limit?: number;
}): Promise<PublicTenderItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.tenders)
    .select(TENDER_LIST_PUBLIC_SELECT)
    .in("status", options?.status ? [options.status] : [...PUBLIC_TENDER_STATUSES])
    .order("published_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  const tenders = (data as Tender[]) ?? [];

  const deptIds = [...new Set(tenders.map((t) => t.department_id).filter(Boolean))] as string[];
  const deptMap = await loadDepartmentNames(admin, deptIds);

  return tenders.map((item) => mapTenderToPublicItem(item, deptMap));
}

export async function getPublicTendersPage(options: {
  page?: number;
  pageSize?: number;
  status?: "open" | "closed" | "archived" | "cancelled" | "all";
  category?: string;
  departmentId?: string;
  q?: string;
}): Promise<PaginatedResult<PublicTenderItem>> {
  const admin = createAdminClient();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!admin) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const statuses =
    options.status && options.status !== "all"
      ? [options.status]
      : [...PUBLIC_TENDER_STATUSES];

  const { from, to } = paginationRange(page, pageSize);
  let query = admin
    .from(Tables.tenders)
    .select(TENDER_LIST_PUBLIC_SELECT, { count: "exact" })
    .in("status", statuses)
    .order("published_at", { ascending: false });

  if (options.category) {
    query = query.eq("category", options.category);
  }

  if (options.departmentId) {
    query = query.eq("department_id", options.departmentId);
  }

  const searchTerm = options.q?.trim();
  if (searchTerm) {
    if (searchTerm.length >= 3) {
      query = query.textSearch("search_vector", searchTerm, {
        type: "websearch",
        config: "english",
      });
    } else {
      const escaped = searchTerm.replace(/[%_]/g, "");
      query = query.or(
        `title_en.ilike.%${escaped}%,tender_number.ilike.%${escaped}%,description_en.ilike.%${escaped}%`,
      );
    }
  }

  const { data, count } = await query.range(from, to);

  const tenders = (data as Tender[]) ?? [];
  const deptIds = [...new Set(tenders.map((t) => t.department_id).filter(Boolean))] as string[];
  const deptMap = await loadDepartmentNames(admin, deptIds);

  const items = tenders.map((item) => mapTenderToPublicItem(item, deptMap));

  return buildPaginatedResult(items, count ?? 0, page, pageSize);
}

export async function getPublicTenderBySlug(slug: string): Promise<PublicTenderItem | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from(Tables.tenders)
    .select("*")
    .eq("slug", slug)
    .in("status", [...PUBLIC_TENDER_STATUSES])
    .maybeSingle();

  if (!data) return null;

  const item = data as Tender;
  const deptMap = item.department_id
    ? await loadDepartmentNames(admin, [item.department_id])
    : new Map<string, string>();

  const { data: corrigenda } = await admin
    .from(Tables.tenderCorrigenda)
    .select("*")
    .eq("tender_id", item.id)
    .order("published_at", { ascending: false });

  return mapTenderToPublicItem(
    item,
    deptMap,
    (corrigenda ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      publishedAt: c.published_at,
      fileName: c.file_name,
      fileUrl: c.file_path ? getStoredFileUrl(c.file_path) : null,
    })),
  );
}

function loadPublishedPageById(pages: Page[] | null): Map<string, Page> {
  return new Map((pages ?? []).map((p) => [p.id, p]));
}

/** Supabase caps each response at 1000 rows — page through for menu href resolution. */
async function listPublishedPagesForPathMap(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<Page[]> {
  const pageSize = 1000;
  const all: Page[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data } = await admin
      .from(Tables.pages)
      .select("id, slug, page_type, parent_id")
      .eq("status", "published")
      .order("id")
      .range(from, from + pageSize - 1);

    if (!data?.length) break;
    all.push(...(data as Page[]));
    if (data.length < pageSize) break;
  }

  return all;
}

async function getMenuLinks(location: "header" | "footer" | "quick_links"): Promise<PublicQuickLink[]> {
  const admin = createAdminClient();
  if (!admin) return mockQuickLinkItems();

  const { data: menu } = await admin
    .from(Tables.menus)
    .select("id")
    .eq("location", location)
    .eq("is_active", true)
    .maybeSingle();

  if (!menu) return location === "header" ? [] : mockQuickLinkItems();

  const [{ data: items }, pages] = await Promise.all([
    admin
      .from(Tables.menuItems)
      .select(MENU_ITEM_PUBLIC_SELECT)
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("sort_order"),
    listPublishedPagesForPathMap(admin),
  ]);

  if (!items?.length) return location === "header" ? [] : mockQuickLinkItems();

  const pageById = loadPublishedPageById(pages);

  if (location === "header") return [];

  return (items as MenuItem[])
    .filter((i) => !i.parent_id && i.is_active)
    .map((item) => ({
      labelEn: item.label_en,
      labelHi: item.label_hi,
      href: resolveMenuHref(item, pageById),
      openInNewTab: item.open_in_new_tab ?? undefined,
    }));
}

async function loadPublicSiteChrome(): Promise<PublicSiteChrome> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      headerNav: mockHeaderNav(),
      quickLinks: mockQuickLinkItems(),
      footerLinks: mockQuickLinkItems(),
      socialLinks: [],
    };
  }

  const { data: headerMenu } = await admin
    .from(Tables.menus)
    .select("id")
    .eq("location", "header")
    .eq("is_active", true)
    .maybeSingle();

  let headerNav: PublicNavItem[] = mockHeaderNav();

  if (headerMenu) {
    const [{ data: headerItems }, pages] = await Promise.all([
      admin
        .from(Tables.menuItems)
        .select(MENU_ITEM_PUBLIC_SELECT)
        .eq("menu_id", headerMenu.id)
        .eq("is_active", true)
        .order("sort_order"),
      listPublishedPagesForPathMap(admin),
    ]);

    if (headerItems?.length) {
      const pageById = loadPublishedPageById(pages);
      headerNav = buildNavTree(headerItems as MenuItem[], pageById);
    }
  }

  const [quickLinks, footerLinks, siteSettings] = await Promise.all([
    getMenuLinks("quick_links"),
    getMenuLinks("footer"),
    getSiteSettings(),
  ]);

  return {
    headerNav,
    quickLinks,
    footerLinks,
    socialLinks: socialLinksFromSettings(siteSettings),
  };
}

export const getPublicSiteChrome = unstable_cache(
  loadPublicSiteChrome,
  ["ccshau-public-site-chrome"],
  { revalidate: 60, tags: ["public-chrome"] },
);

export async function getPublishedPageBySlug(slug: string): Promise<PublicPage | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  return mapPublicPage(data as Page);
}

function mapCollegeSubsection(page: Page): PublicCollegeSubsection {
  const base = mapPublicPage(page);
  return {
    pageId: page.id,
    slug: page.slug,
    sortOrder: page.sort_order ?? 0,
    layoutConfig: mapLayoutConfig(page),
    titleEn: page.title_en,
    titleHi: page.title_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    contentEn: page.content_en,
    contentHi: page.content_hi,
    featuredImageUrl: base.featuredImageUrl,
    logoImageUrl: base.logoImageUrl,
  };
}

function mapCollegeSection(page: Page, subsections: Page[]): PublicCollegeSection {
  const base = mapPublicPage(page);
  return {
    pageId: page.id,
    slug: page.slug,
    layoutTemplate: page.layout_template ?? "standard",
    layoutConfig: mapLayoutConfig(page),
    titleEn: page.title_en,
    titleHi: page.title_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    contentEn: page.content_en,
    contentHi: page.content_hi,
    featuredImageUrl: base.featuredImageUrl,
    logoImageUrl: base.logoImageUrl,
    subsections: subsections
      .slice()
      .sort((a, b) =>
        compareBySortOrderThenTitle(
          { sortOrder: a.sort_order, titleEn: a.title_en },
          { sortOrder: b.sort_order, titleEn: b.title_en },
        ),
      )
      .map(mapCollegeSubsection),
  };
}

async function resolveSidebarHref(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  item: PageSidebarItem,
  pageById: Map<string, Page>,
): Promise<string> {
  if (item.linked_page_id) {
    const linked = pageById.get(item.linked_page_id);
    if (linked) {
      return resolvePagePublicPath(linked, pageById);
    }
  }
  return item.href?.trim() || "#";
}

export async function getOfficePortalDataForPage(
  page: Page,
  pageById?: Map<string, Page>,
): Promise<PublicOfficePortalData> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      contactLines: [],
      staff: [],
      sidebarLeft: [],
      sidebarRight: [],
      headOfficer: null,
      officeCtaEnabled: page.office_cta_enabled ?? true,
    };
  }

  const [contactsRes, peopleStaffRes, sidebarRes, pagesRes] = await Promise.all([
    admin
      .from(Tables.pageContactLines)
      .select("*")
      .eq("page_id", page.id)
      .eq("is_active", true)
      .order("sort_order"),
    listPublicStaffForPage(admin, page.id),
    admin
      .from(Tables.pageSidebarItems)
      .select("*")
      .eq("page_id", page.id)
      .eq("is_active", true)
      .order("sort_order"),
    pageById
      ? Promise.resolve({ data: [...pageById.values()] })
      : listPublishedPagesForPathMap(admin).then((pages) => ({ data: pages })),
  ]);

  const pagesMap =
    pageById ??
    new Map((((pagesRes.data as Page[]) ?? []).map((p) => [p.id, p] as const)));

  const sidebarItems = (sidebarRes.data ?? []) as PageSidebarItem[];
  let effectiveSidebarItems = sidebarItems;

  if (sidebarItems.length === 0) {
    const ancestorIds = [page.parent_id, page.college_root_id].filter(
      (id, index, ids): id is string =>
        Boolean(id) && id !== page.id && ids.indexOf(id) === index,
    );
    for (const ancestorId of ancestorIds) {
      const { data: ancestorSidebars } = await admin
        .from(Tables.pageSidebarItems)
        .select("*")
        .eq("page_id", ancestorId)
        .eq("is_active", true)
        .order("sort_order");
      if ((ancestorSidebars ?? []).length > 0) {
        effectiveSidebarItems = ancestorSidebars as PageSidebarItem[];
        break;
      }
    }
  }

  let peopleStaff = peopleStaffRes;
  if (
    peopleStaff.length === 0 &&
    page.college_root_id &&
    page.college_root_id !== page.id
  ) {
    peopleStaff = await listPublicStaffForPage(admin, page.college_root_id);
  }

  const sidebarLeft: PublicSidebarLink[] = [];
  const sidebarRight: PublicSidebarLink[] = [];

  for (const item of effectiveSidebarItems) {
    const hasUrl = !!(item.href?.trim() || item.linked_page_id);
    const link: PublicSidebarLink = {
      id: item.id,
      labelEn: item.label_en,
      labelHi: item.label_hi,
      href: hasUrl ? await resolveSidebarHref(admin, item, pagesMap) : null,
      contentEn: item.content_en,
      contentHi: item.content_hi,
    };
    if (item.side === "left") sidebarLeft.push(link);
    else sidebarRight.push(link);
  }

  const headOfficer =
    page.head_name_en && page.head_image_path
      ? {
          nameEn: page.head_name_en,
          nameHi: page.head_name_hi,
          roleEn: page.head_role_en ?? "",
          roleHi: page.head_role_hi,
          imageUrl: getStoredFileUrl(page.head_image_path),
        }
      : page.head_name_en
        ? {
            nameEn: page.head_name_en,
            nameHi: page.head_name_hi,
            roleEn: page.head_role_en ?? "",
            roleHi: page.head_role_hi,
            imageUrl: page.head_image_path ? getStoredFileUrl(page.head_image_path) : null,
          }
        : null;

  return {
    contactLines: ((contactsRes.data ?? []) as PageContactLine[]).map((row) => ({
      labelEn: row.label_en,
      labelHi: row.label_hi,
      valueEn: row.value_en,
      valueHi: row.value_hi,
    })),
    staff: peopleStaff,
    sidebarLeft,
    sidebarRight,
    headOfficer,
    officeCtaEnabled: page.office_cta_enabled ?? true,
  };
}

export async function getOfficePortalDataByPageId(
  pageId: string,
): Promise<PublicOfficePortalData | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.pages).select("*").eq("id", pageId).maybeSingle();
  if (!data) return null;
  return getOfficePortalDataForPage(data as Page);
}

export async function getPageGalleryItemsByPageId(pageId: string): Promise<PublicGalleryImage[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.pageGalleryItems)
    .select("*")
    .eq("page_id", pageId)
    .eq("is_active", true)
    .order("sort_order");

  return ((data ?? []) as PageGalleryItem[]).map((row) => ({
    id: row.id,
    imageUrl: resolvePublicMediaUrl(row.image_url) ?? "",
    thumbnailUrl: resolvePublicMediaUrl(row.thumbnail_url),
    titleEn: row.title_en,
    titleHi: row.title_hi,
  })).filter((row) => Boolean(row.imageUrl));
}

export async function getPageNewsTickerItemsByPageId(
  pageId: string,
): Promise<PublicNewsTickerItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.pageNewsTickerItems)
    .select("*")
    .eq("page_id", pageId)
    .eq("is_active", true)
    .order("sort_order");

  const now = Date.now();

  return ((data ?? []) as PageNewsTickerItem[])
    .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > now)
    .map((row) => ({
    id: row.id,
    titleEn: row.title_en,
    titleHi: row.title_hi,
    href: row.href ?? (row.file_path ? getStoredFileUrl(row.file_path) : null),
    isNew: row.is_new,
  }));
}

export async function getPageStudentCornerItemsByPageId(
  pageId: string,
): Promise<PublicStudentCornerItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.pageStudentCornerItems)
    .select("*")
    .eq("page_id", pageId)
    .eq("is_active", true)
    .order("sort_order");

  const now = Date.now();

  return ((data ?? []) as PageStudentCornerItem[])
    .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > now)
    .map((row) => ({
      id: row.id,
      titleEn: row.title_en,
      titleHi: row.title_hi,
      href: row.href ?? (row.file_path ? getStoredFileUrl(row.file_path) : null),
      isNew: row.is_new,
    }));
}

const NEHRU_LIBRARY_TOP_NAV_SLUGS = new Set([
  "about-library",
  "resources",
  "library-timings-holidays",
  "digital-library",
]);

const CAMPUS_SCHOOL_TOP_NAV_SLUGS = new Set([
  "cs-about-us",
  "cs-messages",
  "cs-video-gallery",
  "cs-school-management",
  "cs-school-info",
  "campus-school-gallery",
]);

/** Structural college nav sections only (legacy: Departments + Gallery). */
function isCollegeTopNavSection(page: Page, collegeSlug?: string): boolean {
  if (collegeSlug === "nehru-library") {
    return NEHRU_LIBRARY_TOP_NAV_SLUGS.has(String(page.slug || "").toLowerCase());
  }
  if (collegeSlug === "campus-school") {
    return CAMPUS_SCHOOL_TOP_NAV_SLUGS.has(String(page.slug || "").toLowerCase());
  }
  const slug = String(page.slug || "").toLowerCase();
  const title = String(page.title_en || "").trim().toLowerCase();
  return (
    /^(department|departments|gallery|dhrm)$/.test(slug) ||
    /(?:^|-)department$/.test(slug) ||
    /(?:^|-)gallery$/.test(slug) ||
    slug === "alumni-association-executive-committee" ||
    title === "departments" ||
    title === "department" ||
    title === "gallery" ||
    title === "dhrm" ||
    title === "d h r m" ||
    title === "dsw sections" ||
    title === "sections" ||
    title === "alumni ass. executive committee" ||
    title === "alumni association executive committee"
  );
}

export async function getPublishedCollegeBySlug(slug: string): Promise<PublicCollegePage | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  let { data } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("slug", slug)
    .eq("page_type", "college")
    .eq("status", "published")
    .maybeSingle();

  if (!data) {
    const { data: officeFallback } = await admin
      .from(Tables.pages)
      .select("*")
      .eq("slug", slug)
      .eq("layout_template", "office_portal")
      .eq("status", "published")
      .maybeSingle();

    if (officeFallback && slug !== PG_STUDIES_HUB_SLUG) {
      const { data: publishedPages } = await admin
        .from(Tables.pages)
        .select("id, slug, page_type, parent_id")
        .eq("status", "published");
      const pageById = new Map(((publishedPages as Page[]) ?? []).map((p) => [p.id, p]));
      if (getCollegePagePlacement(officeFallback as Page, pageById) === "root") {
        data = officeFallback;
      }
    }
  }

  if (!data) return null;
  const college = data as Page;

  const { data: publishedPages } = await admin
    .from(Tables.pages)
    .select("id, slug, page_type, parent_id")
    .eq("status", "published");
  const pageById = new Map(((publishedPages as Page[]) ?? []).map((p) => [p.id, p]));
  if (getCollegePagePlacement(college, pageById) !== "root") return null;

  const { data: sections } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("parent_id", college.id)
    .eq("status", "published")
    .order("sort_order")
    .order("title_en");

  // College top nav should match legacy: Home | Departments | Gallery | Contact —
  // not every CMS child page attached under the college root.
  const sectionRows = ((sections as Page[]) ?? []).filter((page) =>
    isCollegeTopNavSection(page, college.slug),
  );
  const sectionIds = sectionRows.map((s) => s.id);

  let subsectionRows: Page[] = [];
  if (sectionIds.length > 0) {
    const { data: subsections } = await admin
      .from(Tables.pages)
      .select("*")
      .in("parent_id", sectionIds)
      .eq("status", "published")
      .order("sort_order")
      .order("title_en");
    subsectionRows = (subsections as Page[]) ?? [];
  }

  const subsectionsBySection = new Map<string, Page[]>();
  for (const subsection of subsectionRows) {
    if (!subsection.parent_id) continue;
    const list = subsectionsBySection.get(subsection.parent_id) ?? [];
    list.push(subsection);
    subsectionsBySection.set(subsection.parent_id, list);
  }

  const base = mapPublicPage(college);
  return {
    ...base,
    pageId: college.id,
    pageType: "college",
    collegeSlug: college.slug,
    layoutTemplate: college.layout_template ?? "college_home",
    layoutConfig: mapLayoutConfig(college),
    mapLat: college.map_lat ?? null,
    mapLng: college.map_lng ?? null,
    sections: sectionRows.map((section) =>
      mapCollegeSection(section, subsectionsBySection.get(section.id) ?? []),
    ),
  };
}

const PG_STUDIES_DROPDOWN_SLUGS = new Set([
  "post-graduate-studies",
  "pg-course-catalogue",
  "pg-proforma",
  "seminar-registration",
]);

const PG_STUDIES_DROPDOWN_ORDER = [
  "post-graduate-studies",
  "pg-course-catalogue",
  "pg-proforma",
  "seminar-registration",
] as const;

const PG_STUDIES_TOP_NAV_SLUGS = new Set(["pg-studies-gallery", "pg-studies-contact"]);

function mapPgStudiesSection(page: Page): PublicPgStudiesSection {
  return {
    pageId: page.id,
    slug: page.slug,
    urlSegment: pgStudiesSectionUrlSegment(page.slug),
    layoutConfig: mapLayoutConfig(page),
    titleEn: page.title_en,
    titleHi: page.title_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    contentEn: page.content_en,
    contentHi: page.content_hi,
  };
}

export async function getPublishedPgStudiesHub(): Promise<PublicPgStudiesHub | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: hubRow } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("slug", PG_STUDIES_HUB_SLUG)
    .eq("status", "published")
    .maybeSingle();

  if (!hubRow) return null;
  const hub = hubRow as Page;

  const { data: sections } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("parent_id", hub.id)
    .eq("status", "published")
    .order("sort_order")
    .order("title_en");

  const sectionRows = ((sections as Page[]) ?? []).map(mapPgStudiesSection);
  const base = mapPublicPage(hub);

  const dropdownSections = sectionRows
    .filter((section) => PG_STUDIES_DROPDOWN_SLUGS.has(section.slug))
    .sort((a, b) => {
      const ai = PG_STUDIES_DROPDOWN_ORDER.indexOf(
        a.slug as (typeof PG_STUDIES_DROPDOWN_ORDER)[number],
      );
      const bi = PG_STUDIES_DROPDOWN_ORDER.indexOf(
        b.slug as (typeof PG_STUDIES_DROPDOWN_ORDER)[number],
      );
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  return {
    ...base,
    pageId: hub.id,
    hubSlug: hub.slug,
    layoutTemplate: hub.layout_template ?? "office_portal",
    layoutConfig: mapLayoutConfig(hub),
    featuredImageUrl: base.featuredImageUrl,
    dropdownSections,
    topSections: sectionRows.filter((section) => PG_STUDIES_TOP_NAV_SLUGS.has(section.slug)),
  };
}

export async function getPublishedPgStudiesSection(
  urlSegment: string,
): Promise<{ hub: PublicPgStudiesHub; section: PublicPgStudiesSection } | null> {
  const hub = await getPublishedPgStudiesHub();
  if (!hub) return null;

  const slug = pgStudiesSectionSlugFromUrl(urlSegment);
  const section = [...hub.dropdownSections, ...hub.topSections].find(
    (item) => item.slug === slug || item.urlSegment === urlSegment,
  );
  if (!section) return null;

  return { hub, section };
}

export async function getPublishedCollegeSubsection(
  collegeSlug: string,
  sectionSlug: string,
  subsectionSlug: string,
): Promise<{
  college: PublicCollegePage;
  section: PublicCollegeSection;
  subsection: PublicCollegeSubsection;
} | null> {
  const college = await getPublishedCollegeBySlug(collegeSlug);
  if (!college) return null;

  const section = college.sections.find((s) => s.slug === sectionSlug);
  if (!section) return null;

  const subsection = section.subsections.find((s) => s.slug === subsectionSlug);
  if (!subsection) return null;

  return { college, section, subsection };
}

export async function getRegionalResearchStationCards(): Promise<PublicResearchStationCard[]> {
  return getMicrositeListingCards([...REGIONAL_RESEARCH_STATION_SLUGS]);
}

export async function getKvkCards(): Promise<PublicResearchStationCard[]> {
  return getMicrositeListingCards([...KRISHI_VIGYAN_KENDRA_SLUGS]);
}

async function getMicrositeListingCards(
  slugs: string[],
): Promise<PublicResearchStationCard[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.pages)
    .select("slug, title_en, title_hi, featured_image_path, page_type")
    .in("slug", slugs)
    .eq("status", "published");

  const bySlug = new Map(((data as Page[]) ?? []).map((page) => [page.slug, page]));

  return slugs.flatMap((slug) => {
    const page = bySlug.get(slug);
    if (!page) return [];
    const imagePath = page.featured_image_path;
    return [
      {
        slug: page.slug,
        titleEn: page.title_en,
        titleHi: page.title_hi,
        href: `/college/${page.slug}`,
        imageUrl:
          imagePath && imagePath !== "pending" ? getStoredFileUrl(imagePath) : null,
      },
    ];
  });
}

export async function getPublishedFacultyProfile(
  collegeSlug: string,
  sectionSlug: string,
  subsectionSlug: string,
  facultySlug: string,
): Promise<{
  college: PublicCollegePage;
  section: PublicCollegeSection;
  department: PublicCollegeSubsection;
  staff: PublicFacultyProfileStaff;
} | null> {
  const ctx = await getPublishedCollegeSubsection(collegeSlug, sectionSlug, subsectionSlug);
  if (!ctx) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const fromAssignment = await getPublicFacultyFromAssignment(admin, ctx.subsection.pageId, facultySlug);
  if (!fromAssignment) return null;

  return {
    college: ctx.college,
    section: ctx.section,
    department: ctx.subsection,
    staff: {
      ...fromAssignment,
      detailContentEn: fromAssignment.detailContentEn ?? null,
      detailContentHi: fromAssignment.detailContentHi ?? null,
    },
  };
}

export async function getPublishedPagePublicPath(slug: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: page } = await admin
    .from(Tables.pages)
    .select("id, slug, page_type, parent_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!page) return null;

  const { data: pages } = await admin
    .from(Tables.pages)
    .select("id, slug, page_type, parent_id")
    .eq("status", "published");

  const pageById = new Map(((pages as Page[]) ?? []).map((p) => [p.id, p]));
  return resolvePagePublicPath(page as Page, pageById);
}

export async function getPublishedCollegeSection(
  collegeSlug: string,
  sectionSlug: string,
): Promise<{ college: PublicCollegePage; section: PublicCollegeSection } | null> {
  const college = await getPublishedCollegeBySlug(collegeSlug);
  if (!college) return null;

  const section = college.sections.find((s) => s.slug === sectionSlug);
  if (!section) return null;

  return { college, section };
}

async function loadDepartmentNames(admin: ReturnType<typeof createAdminClient>, ids: string[]) {
  const deptMap = new Map<string, string>();
  if (!admin || ids.length === 0) return deptMap;

  const { data: depts } = await admin
    .from(Tables.departments)
    .select("id, name_en")
    .in("id", ids);

  for (const dept of depts ?? []) {
    deptMap.set(dept.id, dept.name_en);
  }
  return deptMap;
}

export async function getPublishedCirculars(options?: {
  query?: string;
}): Promise<PublicCircularItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.circulars)
    .select(CIRCULAR_PUBLIC_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const circulars = (data as Circular[]) ?? [];
  const deptIds = [...new Set(circulars.map((c) => c.department_id).filter(Boolean))] as string[];
  const deptMap = await loadDepartmentNames(admin, deptIds);

  const q = options?.query?.trim().toLowerCase();
  const filtered = q
    ? circulars.filter(
        (c) =>
          c.title_en.toLowerCase().includes(q) ||
          (c.title_hi?.toLowerCase().includes(q) ?? false) ||
          (c.circular_number?.toLowerCase().includes(q) ?? false),
      )
    : circulars;

  return filtered.map((item) => ({
    id: item.id,
    circularNumber: item.circular_number,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    publishedAt: item.published_at,
    departmentName: item.department_id ? deptMap.get(item.department_id) ?? null : null,
    fileName: item.file_name,
    fileUrl: item.file_path ? getStoredFileUrl(item.file_path) : null,
  }));
}

function mapDownloadToPublicItem(
  item: Download,
  deptMap: Map<string, string>,
): PublicDownloadItem {
  return {
    id: item.id,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    category: item.category,
    version: item.version,
    departmentId: item.department_id,
    departmentName: item.department_id ? deptMap.get(item.department_id) ?? null : null,
    tags: item.tags ?? [],
    fileName: item.file_name,
    fileUrl: getStoredFileUrl(item.file_path),
    downloadUrl: `/api/downloads/${item.id}/file`,
    downloadCount: item.download_count,
    expiresAt: item.expires_at,
  };
}

export async function getPublicDownloadTags(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.downloads)
    .select("tags")
    .eq("status", "published")
    .eq("is_public", true);

  const tagSet = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of (row.tags as string[]) ?? []) {
      if (tag) tagSet.add(tag);
    }
  }

  return [...tagSet].sort((a, b) => a.localeCompare(b));
}

export async function getPublicDownloadFilterDepartments(): Promise<
  { id: string; nameEn: string; nameHi: string | null }[]
> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.departments)
    .select("id, name_en, name_hi")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((dept) => ({
    id: dept.id,
    nameEn: dept.name_en,
    nameHi: dept.name_hi,
  }));
}

export async function getPublishedDownloads(options?: {
  category?: string;
  departmentId?: string;
  tag?: string;
  query?: string;
  limit?: number;
}): Promise<PublicDownloadItem[]> {
  const page = await getPublishedDownloadsPage({
    category: options?.category,
    departmentId: options?.departmentId,
    tag: options?.tag,
    query: options?.query,
    page: 1,
    pageSize: options?.limit ?? 500,
  });
  return page.items;
}

export async function getPublishedDownloadsPage(options: {
  page?: number;
  pageSize?: number;
  category?: string;
  departmentId?: string;
  tag?: string;
  query?: string;
}): Promise<PaginatedResult<PublicDownloadItem>> {
  const admin = createAdminClient();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!admin) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const now = new Date().toISOString();
  const { from, to } = paginationRange(page, pageSize);

  let query = admin
    .from(Tables.downloads)
    .select(DOWNLOAD_PUBLIC_SELECT, { count: "exact" })
    .eq("status", "published")
    .eq("is_public", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("title_en", { ascending: true });

  if (options.category) {
    query = query.eq("category", options.category);
  }

  if (options.departmentId) {
    query = query.eq("department_id", options.departmentId);
  }

  if (options.tag) {
    query = query.contains("tags", [options.tag]);
  }

  const searchTerm = options.query?.trim();
  if (searchTerm) {
    if (searchTerm.length >= 3) {
      query = query.textSearch("search_vector", searchTerm, {
        type: "websearch",
        config: "english",
      });
    } else {
      const escaped = searchTerm.replace(/[%_]/g, "");
      query = query.or(
        `title_en.ilike.%${escaped}%,title_hi.ilike.%${escaped}%,category.ilike.%${escaped}%`,
      );
    }
  }

  const { data, count } = await query.range(from, to);
  const downloads = (data as Download[]) ?? [];
  const deptIds = [...new Set(downloads.map((d) => d.department_id).filter(Boolean))] as string[];
  const deptMap = await loadDepartmentNames(admin, deptIds);

  const items = downloads.map((item) => mapDownloadToPublicItem(item, deptMap));
  return buildPaginatedResult(items, count ?? 0, page, pageSize);
}

export async function getPublishedMediaAlbums(options?: {
  limit?: number;
  albumType?: string;
}): Promise<PublicMediaAlbumItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.mediaAlbums)
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (options?.albumType) {
    query = query.eq("album_type", options.albumType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: albums } = await query;
  const list = (albums as MediaAlbum[]) ?? [];
  if (!list.length) return [];

  const albumIds = list.map((a) => a.id);
  const { data: items } = await admin
    .from(Tables.mediaItems)
    .select("album_id")
    .in("album_id", albumIds);

  const countMap = new Map<string, number>();
  for (const row of items ?? []) {
    countMap.set(row.album_id, (countMap.get(row.album_id) ?? 0) + 1);
  }

  return list.map((album) => ({
    id: album.id,
    slug: album.slug,
    titleEn: album.title_en,
    titleHi: album.title_hi,
    albumType: album.album_type,
    eventDate: album.event_date,
    publishedAt: album.published_at,
    coverUrl: album.cover_image_path ? getStoredFileUrl(album.cover_image_path) : null,
    itemCount: countMap.get(album.id) ?? 0,
  }));
}

export async function getMediaAlbumBySlug(slug: string): Promise<PublicMediaAlbumDetail | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from(Tables.mediaAlbums)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  const album = data as MediaAlbum;

  const { data: items } = await admin
    .from(Tables.mediaItems)
    .select("*")
    .eq("album_id", album.id)
    .order("sort_order");

  return {
    id: album.id,
    slug: album.slug,
    titleEn: album.title_en,
    titleHi: album.title_hi,
    albumType: album.album_type,
    eventDate: album.event_date,
    publishedAt: album.published_at,
    coverUrl: album.cover_image_path ? getStoredFileUrl(album.cover_image_path) : null,
    itemCount: (items ?? []).length,
    items: ((items as MediaItem[]) ?? []).map((item) => ({
      id: item.id,
      titleEn: item.title_en,
      titleHi: item.title_hi,
      mediaType: item.media_type,
      url: getStoredFileUrl(item.storage_path),
      thumbnailUrl: item.thumbnail_path ? getStoredFileUrl(item.thumbnail_path) : null,
      captionEn: item.caption_en,
      captionHi: item.caption_hi,
    })),
  };
}

export async function getPublishedCircularsPage(options: {
  page?: number;
  pageSize?: number;
  query?: string;
}): Promise<PaginatedResult<PublicCircularItem>> {
  const all = await getPublishedCirculars({ query: options.query });
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  return buildPaginatedResult(items, all.length, page, pageSize);
}

export async function getPublishedMediaAlbumsPage(options: {
  page?: number;
  pageSize?: number;
  albumType?: string;
}): Promise<PaginatedResult<PublicMediaAlbumItem>> {
  const admin = createAdminClient();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!admin) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  let query = admin
    .from(Tables.mediaAlbums)
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (options.albumType && options.albumType !== "all") {
    query = query.eq("album_type", options.albumType);
  }

  const { from, to } = paginationRange(page, pageSize);
  const { data: albums, count } = await query.range(from, to);
  const list = (albums as MediaAlbum[]) ?? [];
  if (!list.length) {
    return buildPaginatedResult([], count ?? 0, page, pageSize);
  }

  const albumIds = list.map((a) => a.id);
  const { data: items } = await admin
    .from(Tables.mediaItems)
    .select("album_id")
    .in("album_id", albumIds);

  const countMap = new Map<string, number>();
  for (const row of items ?? []) {
    countMap.set(row.album_id, (countMap.get(row.album_id) ?? 0) + 1);
  }

  const mapped = list.map((album) => ({
    id: album.id,
    slug: album.slug,
    titleEn: album.title_en,
    titleHi: album.title_hi,
    albumType: album.album_type,
    eventDate: album.event_date,
    publishedAt: album.published_at,
    coverUrl: album.cover_image_path ? getStoredFileUrl(album.cover_image_path) : null,
    itemCount: countMap.get(album.id) ?? 0,
  }));

  return buildPaginatedResult(mapped, count ?? 0, page, pageSize);
}

function mapPageSummary(page: Page): PublicPageSummary {
  return {
    slug: page.slug,
    titleEn: page.title_en,
    titleHi: page.title_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    imageUrl:
      page.featured_image_path && page.featured_image_path !== "pending"
        ? getStoredFileUrl(page.featured_image_path)
        : null,
    logoImageUrl:
      page.logo_image_path && page.logo_image_path !== "pending"
        ? getStoredFileUrl(page.logo_image_path)
        : null,
    pageType: page.page_type ?? "standard",
  };
}

export async function getPublishedChildPagesByParentSlug(
  parentSlug: string,
): Promise<PublicPageSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: parent } = await admin
    .from(Tables.pages)
    .select("id")
    .eq("slug", parentSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!parent) return [];

  const { data } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("parent_id", parent.id)
    .eq("status", "published")
    .order("sort_order")
    .order("title_en");

  return ((data as Page[]) ?? []).map(mapPageSummary);
}

export async function getActiveRelatedLinks(): Promise<PublicRelatedLink[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.relatedLinks)
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("title_en");

  return ((data as RelatedLink[]) ?? []).map((item) => ({
    id: item.id,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    url: item.url,
    category: item.category,
    isExternal: item.is_external,
  }));
}

function monthDateRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function toCalendarEventFromMedia(album: MediaAlbum): PublicCalendarEvent | null {
  if (!album.event_date) return null;
  return {
    id: album.id,
    slug: album.slug,
    titleEn: album.title_en,
    titleHi: album.title_hi,
    eventDate: album.event_date,
    url: `/media/${album.slug}`,
    source: "media",
    kind: album.album_type,
  };
}

function toCalendarEventFromNews(item: NewsItem): PublicCalendarEvent | null {
  if (!item.published_at) return null;
  return {
    id: item.id,
    slug: item.slug,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    eventDate: item.published_at.slice(0, 10),
    url: `/news/${item.slug}`,
    source: "news",
    kind: item.category,
  };
}

export async function getCalendarEventsForMonth(
  year: number,
  month: number,
): Promise<PublicCalendarEvent[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { start, end } = monthDateRange(year, month);

  const [{ data: albums }, { data: news }] = await Promise.all([
    admin
      .from(Tables.mediaAlbums)
      .select("*")
      .eq("status", "published")
      .not("event_date", "is", null)
      .gte("event_date", start)
      .lt("event_date", end)
      .order("event_date"),
    admin
      .from(Tables.news)
      .select("*")
      .eq("status", "published")
      .eq("category", "events")
      .gte("published_at", `${start}T00:00:00.000Z`)
      .lt("published_at", `${end}T00:00:00.000Z`)
      .order("published_at"),
  ]);

  const events: PublicCalendarEvent[] = [];
  for (const album of (albums as MediaAlbum[]) ?? []) {
    const mapped = toCalendarEventFromMedia(album);
    if (mapped) events.push(mapped);
  }
  for (const item of (news as NewsItem[]) ?? []) {
    const mapped = toCalendarEventFromNews(item);
    if (mapped) events.push(mapped);
  }

  return events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

export async function getUpcomingCalendarEvents(limit = 8): Promise<PublicCalendarEvent[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: albums }, { data: news }] = await Promise.all([
    admin
      .from(Tables.mediaAlbums)
      .select("*")
      .eq("status", "published")
      .not("event_date", "is", null)
      .gte("event_date", today)
      .order("event_date")
      .limit(limit),
    admin
      .from(Tables.news)
      .select("*")
      .eq("status", "published")
      .eq("category", "events")
      .gte("published_at", `${today}T00:00:00.000Z`)
      .order("published_at")
      .limit(limit),
  ]);

  const events: PublicCalendarEvent[] = [];
  for (const album of (albums as MediaAlbum[]) ?? []) {
    const mapped = toCalendarEventFromMedia(album);
    if (mapped) events.push(mapped);
  }
  for (const item of (news as NewsItem[]) ?? []) {
    const mapped = toCalendarEventFromNews(item);
    if (mapped) events.push(mapped);
  }

  return events
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, limit);
}

export const EVENT_PORTALS_PARENT_SLUG = "event-portals";

export async function getPublishedEventPortalBySlug(slug: string): Promise<PublicPage | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: parent } = await admin
    .from(Tables.pages)
    .select("id")
    .eq("slug", EVENT_PORTALS_PARENT_SLUG)
    .maybeSingle();

  if (!parent) return null;

  const { data } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("slug", slug)
    .eq("parent_id", parent.id)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  const page = data as Page;
  return {
    slug: page.slug,
    titleEn: page.title_en,
    titleHi: page.title_hi,
    contentEn: page.content_en,
    contentHi: page.content_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    metaTitle: page.meta_title,
    metaDescription: page.meta_description,
    publishedAt: page.published_at,
  };
}

export async function generateFeedbackTicketNumber(): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc(Functions.generateTicketNumber);
  if (error) return null;
  return data as string;
}
