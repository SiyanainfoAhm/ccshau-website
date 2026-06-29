"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PaginatedResult } from "@/lib/data/pagination";

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
    <nav
      className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-500">
        Showing {start}–{end} of {data.total}
      </p>
      <div className="flex items-center gap-2">
        {data.page > 1 ? (
          <Link
            href={hrefForPage(data.page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-300">
            <ChevronLeft className="h-4 w-4" /> Previous
          </span>
        )}
        <span className="px-2 text-sm font-medium text-slate-600">
          Page {data.page} of {data.totalPages}
        </span>
        {data.page < data.totalPages ? (
          <Link
            href={hrefForPage(data.page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-300">
            Next <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
