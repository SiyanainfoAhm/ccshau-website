"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Download, Share2, Tag } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { useLanguage } from "@/components/design/shared/language-context";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import {
  OPTION_A_BASE,
  optionADemoNews,
  optionANavItems,
} from "@/lib/design/option-a-demo";

const article = optionADemoNews[0];

export default function OptionANewsSamplePage() {
  return (
    <DesignShell className="gradient-heritage-light min-h-screen">
      <NewsSampleContent />
    </DesignShell>
  );
}

function NewsSampleContent() {
  const { t } = useLanguage();

  return (
    <>
      <SiteHeader
        variant="heritage"
        homeHref={OPTION_A_BASE}
        navItems={optionANavItems}
        showMainNav
      />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="heritage-rainbow-bar" />
        <div className="border-b border-rose-100 bg-gradient-to-br from-rose-50 via-white to-violet-50 px-4 py-10">
          <div className="mx-auto max-w-3xl">
            <Link
              href={`${OPTION_A_BASE}/news`}
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("Back to news", "समाचार पर वापस")}
            </Link>
            <span className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1 text-xs font-bold uppercase text-white shadow-sm">
              {t(article.category, article.categoryHi)}
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">
              <span className="text-gradient-heritage">{t(article.titleEn, article.titleHi)}</span>
            </h1>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-rose-100">
                <Calendar className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                {article.date}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-amber-100">
                <Tag className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                {t("Official notice", "आधिकारिक सूचना")}
              </span>
            </div>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-rose-100 bg-white/90 p-8 shadow-lg shadow-rose-100/40">
            <p className="text-lg leading-relaxed text-slate-700">{article.excerptEn}</p>
            <p className="mt-5 leading-relaxed text-slate-600">
              {t(
                "Eligible candidates should apply through the online admission portal before the last date. Detailed programme-wise seats, eligibility criteria and fee structure are available in the prospectus.",
                "पात्र अभ्यर्थी अंतिम तिथि से पहले ऑनलाइन प्रवेश पोर्टल के माध्यम से आवेदन करें। विस्तृत कार्यक्रमवार सीटें, पात्रता मानदंड और शुल्क संरचना विवरणिका में उपलब्ध है।",
              )}
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              {t(
                "For assistance contact the Admissions Cell, Academic Branch, CCSHAU Hisar during office hours.",
                "सहायता के लिए कार्यालय समय में प्रवेश प्रकोष्ठ, शैक्षणिक शाखा, सीसीएसएचएयू हिसार से संपर्क करें।",
              )}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-200"
              >
                <Download className="h-4 w-4" aria-hidden />
                {t("Download PDF", "पीडीएफ डाउनलोड")}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 px-5 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                {t("Share", "साझा करें")}
              </button>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter variant="heritage" />
    </>
  );
}
