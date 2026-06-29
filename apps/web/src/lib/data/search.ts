import { Tables } from "@/lib/database/names";
import type {
  Circular,
  Download,
  MediaAlbum,
  NewsItem,
  Page,
  Tender,
} from "@/lib/database/types";
import type { PublicSearchContentType, PublicSearchResult } from "@/lib/data/public-types";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from "@/lib/data/pagination";
import { resolvePagePublicPath } from "@/lib/pages/resolve-public-path";
import { getStoredFileUrl } from "@/lib/storage/upload";
import { createAdminClient } from "@/lib/supabase/admin";

const ALL_TYPES: PublicSearchContentType[] = [
  "page",
  "news",
  "tender",
  "circular",
  "download",
  "media",
];

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

async function searchPages(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  query: string,
): Promise<PublicSearchResult[]> {
  const [{ data }, { data: allPages }] = await Promise.all([
    admin
      .from(Tables.pages)
      .select("id, slug, title_en, title_hi, excerpt_en, published_at, page_type, parent_id")
      .eq("status", "published")
      .textSearch("search_vector", query, { type: "websearch", config: "english" })
      .limit(20),
    admin
      .from(Tables.pages)
      .select("id, slug, page_type, parent_id")
      .eq("status", "published"),
  ]);

  const pageById = new Map(((allPages as Page[]) ?? []).map((p) => [p.id, p]));

  return ((data as Page[]) ?? []).map((item) => ({
    id: item.id,
    type: "page" as const,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    excerpt: item.excerpt_en,
    url: resolvePagePublicPath(item, pageById),
    publishedAt: item.published_at,
  }));
}

async function searchNews(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  query: string,
): Promise<PublicSearchResult[]> {
  const { data } = await admin
    .from(Tables.news)
    .select("id, slug, title_en, title_hi, body_en, published_at")
    .eq("status", "published")
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .limit(20);

  return ((data as NewsItem[]) ?? []).map((item) => ({
    id: item.id,
    type: "news" as const,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    excerpt: item.body_en?.slice(0, 160) ?? null,
    url: `/news/${item.slug}`,
    publishedAt: item.published_at,
  }));
}

async function searchTenders(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  query: string,
): Promise<PublicSearchResult[]> {
  const { data } = await admin
    .from(Tables.tenders)
    .select("id, slug, title_en, title_hi, description_en, published_at")
    .in("status", ["open", "closed", "archived"])
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .limit(20);

  return ((data as Tender[]) ?? []).map((item) => ({
    id: item.id,
    type: "tender" as const,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    excerpt: item.description_en?.slice(0, 160) ?? null,
    url: `/tenders/${item.slug}`,
    publishedAt: item.published_at,
  }));
}

async function searchCirculars(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  query: string,
): Promise<PublicSearchResult[]> {
  const { data } = await admin
    .from(Tables.circulars)
    .select("id, title_en, title_hi, circular_number, file_path, published_at")
    .eq("status", "published")
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .limit(20);

  return ((data as Circular[]) ?? []).map((item) => ({
    id: item.id,
    type: "circular" as const,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    excerpt: item.circular_number,
    url: item.file_path ? (getStoredFileUrl(item.file_path) ?? "/circulars") : "/circulars",
    publishedAt: item.published_at,
  }));
}

async function searchDownloads(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  query: string,
): Promise<PublicSearchResult[]> {
  const { data } = await admin
    .from(Tables.downloads)
    .select("id, title_en, title_hi, category, file_path, created_at")
    .eq("status", "published")
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .limit(20);

  return ((data as Download[]) ?? []).map((item) => ({
    id: item.id,
    type: "download" as const,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    excerpt: item.category,
    url: getStoredFileUrl(item.file_path) ?? "/downloads",
    publishedAt: item.created_at,
  }));
}

async function searchMedia(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  query: string,
): Promise<PublicSearchResult[]> {
  const escaped = query.replace(/[%_]/g, "");
  const { data } = await admin
    .from(Tables.mediaAlbums)
    .select("id, slug, title_en, title_hi, album_type, published_at")
    .eq("status", "published")
    .or(`title_en.ilike.%${escaped}%,title_hi.ilike.%${escaped}%`)
    .limit(20);

  return ((data as MediaAlbum[]) ?? []).map((item) => ({
    id: item.id,
    type: "media" as const,
    titleEn: item.title_en,
    titleHi: item.title_hi,
    excerpt: item.album_type.replace(/_/g, " "),
    url: `/media/${item.slug}`,
    publishedAt: item.published_at,
  }));
}

export async function searchPublishedContent(options: {
  query: string;
  types?: PublicSearchContentType[];
}): Promise<PublicSearchResult[]> {
  const admin = createAdminClient();
  const query = normalizeQuery(options.query);
  if (!admin || query.length < 2) return [];

  const types = options.types?.length ? options.types : ALL_TYPES;
  const tasks: Promise<PublicSearchResult[]>[] = [];

  if (types.includes("page")) tasks.push(searchPages(admin, query));
  if (types.includes("news")) tasks.push(searchNews(admin, query));
  if (types.includes("tender")) tasks.push(searchTenders(admin, query));
  if (types.includes("circular")) tasks.push(searchCirculars(admin, query));
  if (types.includes("download")) tasks.push(searchDownloads(admin, query));
  if (types.includes("media")) tasks.push(searchMedia(admin, query));

  const groups = await Promise.all(tasks);
  return groups
    .flat()
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });
}

export async function searchPublishedContentPage(options: {
  query: string;
  types?: PublicSearchContentType[];
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<PublicSearchResult>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const all = await searchPublishedContent({
    query: options.query,
    types: options.types,
  });
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  return buildPaginatedResult(items, all.length, page, pageSize);
}
