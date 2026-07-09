"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DeletePageButton } from "@/components/admin/delete-page-button";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { StatusBadge } from "@/components/admin/status-badge";
import type { ResolvedAdminListOptions } from "@/lib/data/admin-list";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { Page } from "@/lib/database/types";

export function PagesList({
  data,
  listParams,
  canDelete = false,
  canCreate = false,
}: {
  data: PaginatedResult<Page>;
  listParams: ResolvedAdminListOptions;
  canDelete?: boolean;
  canCreate?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(listParams.search ?? "");

  useEffect(() => {
    setQuery(listParams.search ?? "");
  }, [listParams.search]);

  const applySearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, query, router, searchParams]);

  const pages = data.items;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="relative max-w-md flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug, or status..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Search pages"
          />
        </form>
        <p className="text-sm text-slate-500">
          {data.total} page{data.total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <AdminSortableTh
                label="Title"
                column="title_en"
                currentSort={listParams.sortBy}
                currentOrder={listParams.sortOrder}
              />
              <AdminSortableTh
                label="Slug"
                column="slug"
                currentSort={listParams.sortBy}
                currentOrder={listParams.sortOrder}
              />
              <AdminSortableTh
                label="Status"
                column="status"
                currentSort={listParams.sortBy}
                currentOrder={listParams.sortOrder}
              />
              <AdminSortableTh
                label="Updated"
                column="updated_at"
                currentSort={listParams.sortBy}
                currentOrder={listParams.sortOrder}
              />
              {canDelete && (
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.total === 0 && !listParams.search ? (
              <tr>
                <td colSpan={canDelete ? 5 : 4} className="px-4 py-10 text-center text-slate-500">
                  No pages yet.
                  {canCreate && (
                    <>
                      {" "}
                      <Link href="/admin/pages/new" className="text-emerald-700 hover:underline">
                        Create your first page
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ) : pages.length === 0 ? (
              <tr>
                <td colSpan={canDelete ? 5 : 4} className="px-4 py-10 text-center text-slate-500">
                  No pages match your search.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {page.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/{page.slug}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={page.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(page.updated_at).toLocaleDateString("en-IN")}
                  </td>
                  {canDelete && (
                    <td className="px-4 py-3 text-right">
                      <DeletePageButton
                        pageId={page.id}
                        pageTitle={page.title_en}
                        variant="list"
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminListFooter data={data} />
      </div>
    </div>
  );
}
