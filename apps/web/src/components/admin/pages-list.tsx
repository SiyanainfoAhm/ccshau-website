"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DeletePageButton } from "@/components/admin/delete-page-button";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Page } from "@/lib/database/types";

function matchesQuery(page: Page, query: string) {
  const haystack = [
    page.title_en,
    page.title_hi,
    page.slug,
    page.status,
    page.page_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function PagesList({ pages }: { pages: Page[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredPages = useMemo(() => {
    if (!normalizedQuery) return pages;
    return pages.filter((page) => matchesQuery(page, normalizedQuery));
  }, [pages, normalizedQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug, or status..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Search pages"
          />
        </div>
        <p className="text-sm text-slate-500">
          {filteredPages.length} of {pages.length} page{pages.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Slug</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Updated</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No pages yet.{" "}
                  <Link href="/admin/pages/new" className="text-emerald-700 hover:underline">
                    Create your first page
                  </Link>
                </td>
              </tr>
            ) : filteredPages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No pages match &ldquo;{query.trim()}&rdquo;.
                </td>
              </tr>
            ) : (
              filteredPages.map((page) => (
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
                  <td className="px-4 py-3 text-right">
                    <DeletePageButton
                      pageId={page.id}
                      pageTitle={page.title_en}
                      variant="list"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
