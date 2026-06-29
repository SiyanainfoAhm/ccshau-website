"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, ScrollText, Search } from "lucide-react";
import { useState } from "react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicCircularItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";

export function PublicCircularsListing({
  data,
  initialQuery,
}: {
  data: PaginatedResult<PublicCircularItem>;
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
    router.push(`/circulars?${params.toString()}`);
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
              {t("Circulars & Orders", "परिपत्र और आदेश")}
            </h1>
            <p className="mt-2 text-emerald-100">
              {t("Official university circulars and administrative orders", "आधिकारिक विश्वविद्यालय परिपत्र")}
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
                placeholder={t("Search by title or circular number…", "शीर्षक या परिपत्र संख्या से खोजें…")}
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

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="px-5 py-4 font-semibold">{t("Title", "शीर्षक")}</th>
                  <th className="hidden px-5 py-4 font-semibold md:table-cell">
                    {t("Number", "संख्या")}
                  </th>
                  <th className="hidden px-5 py-4 font-semibold lg:table-cell">
                    {t("Department", "विभाग")}
                  </th>
                  <th className="px-5 py-4 font-semibold">{t("Published", "प्रकाशित")}</th>
                  <th className="px-5 py-4 font-semibold">{t("Download", "डाउनलोड")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      {t("No circulars published yet.", "अभी कोई परिपत्र प्रकाशित नहीं है।")}
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-emerald-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ScrollText className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="font-medium text-slate-900">
                            {t(item.titleEn, item.titleHi ?? item.titleEn)}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                        {item.circularNumber ?? "—"}
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 lg:table-cell">
                        {item.departmentName ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {item.fileUrl ? (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <Download className="h-4 w-4" />
                            {item.fileName ?? "PDF"}
                          </a>
                        ) : (
                          "—"
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
