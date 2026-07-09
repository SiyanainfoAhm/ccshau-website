"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Gavel, Search } from "lucide-react";
import { FormEvent, useState } from "react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicTenderItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import {
  publicCardClass,
  publicFilterChipActiveClass,
  publicFilterChipInactiveClass,
  publicMainClass,
} from "@/lib/design/public-page-classes";
import { formatTenderCategory, TENDER_CATEGORIES } from "@/lib/validations/tenders";

export function PublicTendersListing({
  data,
  activeStatus,
  activeCategory,
  activeDepartmentId,
  searchQuery,
  departments,
}: {
  data: PaginatedResult<PublicTenderItem>;
  activeStatus: string;
  activeCategory: string;
  activeDepartmentId: string;
  searchQuery: string;
  departments: { id: string; nameEn: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchQuery);

  function pushFilters(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`/tenders?${params.toString()}`);
  }

  function setStatus(value: string) {
    pushFilters({ status: value === "all" ? null : value });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushFilters({ q: keyword.trim() || null });
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className={publicMainClass}>
        <div className="gradient-hero px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">Tenders & Auctions</h1>
            <p className="mt-2 text-emerald-100">निविदाएं और नीलामी</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <form onSubmit={handleSearchSubmit} className="mb-6 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search by title or tender number…"
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm"
              />
            </div>
            <select
              value={activeCategory}
              onChange={(e) => pushFilters({ category: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {TENDER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {formatTenderCategory(cat)}
                </option>
              ))}
            </select>
            <select
              value={activeDepartmentId}
              onChange={(e) => pushFilters({ department: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.nameEn}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Search
            </button>
          </form>

          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Open", value: "open" },
              { label: "Closed", value: "closed" },
              { label: "Cancelled", value: "cancelled" },
              { label: "Archived", value: "archived" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                  activeStatus === tab.value
                    ? publicFilterChipActiveClass
                    : publicFilterChipInactiveClass
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`overflow-hidden ${publicCardClass}`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="px-5 py-4 font-semibold">Title</th>
                  <th className="hidden px-5 py-4 font-semibold md:table-cell">Category</th>
                  <th className="hidden px-5 py-4 font-semibold lg:table-cell">Department</th>
                  <th className="hidden px-5 py-4 font-semibold sm:table-cell">Published</th>
                  <th className="px-5 py-4 font-semibold">Closing</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      No tenders match your filters.
                    </td>
                  </tr>
                ) : (
                  data.items.map((tender) => (
                    <tr key={tender.id} className="border-t border-slate-100 hover:bg-emerald-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Gavel className="h-4 w-4 shrink-0 text-emerald-600" />
                          <Link
                            href={`/tenders/${tender.slug}`}
                            className="font-medium text-slate-900 hover:text-emerald-800 hover:underline"
                          >
                            {tender.titleEn}
                          </Link>
                        </div>
                        {tender.tenderNumber && (
                          <p className="mt-1 text-xs text-slate-500">{tender.tenderNumber}</p>
                        )}
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                        {formatTenderCategory(tender.category)}
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 lg:table-cell">
                        {tender.departmentName ?? "—"}
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 sm:table-cell">
                        {tender.publishedAt
                          ? new Date(tender.publishedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {tender.closingDate
                          ? new Date(tender.closingDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                            tender.status === "open"
                              ? "bg-emerald-100 text-emerald-800"
                              : tender.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tender.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {tender.documents[0]?.url ? (
                          <a
                            href={tender.documents[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <Download className="h-4 w-4" /> PDF
                          </a>
                        ) : (
                          <Link href={`/tenders/${tender.slug}`} className="text-emerald-700 hover:underline">
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PublicPagination data={data} />
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
