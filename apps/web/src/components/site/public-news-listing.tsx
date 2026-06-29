"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Filter } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicNewsItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";

const CATEGORIES = ["All", "general", "examination", "admission", "recruitment", "extension", "research", "events"];

export function PublicNewsListing({
  data,
  activeCategory,
}: {
  data: PaginatedResult<PublicNewsItem>;
  activeCategory: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  function setCategory(cat: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All") params.delete("category");
    else params.set("category", cat);
    params.delete("page");
    router.push(`/news?${params.toString()}`);
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="gradient-hero pattern-dots px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">
              {t("Latest News & Notices", "नवीनतम समाचार और सूचनाएं")}
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
              <Filter className="h-4 w-4" /> Filter
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                  activeCategory === cat
                    ? "bg-[#0b3d2e] text-white"
                    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {data.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center text-slate-500">
                No published news items yet.
              </p>
            ) : (
              data.items.map((item) => (
                <article
                  key={item.id}
                  className="group flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold uppercase text-emerald-600">
                      {item.category ?? item.noticeType}
                    </span>
                    <h2 className="font-semibold text-slate-900 group-hover:text-emerald-800">
                      <Link href={`/news/${item.slug}`} className="hover:underline">
                        {t(item.titleEn, item.titleHi ?? item.titleEn)}
                      </Link>
                    </h2>
                  </div>
                  <time className="shrink-0 text-sm font-medium text-slate-500">
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleDateString("en-IN")
                      : "—"}
                  </time>
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
