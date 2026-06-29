"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Gavel, ImageIcon, Newspaper, ScrollText } from "lucide-react";
import { useState } from "react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicSearchContentType, PublicSearchResult } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import { PublicPagination } from "@/components/site/public-pagination";

const TYPE_FILTERS: { value: "all" | PublicSearchContentType; labelEn: string; labelHi: string }[] = [
  { value: "all", labelEn: "All", labelHi: "सभी" },
  { value: "page", labelEn: "Pages", labelHi: "पृष्ठ" },
  { value: "news", labelEn: "News", labelHi: "समाचार" },
  { value: "tender", labelEn: "Tenders", labelHi: "निविदाएं" },
  { value: "circular", labelEn: "Circulars", labelHi: "परिपत्र" },
  { value: "download", labelEn: "Downloads", labelHi: "डाउनलोड" },
  { value: "media", labelEn: "Media", labelHi: "मीडिया" },
];

const TYPE_ICONS: Record<PublicSearchContentType, typeof FileText> = {
  page: FileText,
  news: Newspaper,
  tender: Gavel,
  circular: ScrollText,
  download: FileText,
  media: ImageIcon,
};

export function PublicSearchPage({
  data,
  query: initialQuery,
}: {
  data: PaginatedResult<PublicSearchResult>;
  query: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = (searchParams.get("type") ?? "all") as "all" | PublicSearchContentType;
  const [query, setQuery] = useState(initialQuery);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  }

  function setType(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("type");
    else params.set("type", value);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
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
              {t("Search", "खोज")}
            </h1>
            <p className="mt-2 text-emerald-100">
              {t("Find pages, news, tenders, circulars, downloads and media", "पृष्ठ, समाचार, निविदाएं और दस्तावेज़ खोजें")}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <form onSubmit={handleSearch} className="mb-6">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search university website…", "विश्वविद्यालय वेबसाइट खोजें…")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              autoFocus
            />
          </form>

          {initialQuery.trim().length >= 2 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {TYPE_FILTERS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setType(tab.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                    activeType === tab.value
                      ? "bg-[#0b3d2e] text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {t(tab.labelEn, tab.labelHi)}
                </button>
              ))}
            </div>
          )}

          {initialQuery.trim().length < 2 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
              {t("Enter at least 2 characters to search.", "खोजने के लिए कम से कम 2 अक्षर दर्ज करें।")}
            </p>
          ) : data.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
              {t("No results found.", "कोई परिणाम नहीं मिला।")}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                {data.total} {t("results", "परिणाम")}
              </p>
              {data.items.map((item) => {
                const Icon = TYPE_ICONS[item.type];
                const isExternal = item.url.startsWith("http");
                const content = (
                  <article className="flex items-start gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        {item.type}
                      </p>
                      <h2 className="font-semibold text-slate-900">
                        {t(item.titleEn, item.titleHi ?? item.titleEn)}
                      </h2>
                      {item.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.excerpt}</p>
                      )}
                      {item.publishedAt && (
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(item.publishedAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>
                    {isExternal && <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />}
                  </article>
                );

                return isExternal ? (
                  <a key={`${item.type}-${item.id}`} href={item.url} target="_blank" rel="noopener noreferrer">
                    {content}
                  </a>
                ) : (
                  <Link key={`${item.type}-${item.id}`} href={item.url}>
                    {content}
                  </Link>
                );
              })}
            </div>
          )}
          <PublicPagination data={data} />
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
