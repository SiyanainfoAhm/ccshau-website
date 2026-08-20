"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Search, Tag } from "lucide-react";
import { useState } from "react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicDownloadItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import {
  publicEmptyStateClass,
  publicFilterChipActiveClass,
  publicFilterChipInactiveClass,
  publicMainClass,
  publicSearchInputClass,
} from "@/lib/design/public-page-classes";
import { DOWNLOAD_CATEGORIES, formatDownloadCategory } from "@/lib/validations/downloads";

const CATEGORY_LABELS: Record<string, string> = {
  forms: "Forms",
  prospectus: "Prospectus",
  syllabus: "Syllabus",
  reports: "Reports",
  guidelines: "Guidelines",
  other: "Other",
};

export function PublicDownloadsListing({
  data,
  activeCategory,
  activeDepartmentId,
  activeTag,
  initialQuery,
  departments,
  tags,
}: {
  data: PaginatedResult<PublicDownloadItem>;
  activeCategory: string;
  activeDepartmentId: string;
  activeTag: string;
  initialQuery: string;
  departments: { id: string; nameEn: string }[];
  tags: string[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  function pushFilters(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`/downloads?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushFilters({ q: query.trim() || null });
  }

  function setCategory(cat: string) {
    pushFilters({ category: cat === "all" ? null : cat });
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" tabIndex={-1} className={publicMainClass}>
        <div className="gradient-hero px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">
              {t("Downloads", "डाउनलोड")}
            </h1>
            <p className="mt-2 text-emerald-100">
              {t("Forms, prospectus, syllabus, reports and official documents", "प्रपत्र, प्रॉस्पेक्टस और आधिकारिक दस्तावेज़")}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search documents…", "दस्तावेज़ खोजें…")}
                className={publicSearchInputClass}
              />
            </div>
            <select
              value={activeDepartmentId}
              onChange={(e) => pushFilters({ department: e.target.value || null })}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="Filter by department"
            >
              <option value="">{t("All departments", "सभी विभाग")}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.nameEn}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
            >
              {t("Search", "खोजें")}
            </button>
          </form>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                activeCategory === "all"
                  ? publicFilterChipActiveClass
                  : publicFilterChipInactiveClass
              }`}
            >
              {t("All", "सभी")}
            </button>
            {DOWNLOAD_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                  activeCategory === cat
                    ? publicFilterChipActiveClass
                    : publicFilterChipInactiveClass
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Tag className="h-3.5 w-3.5" /> Tags
              </span>
              <button
                type="button"
                onClick={() => pushFilters({ tag: null })}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  !activeTag ? publicFilterChipActiveClass : publicFilterChipInactiveClass
                }`}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => pushFilters({ tag })}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    activeTag === tag
                      ? publicFilterChipActiveClass
                      : publicFilterChipInactiveClass
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {data.items.length === 0 ? (
              <p className={publicEmptyStateClass}>
                {t("No downloads match your filters.", "आपके फ़िल्टर से कोई दस्तावेज़ मेल नहीं खाता।")}
              </p>
            ) : (
              data.items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {t(item.titleEn, item.titleHi ?? item.titleEn)}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.category ? formatDownloadCategory(item.category) : "—"}
                        {item.version ? ` · v${item.version}` : ""}
                        {item.departmentName ? ` · ${item.departmentName}` : ""}
                        {item.downloadCount > 0 ? ` · ${item.downloadCount} downloads` : ""}
                      </p>
                      {item.tags.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={item.downloadUrl}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <Download className="h-4 w-4" />
                    {t("Download", "डाउनलोड")}
                  </a>
                </article>
              ))
            )}
          </div>
          <PublicPagination data={data} />
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
