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
  RelatedLink,
  Tender,
} from "@/lib/database/types";
import type {
  PublicCalendarEvent,
  PublicCollegePage,
  PublicCollegeSection,
  PublicCollegeSubsection,
  PublicCircularItem,
  PublicDownloadItem,
  PublicHeroSlide,
  PublicMediaAlbumDetail,
  PublicMediaAlbumItem,
  PublicNavItem,
  PublicNewsItem,
  PublicPage,
  PublicPageSummary,
  PublicQuickLink,
  PublicRelatedLink,
  PublicSiteChrome,
  PublicTenderItem,
} from "@/lib/data/public-types";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  paginationRange,
  type PaginatedResult,
} from "@/lib/data/pagination";
import { navItems as mockNavItems, quickLinks as mockQuickLinks } from "@/lib/mock/site-content";
import { getPublicPagePath } from "@/lib/pages/routes";
import { resolvePagePublicPath } from "@/lib/pages/resolve-public-path";
import type { PageType } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";
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
    return page ? resolvePagePublicPath(page, pageById) : "#";
  }
  return item.href ?? "#";
}

function buildNavTree(items: MenuItem[], pageById: Map<string, Page>): PublicNavItem[] {
  const active = items.filter((i) => i.is_active);

  function childrenOf(parentId: string | null): MenuItem[] {
    return active
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
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

function mapPublicPage(page: Page): PublicPage {
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

export async function getActiveBanners(): Promise<PublicHeroSlide[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.banners)
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  const slides: PublicHeroSlide[] = [];

  for (const banner of (data as Banner[]) ?? []) {
    if (!isBannerActive(banner)) continue;
    const image =
      banner.image_path !== "pending" ? getStoredFileUrl(banner.image_path) : null;
    if (!image) continue;
    slides.push({
      titleEn: banner.title,
      titleHi: null,
      subtitleEn: banner.alt_text,
      image,
      targetUrl: banner.target_url,
    });
  }

  return slides;
}

export async function getPublishedNews(options?: {
  limit?: number;
  category?: string;
}): Promise<PublicNewsItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.news)
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return (data as NewsItem[] ?? []).map((item) => ({
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
  }));
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
    .select("*", { count: "exact" })
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
    bodyEn: item.body_en,
    bodyHi: item.body_hi,
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

export async function getPublicTenders(options?: {
  status?: "open" | "closed" | "archived";
  limit?: number;
}): Promise<PublicTenderItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.tenders)
    .select("*")
    .in("status", options?.status ? [options.status] : ["open", "closed", "archived"])
    .order("published_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  const tenders = (data as Tender[]) ?? [];

  const deptIds = [...new Set(tenders.map((t) => t.department_id).filter(Boolean))] as string[];
  const deptMap = new Map<string, string>();
  if (deptIds.length > 0) {
    const { data: depts } = await admin
      .from(Tables.departments)
      .select("id, name_en")
      .in("id", deptIds);
    for (const dept of depts ?? []) {
      deptMap.set(dept.id, dept.name_en);
    }
  }

  return tenders.map((item) => ({
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
    departmentName: item.department_id ? deptMap.get(item.department_id) ?? null : null,
    documents: mapAttachments(item.document_paths ?? []),
    corrigenda: [],
  }));
}

export async function getPublicTendersPage(options: {
  page?: number;
  pageSize?: number;
  status?: "open" | "closed" | "archived" | "all";
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
      : ["open", "closed", "archived"];

  const { from, to } = paginationRange(page, pageSize);
  const { data, count } = await admin
    .from(Tables.tenders)
    .select("*", { count: "exact" })
    .in("status", statuses)
    .order("published_at", { ascending: false })
    .range(from, to);

  const tenders = (data as Tender[]) ?? [];
  const deptIds = [...new Set(tenders.map((t) => t.department_id).filter(Boolean))] as string[];
  const deptMap = await loadDepartmentNames(admin, deptIds);

  const items = tenders.map((item) => ({
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
    departmentName: item.department_id ? deptMap.get(item.department_id) ?? null : null,
    documents: mapAttachments(item.document_paths ?? []),
    corrigenda: [],
  }));

  return buildPaginatedResult(items, count ?? 0, page, pageSize);
}

export async function getPublicTenderBySlug(slug: string): Promise<PublicTenderItem | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from(Tables.tenders)
    .select("*")
    .eq("slug", slug)
    .in("status", ["open", "closed", "archived"])
    .maybeSingle();

  if (!data) return null;

  const item = data as Tender;
  let departmentName: string | null = null;
  if (item.department_id) {
    const { data: dept } = await admin
      .from(Tables.departments)
      .select("name_en")
      .eq("id", item.department_id)
      .maybeSingle();
    departmentName = dept?.name_en ?? null;
  }

  const { data: corrigenda } = await admin
    .from(Tables.tenderCorrigenda)
    .select("*")
    .eq("tender_id", item.id)
    .order("published_at", { ascending: false });

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
    departmentName,
    documents: mapAttachments(item.document_paths ?? []),
    corrigenda: (corrigenda ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      publishedAt: c.published_at,
      fileName: c.file_name,
      fileUrl: c.file_path ? getStoredFileUrl(c.file_path) : null,
    })),
  };
}

function loadPublishedPageById(pages: Page[] | null): Map<string, Page> {
  return new Map((pages ?? []).map((p) => [p.id, p]));
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

  const [{ data: items }, { data: pages }] = await Promise.all([
    admin
      .from(Tables.menuItems)
      .select("*")
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("sort_order"),
    admin.from(Tables.pages).select("id, slug, page_type, parent_id").eq("status", "published"),
  ]);

  if (!items?.length) return location === "header" ? [] : mockQuickLinkItems();

  const pageById = loadPublishedPageById(pages as Page[]);

  if (location === "header") return [];

  return (items as MenuItem[])
    .filter((i) => !i.parent_id)
    .map((item) => ({
      labelEn: item.label_en,
      labelHi: item.label_hi,
      href: resolveMenuHref(item, pageById),
    }));
}

export async function getPublicSiteChrome(): Promise<PublicSiteChrome> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      headerNav: mockHeaderNav(),
      quickLinks: mockQuickLinkItems(),
      footerLinks: mockQuickLinkItems(),
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
    const [{ data: headerItems }, { data: pages }] = await Promise.all([
      admin
        .from(Tables.menuItems)
        .select("*")
        .eq("menu_id", headerMenu.id)
        .eq("is_active", true)
        .order("sort_order"),
      admin.from(Tables.pages).select("id, slug, page_type, parent_id").eq("status", "published"),
    ]);

    if (headerItems?.length) {
      const pageById = loadPublishedPageById(pages as Page[]);
      headerNav = buildNavTree(headerItems as MenuItem[], pageById);
    }
  }

  const [quickLinks, footerLinks] = await Promise.all([
    getMenuLinks("quick_links"),
    getMenuLinks("footer"),
  ]);

  return { headerNav, quickLinks, footerLinks };
}

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
  return {
    slug: page.slug,
    titleEn: page.title_en,
    titleHi: page.title_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    contentEn: page.content_en,
    contentHi: page.content_hi,
  };
}

function mapCollegeSection(page: Page, subsections: Page[]): PublicCollegeSection {
  return {
    slug: page.slug,
    titleEn: page.title_en,
    titleHi: page.title_hi,
    excerptEn: page.excerpt_en,
    excerptHi: page.excerpt_hi,
    contentEn: page.content_en,
    contentHi: page.content_hi,
    subsections: subsections.map(mapCollegeSubsection),
  };
}

export async function getPublishedCollegeBySlug(slug: string): Promise<PublicCollegePage | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("slug", slug)
    .eq("page_type", "college")
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  const college = data as Page;

  const { data: sections } = await admin
    .from(Tables.pages)
    .select("*")
    .eq("parent_id", college.id)
    .eq("status", "published")
    .order("sort_order")
    .order("title_en");

  const sectionRows = (sections as Page[]) ?? [];
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
    pageType: "college",
    collegeSlug: college.slug,
    sections: sectionRows.map((section) =>
      mapCollegeSection(section, subsectionsBySection.get(section.id) ?? []),
    ),
  };
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
    .select("*")
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

export async function getPublishedDownloads(options?: {
  category?: string;
  query?: string;
}): Promise<PublicDownloadItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.downloads)
    .select("*")
    .eq("status", "published")
    .order("title_en", { ascending: true });

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  const { data } = await query;
  const downloads = (data as Download[]) ?? [];
  const deptIds = [...new Set(downloads.map((d) => d.department_id).filter(Boolean))] as string[];
  const deptMap = await loadDepartmentNames(admin, deptIds);

  const q = options?.query?.trim().toLowerCase();
  const filtered = q
    ? downloads.filter(
        (d) =>
          d.title_en.toLowerCase().includes(q) ||
          (d.title_hi?.toLowerCase().includes(q) ?? false) ||
          (d.category?.toLowerCase().includes(q) ?? false),
      )
    : downloads;

  return filtered.map((item) => ({
    id: item.id,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    category: item.category,
    version: item.version,
    departmentName: item.department_id ? deptMap.get(item.department_id) ?? null : null,
    fileName: item.file_name,
    fileUrl: getStoredFileUrl(item.file_path),
    downloadCount: item.download_count,
  }));
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

export async function getPublishedDownloadsPage(options: {
  page?: number;
  pageSize?: number;
  category?: string;
  query?: string;
}): Promise<PaginatedResult<PublicDownloadItem>> {
  const all = await getPublishedDownloads({
    category: options.category && options.category !== "all" ? options.category : undefined,
    query: options.query,
  });
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
