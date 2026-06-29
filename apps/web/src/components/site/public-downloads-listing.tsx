"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Search } from "lucide-react";
import { useState } from "react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicDownloadItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import { DOWNLOAD_CATEGORIES } from "@/lib/validations/downloads";

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
  initialQuery,
}: {
  data: PaginatedResult<PublicDownloadItem>;
  activeCategory: string;
  initialQuery: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`/downloads?${params.toString()}`);
  }

  function setCategory(cat: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "all") params.delete("category");
    else params.set("category", cat);
    params.delete("page");
    router.push(`/downloads?${params.toString()}`);
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-slate-50">
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
          <form onSubmit={handleSearch} className="mb-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search documents…", "दस्तावेज़ खोजें…")}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
            >
              {t("Search", "खोजें")}
            </button>
          </form>

          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                activeCategory === "all"
                  ? "bg-[#0b3d2e] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
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
                    ? "bg-[#0b3d2e] text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {data.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center text-slate-500">
                {t("No downloads published yet.", "अभी कोई दस्तावेज़ प्रकाशित नहीं है।")}
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
                        {item.category ? (CATEGORY_LABELS[item.category] ?? item.category) : "—"}
                        {item.version ? ` · v${item.version}` : ""}
                        {item.departmentName ? ` · ${item.departmentName}` : ""}
                      </p>
                    </div>
                  </div>
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Download className="h-4 w-4" />
                      {t("Download", "डाउनलोड")}
                    </a>
                  )}
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
