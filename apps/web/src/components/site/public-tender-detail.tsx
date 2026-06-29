"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Download, Gavel } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PublicTenderItem } from "@/lib/data/public-types";

export function PublicTenderDetail({ tender }: { tender: PublicTenderItem }) {
  const { lang, t } = useLanguage();

  const title = pickBilingual(lang, tender.titleEn, tender.titleHi);
  const description = pickBilingual(lang, tender.descriptionEn, tender.descriptionHi);

  return (
    <>
      <div className="gradient-hero px-4 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/tenders"
            className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {t("Back to tenders", "निविदाओं पर वापस")}
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 font-semibold capitalize text-amber-200">
              <Gavel className="h-3.5 w-3.5" /> {tender.status}
            </span>
            {tender.tenderNumber && (
              <span className="text-emerald-200">#{tender.tenderNumber}</span>
            )}
            {tender.closingDate && (
              <span className="inline-flex items-center gap-1 text-emerald-200">
                <Calendar className="h-3.5 w-3.5" /> {t("Closes", "समाप्ति")}{" "}
                {new Date(tender.closingDate).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN")}
              </span>
            )}
          </div>
          <h1
            className={`mt-4 font-display text-4xl font-bold leading-tight ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12">
        {description ? (
          <CmsHtmlContent
            html={description}
            className={`prose prose-emerald max-w-none text-lg leading-relaxed text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}
          />
        ) : null}

        {tender.documents.length > 0 && (
          <div className="mt-10 space-y-3">
            <h2 className="font-display text-xl font-bold text-slate-900">
              {t("Documents", "दस्तावेज़")}
            </h2>
            {tender.documents.map((doc) => (
              <a
                key={doc.path}
                href={doc.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                <Download className="h-4 w-4" />
                {doc.name}
              </a>
            ))}
          </div>
        )}

        {tender.corrigenda.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2 className="font-display text-xl font-bold text-slate-900">
              {t("Corrigenda", "शुद्धिपत्र")}
            </h2>
            {tender.corrigenda.map((c) => (
              <div key={c.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-slate-900">{c.title}</p>
                {c.description && <p className="mt-2 text-sm text-slate-600">{c.description}</p>}
                {c.fileUrl && (
                  <a
                    href={c.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {c.fileName ?? t("Download corrigendum", "शुद्धिपत्र डाउनलोड करें")}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
