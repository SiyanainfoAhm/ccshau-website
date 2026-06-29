"use client";

import Link from "next/link";
import { FileText, Filter } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { MinistryInnerHero } from "@/components/design/shared/ministry-inner-hero";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { latestNews } from "@/lib/mock/site-content";

export default function OptionCNewsPage() {
  return (
    <DesignShell className="bg-slate-50">
      <SiteHeader variant="ministry" homeHref="/design/option-c" />
      <main id="main-content" className="flex-1">
        <MinistryInnerHero title="Latest News & Notices" titleHi="नवीनतम समाचार और सूचनाएं" />

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="ministry-focus inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <Filter className="h-4 w-4" aria-hidden /> Filter
            </button>
            {["All", "Admissions", "Notice", "Event", "Recruitment"].map((cat) => (
              <button
                key={cat}
                type="button"
                className="ministry-focus rounded-md border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#146c43] hover:text-[#146c43]"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {latestNews.map((item) => (
              <article
                key={item.id}
                className="ministry-card flex items-center gap-4 rounded-md border-l-4 border-l-[#146c43] p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#146c43] text-white">
                  <FileText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase text-[#e8850c]">{item.category}</span>
                  <h2 className="font-semibold text-slate-900">
                    <Link
                      href={item.id === 1 ? "/design/option-c/news/sample" : "#"}
                      className="hover:text-[#146c43] hover:underline"
                    >
                      {item.titleEn}
                    </Link>
                  </h2>
                  <p className="font-hindi text-sm text-slate-600">{item.titleHi}</p>
                </div>
                <time className="shrink-0 text-sm font-medium text-slate-500">{item.date}</time>
              </article>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter variant="ministry" />
    </DesignShell>
  );
}
