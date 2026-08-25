"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Download, Gavel } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PublicTenderItem } from "@/lib/data/public-types";
import { formatTenderCategory } from "@/lib/validations/tenders";
import {
  publicCardSoftClass,
  publicHeadingClass,
  publicListItemClass,
  publicProseClass,
  typeHeroTitleClass,
  typeSectionTitleClass,
  typeSubsectionTitleClass,
} from "@/lib/design/public-page-classes";

export function PublicTenderDetail({ tender }: { tender: PublicTenderItem }) {
  const { lang, t } = useLanguage();

  const title = pickBilingual(lang, tender.titleEn, tender.titleHi);
  const description = pickBilingual(lang, tender.descriptionEn, tender.descriptionHi);
  const cancellationNotice = pickBilingual(
    lang,
    tender.cancellationNoticeEn,
    tender.cancellationNoticeHi,
  );
  const locale = lang === "hi" ? "hi-IN" : "en-IN";

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
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold capitalize ${
                tender.status === "cancelled"
                  ? "bg-red-500/20 text-red-100"
                  : "bg-amber-400/20 text-amber-200"
              }`}
            >
              <Gavel className="h-3.5 w-3.5" /> {tender.status}
            </span>
            {tender.tenderNumber && (
              <span className="text-emerald-200">#{tender.tenderNumber}</span>
            )}
            {tender.category && (
              <span className="text-emerald-200">{formatTenderCategory(tender.category)}</span>
            )}
            {tender.departmentName && (
              <span className="text-emerald-200">{tender.departmentName}</span>
            )}
          </div>
          <h1
            className={`mt-4 ${typeHeroTitleClass} ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-emerald-200">
            {tender.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {t("Published", "प्रकाशित")}{" "}
                {new Date(tender.publishedAt).toLocaleDateString(locale)}
              </span>
            )}
            {tender.closingDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {t("Closes", "समाप्ति")}{" "}
                {new Date(tender.closingDate).toLocaleDateString(locale)}
              </span>
            )}
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12">
        {tender.status === "cancelled" && (cancellationNotice || tender.cancellationDocument) && (
          <div className="mb-10 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
            <h2 className={`${typeSubsectionTitleClass} text-red-900 dark:text-red-200`}>
              {t("Cancellation notice", "रद्दीकरण सूचना")}
            </h2>
            {cancellationNotice && (
              <p className={`mt-3 text-sm text-red-900/90 dark:text-red-100/90 ${lang === "hi" ? "font-hindi" : ""}`}>
                {cancellationNotice}
              </p>
            )}
            {tender.cancellationDocument?.url && (
              <a
                href={tender.cancellationDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-800 hover:underline dark:text-red-200"
              >
                <Download className="h-4 w-4" />
                {tender.cancellationDocument.name}
              </a>
            )}
            {tender.cancelledAt && (
              <p className="mt-3 text-xs text-red-700/80 dark:text-red-200/70">
                {t("Cancelled on", "रद्द किया गया")}{" "}
                {new Date(tender.cancelledAt).toLocaleDateString(locale)}
              </p>
            )}
          </div>
        )}

        {description ? (
          <CmsHtmlContent
            html={description}
            className={`${publicProseClass} ${lang === "hi" ? "font-hindi" : ""}`}
          />
        ) : null}

        {tender.documents.length > 0 && (
          <div className="mt-10 space-y-3">
            <h2 className={typeSectionTitleClass}>
              {t("Documents", "दस्तावेज़")}
            </h2>
            {tender.documents.map((doc) => (
              <a
                key={doc.path}
                href={doc.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 ${publicListItemClass} px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200`}
              >
                <Download className="h-4 w-4" />
                {doc.name}
              </a>
            ))}
          </div>
        )}

        {tender.corrigenda.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2 className={typeSectionTitleClass}>
              {t("Corrigenda", "शुद्धिपत्र")}
            </h2>
            {tender.corrigenda.map((c) => (
              <div
                key={c.id}
                className={`${publicCardSoftClass} border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30`}
              >
                <p className={`font-semibold ${publicHeadingClass}`}>{c.title}</p>
                {c.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-emerald-100/80">{c.description}</p>
                )}
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
