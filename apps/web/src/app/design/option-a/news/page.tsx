"use client";

import Link from "next/link";
import { ArrowRight, Calendar, FileText, Sparkles } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { HeritageInnerHero } from "@/components/design/shared/heritage-inner-hero";
import { useLanguage } from "@/components/design/shared/language-context";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { HERITAGE_NEWS_PASTELS } from "@/lib/design/heritage-theme";
import {
  OPTION_A_BASE,
  optionADemoNews,
  optionANavItems,
} from "@/lib/design/option-a-demo";

const filters = ["All", "Admissions", "Notice", "Recruitment", "Event"] as const;

export default function OptionANewsPage() {
  return (
    <DesignShell className="gradient-heritage-light min-h-screen">
      <NewsContent />
    </DesignShell>
  );
}

function NewsContent() {
  const { t } = useLanguage();

  return (
    <>
      <SiteHeader
        variant="heritage"
        homeHref={OPTION_A_BASE}
        navItems={optionANavItems}
        showMainNav
      />
      <main id="main-content" className="flex-1">
        <HeritageInnerHero
          title="News & Notices"
          titleHi="समाचार और सूचनाएं"
          subtitle="Pastel heritage layout for notices, admissions and campus updates."
          subtitleHi="सूचनाओं, प्रवेश और परिसर अपडेट के लिए विरासत शैली लेआउट।"
        />

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-8 flex flex-wrap gap-2">
            {filters.map((cat, i) => (
              <button
                key={cat}
                type="button"
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${
                  i === 0
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white ring-rose-300 shadow-md shadow-rose-200"
                    : "bg-white text-slate-600 ring-rose-100 hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {optionADemoNews.map((item, i) => {
              const pastel = HERITAGE_NEWS_PASTELS[i % HERITAGE_NEWS_PASTELS.length];
              const href = `${OPTION_A_BASE}/news/sample`;
              return (
                <article
                  key={item.id}
                  className={`group overflow-hidden rounded-2xl border border-l-4 bg-gradient-to-r ${pastel.border} ${pastel.bg} shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <Link href={href} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${pastel.icon}`}
                    >
                      <FileText className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-bold uppercase ${pastel.badge}`}>
                          {t(item.category, item.categoryHi)}
                        </span>
                        {item.id === 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                            <Sparkles className="h-3 w-3" aria-hidden />
                            Featured
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 font-display text-lg font-bold text-slate-900 group-hover:text-violet-700">
                        {t(item.titleEn, item.titleHi)}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.excerptEn}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" aria-hidden />
                        {item.date}
                      </span>
                      <ArrowRight className="h-4 w-4 text-violet-400 transition group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <SiteFooter variant="heritage" />
    </>
  );
}
