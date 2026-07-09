import {
  buildPaginatedResult,
  paginationRange,
  parsePageParam,
  type PaginatedResult,
} from "@/lib/data/pagination";

export const ADMIN_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_MAX_PAGE_SIZE = 100;

export type SortOrder = "asc" | "desc";

export interface AdminListOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
}

export interface AdminListDefaults {
  sortBy: string;
  sortOrder?: SortOrder;
  allowedSorts: readonly string[];
}

export function parsePageSizeParam(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > ADMIN_MAX_PAGE_SIZE) {
    return undefined;
  }
  return parsed;
}

export function parseSortOrderParam(
  value: string | undefined,
  fallback: SortOrder = "desc",
): SortOrder {
  if (value === "asc" || value === "desc") return value;
  return fallback;
}

export function resolveSortColumn(
  value: string | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  if (value && allowed.includes(value)) return value;
  return fallback;
}

export type ResolvedAdminListOptions = Required<
  Pick<AdminListOptions, "page" | "pageSize" | "sortBy" | "sortOrder">
> & {
  search?: string;
};

export function parseAdminListParams(
  params: Record<string, string | undefined>,
  defaults: AdminListDefaults,
): ResolvedAdminListOptions {
  return {
    page: parsePageParam(params.page),
    pageSize: parsePageSizeParam(params.pageSize) ?? ADMIN_DEFAULT_PAGE_SIZE,
    sortBy: resolveSortColumn(params.sort, defaults.allowedSorts, defaults.sortBy),
    sortOrder: parseSortOrderParam(params.order, defaults.sortOrder ?? "desc"),
    search: params.q?.trim() || undefined,
  };
}

export function mergeAdminListOptions(
  options: AdminListOptions,
  defaults: AdminListDefaults,
): ResolvedAdminListOptions {
  return {
    page: options.page ?? 1,
    pageSize: options.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE,
    sortBy: resolveSortColumn(options.sortBy, defaults.allowedSorts, defaults.sortBy),
    sortOrder: options.sortOrder ?? defaults.sortOrder ?? "desc",
    search: options.search?.trim() || undefined,
  };
}

export function emptyPaginatedResult<T>(
  options: Required<Pick<AdminListOptions, "page" | "pageSize">>,
): PaginatedResult<T> {
  return buildPaginatedResult([], 0, options.page, options.pageSize);
}

export async function runPaginatedQuery<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  options: Required<Pick<AdminListOptions, "page" | "pageSize" | "sortBy" | "sortOrder">>,
): Promise<PaginatedResult<T>> {
  const { from, to } = paginationRange(options.page, options.pageSize);
  const { data, count, error } = await query
    .order(options.sortBy, { ascending: options.sortOrder === "asc" })
    .range(from, to);

  if (error) {
    console.error("Admin list query failed:", error.message);
    return buildPaginatedResult([], 0, options.page, options.pageSize);
  }

  return buildPaginatedResult(
    (data ?? []) as T[],
    count ?? 0,
    options.page,
    options.pageSize,
  );
}
