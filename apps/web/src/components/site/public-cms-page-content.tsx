"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { PublicCollegeGallery } from "@/components/site/public-college-gallery";
import type { PublicGalleryImage } from "@/lib/data/public-types";
import { hasCmsHtmlContent } from "@/lib/html/has-cms-html-content";
import { formatMenuLabel } from "@/lib/i18n/menu-label";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";

export interface PublicCmsPageData {
  slug: string;
  titleEn: string;
  titleHi?: string | null;
  excerptEn?: string | null;
  excerptHi?: string | null;
  contentEn?: string | null;
  contentHi?: string | null;
}

export function PublicCmsPageContent({
  page,
  galleryImages = [],
}: {
  page: PublicCmsPageData;
  galleryImages?: PublicGalleryImage[];
}) {
  const { lang } = useLanguage();

  const content = pickBilingual(lang, page.contentEn, page.contentHi);
  const isIntlListing = Boolean(
    content && /intl-linkage-band/i.test(content),
  );
  const isIntlDetail = Boolean(
    content && /intl-linkage-detail/i.test(content),
  );
  const isIntlPage = isIntlListing || isIntlDetail;

  const rawTitle = pickBilingual(lang, page.titleEn, page.titleHi) || "";
  const title = isIntlPage
    ? rawTitle
    : formatMenuLabel(rawTitle, lang, "title");
  const excerpt = pickBilingual(lang, page.excerptEn, page.excerptHi);
  const hasGallery = galleryImages.length > 0;
  const hasBody = hasCmsHtmlContent(content);
  const wideLayout =
    hasGallery ||
    isIntlPage ||
    Boolean(
      content &&
        /(?:major-initiatives-grid|intl-linkage-mou-table)/i.test(content),
    );
  const shellMax = isIntlListing
    ? "max-w-7xl"
    : isIntlDetail
      ? "max-w-5xl"
      : wideLayout
        ? "max-w-6xl"
        : "max-w-3xl";
  const backHref = isIntlDetail ? "/pages/international-linkage" : "/";
  const backLabel = isIntlDetail ? "International Linkage" : "Home";
  // Detail body already includes purpose + MoU image; avoid duplicating excerpt.
  const showExcerpt = Boolean(excerpt) && !isIntlDetail;

  return (
    <>
      <div className="gradient-hero pattern-dots px-4 py-12 text-white">
        <div className={`mx-auto ${shellMax}`}>
          <Link
            href={backHref}
            className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
          <h1
            className={`font-display text-3xl font-bold leading-tight sm:text-4xl ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
          {isIntlDetail && excerpt ? (
            <p className="mt-3 max-w-3xl text-base text-emerald-100/90 sm:text-lg">
              {excerpt}
            </p>
          ) : null}
        </div>
      </div>

      <article className={`mx-auto px-4 py-10 sm:py-12 ${shellMax}`}>
        {showExcerpt ? (
          <p className={`mb-6 text-lg text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}>
            {excerpt}
          </p>
        ) : null}
        {hasBody ? (
          <CmsHtmlContent
            html={content!}
            className={`prose prose-emerald max-w-none ${lang === "hi" ? "font-hindi" : ""}`}
          />
        ) : null}
        {hasGallery ? (
          <div className={hasBody ? "mt-10" : undefined}>
            <PublicCollegeGallery
              images={galleryImages}
              albumTitleEn=""
              albumTitleHi=""
              showCaptions
              imageFit="contain"
            />
          </div>
        ) : null}
        {!hasBody && !hasGallery ? (
          <p className="text-slate-500">Content coming soon.</p>
        ) : null}
      </article>
    </>
  );
}
