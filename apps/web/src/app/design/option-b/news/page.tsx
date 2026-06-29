"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Filter } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { latestNews } from "@/lib/mock/site-content";

export default function NewsListingPage() {
  return (
    <DesignShell>
      <SiteHeader variant="future" homeHref="/design/option-b" />
      <main id="main-content" className="flex-1 bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="gradient-hero pattern-dots px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/design/option-b"
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">Latest News & Notices</h1>
            <p className="mt-2 text-emerald-100">नवीनतम समाचार और सूचनाएं</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Filter className="h-4 w-4" /> Filter
            </button>
            {["All", "Admissions", "Notice", "Event", "Recruitment"].map((cat) => (
              <button
                key={cat}
                type="button"
                className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-200"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {latestNews.map((item) => (
              <article
                key={item.id}
                className="group flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase text-emerald-600">
                    {item.category}
                  </span>
                  <h2 className="font-semibold text-slate-900 group-hover:text-emerald-800">
                    <Link
                      href={item.id === 1 ? "/design/option-b/news/sample" : "#"}
                      className="hover:underline"
                    >
                      {item.titleEn}
                    </Link>
                  </h2>
                  <p className="font-hindi text-sm text-slate-500">{item.titleHi}</p>
                </div>
                <time className="shrink-0 text-sm font-medium text-slate-500">{item.date}</time>
              </article>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter variant="future" />
    </DesignShell>
  );
}
