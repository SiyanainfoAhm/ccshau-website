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

export function PublicPagination<T>({
  data,
  paramName = "page",
}: {
  data: Pick<PaginatedResult<T>, "page" | "pageSize" | "total" | "totalPages">;
  paramName?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (data.totalPages <= 1) return null;

  function hrefForPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(paramName);
    else params.set(paramName, String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const start = (data.page - 1) * data.pageSize + 1;
  const end = Math.min(data.page * data.pageSize, data.total);

  return (
    <nav className={publicPaginationNavClass} aria-label="Pagination">
      <p className={`text-sm ${publicMutedTextClass}`}>
        Showing {start}–{end} of {data.total}
      </p>
      <div className="flex items-center gap-2">
        {data.page > 1 ? (
          <Link
            href={hrefForPage(data.page - 1)}
            className={publicPaginationBtnClass}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : (
          <span className={publicPaginationDisabledClass}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </span>
        )}
        <span className={`px-2 text-sm font-medium ${publicMutedTextClass}`}>
          Page {data.page} of {data.totalPages}
        </span>
        {data.page < data.totalPages ? (
          <Link
            href={hrefForPage(data.page + 1)}
            className={publicPaginationBtnClass}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={publicPaginationDisabledClass}>
            Next <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
