"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PaginatedResult } from "@/lib/data/pagination";
import {
  publicPaginationBtnClass,
  publicPaginationDisabledClass,
  publicPaginationNavClass,
  publicMutedTextClass,
} from "@/lib/design/public-page-classes";

function pageNumbers(current: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, current]);
  for (let p = current - 1; p <= current + 1; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  return [...pages].sort((a, b) => a - b);
}

export function PublicPagination<T>({
  data,
  paramName = "page",
}: {
  data: Pick<PaginatedResult<T>, "page" | "pageSize" | "total" | "totalPages">;
  paramName?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (data.total <= 0) return null;

  function hrefForPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(paramName);
    else params.set(paramName, String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const start = (data.page - 1) * data.pageSize + 1;
  const end = Math.min(data.page * data.pageSize, data.total);
  const pages = pageNumbers(data.page, data.totalPages);

  return (
    <nav className={publicPaginationNavClass} aria-label="Pagination">
      <p className={`text-sm ${publicMutedTextClass}`}>
        Showing {start}–{end} of {data.total}
      </p>

      {data.totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {data.page > 1 ? (
            <Link href={hrefForPage(data.page - 1)} className={publicPaginationBtnClass}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Link>
          ) : (
            <span className={publicPaginationDisabledClass}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </span>
          )}

          <div className="flex items-center gap-1">
            {pages.map((page, index) => {
              const prev = pages[index - 1];
              const showEllipsis = prev !== undefined && page - prev > 1;
              const isActive = page === data.page;

              return (
                <span key={page} className="flex items-center gap-1">
                  {showEllipsis ? (
                    <span className={`px-1 text-sm ${publicMutedTextClass}`} aria-hidden>
                      …
                    </span>
                  ) : null}
                  {isActive ? (
                    <span
                      aria-current="page"
                      className="inline-flex min-w-9 items-center justify-center rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      {page}
                    </span>
                  ) : (
                    <Link
                      href={hrefForPage(page)}
                      className={`${publicPaginationBtnClass} min-w-9 justify-center px-3`}
                    >
                      {page}
                    </Link>
                  )}
                </span>
              );
            })}
          </div>

          {data.page < data.totalPages ? (
            <Link href={hrefForPage(data.page + 1)} className={publicPaginationBtnClass}>
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className={publicPaginationDisabledClass}>
              Next <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
