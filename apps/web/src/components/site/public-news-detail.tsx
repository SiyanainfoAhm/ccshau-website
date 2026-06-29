"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Download, Tag } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PublicNewsItem } from "@/lib/data/public-types";

export function PublicNewsDetail({ item }: { item: PublicNewsItem }) {
  const { lang, t } = useLanguage();

  const title = pickBilingual(lang, item.titleEn, item.titleHi);
  const body = pickBilingual(lang, item.bodyEn, item.bodyHi);

  return (
    <>
      <div className="gradient-hero pattern-dots px-4 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/news"
            className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {t("Back to news", "समाचार पर वापस")}
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 font-semibold capitalize text-amber-200">
              <Tag className="h-3.5 w-3.5" /> {item.category ?? item.noticeType}
            </span>
            {item.publishedAt && (
              <span className="inline-flex items-center gap-1 text-emerald-200">
                <Calendar className="h-3.5 w-3.5" />{" "}
                {new Date(item.publishedAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          <h1
            className={`mt-4 font-display text-4xl font-bold leading-tight md:text-5xl ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12">
        {body ? (
          <CmsHtmlContent
            html={body}
            className={`prose prose-emerald max-w-none text-lg leading-relaxed text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}
          />
        ) : (
          <p className="text-slate-500">{t("No additional content.", "कोई अतिरिक्त सामग्री नहीं।")}</p>
        )}

        {item.attachmentPaths.length > 0 && (
          <div className="not-prose mt-10 space-y-3">
            <h2 className="font-display text-xl font-bold text-slate-900">
              {t("Attachments", "संलग्नक")}
            </h2>
            {item.attachmentPaths.map((file) => (
              <a
                key={file.path}
                href={file.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <Download className="h-4 w-4" />
                {file.name}
              </a>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
