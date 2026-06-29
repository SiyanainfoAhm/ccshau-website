"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PublicPage } from "@/lib/data/public-types";

export function PublicEventPortalContent({ page }: { page: PublicPage }) {
  const { lang, t } = useLanguage();

  const title = pickBilingual(lang, page.titleEn, page.titleHi);
  const excerpt = pickBilingual(lang, page.excerptEn, page.excerptHi);
  const content = pickBilingual(lang, page.contentEn, page.contentHi);

  return (
    <>
      <div className="gradient-hero px-4 py-14 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/events"
            className="mb-6 inline-flex items-center gap-2 text-sm text-amber-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Back to events calendar", "कार्यक्रम कैलेंडर पर वापस")}
          </Link>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">
            {t("Event portal", "कार्यक्रम पोर्टल")}
          </p>
          <h1
            className={`mt-2 font-display text-4xl font-bold leading-tight md:text-5xl ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
          {excerpt && (
            <p className={`mt-4 text-lg text-emerald-100 ${lang === "hi" ? "font-hindi" : ""}`}>
              {excerpt}
            </p>
          )}
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12">
        {content ? (
          <CmsHtmlContent
            html={content}
            className={`prose prose-emerald max-w-none text-lg leading-relaxed ${lang === "hi" ? "font-hindi" : ""}`}
          />
        ) : (
          <p className="text-slate-500">{t("Content coming soon.", "सामग्री शीघ्र उपलब्ध होगी।")}</p>
        )}
      </article>
    </>
  );
}
