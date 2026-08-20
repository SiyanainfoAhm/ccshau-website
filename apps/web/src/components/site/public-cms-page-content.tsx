"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { PublicCollegeGallery } from "@/components/site/public-college-gallery";
import type { PublicGalleryImage } from "@/lib/data/public-types";
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

  const title = formatMenuLabel(
    pickBilingual(lang, page.titleEn, page.titleHi),
    lang,
    "title",
  );
  const excerpt = pickBilingual(lang, page.excerptEn, page.excerptHi);
  const content = pickBilingual(lang, page.contentEn, page.contentHi);
  const hasGallery = galleryImages.length > 0;
  const hasBody = Boolean(content?.replace(/<[^>]+>/g, " ").trim());

  return (
    <>
      <div className="gradient-hero pattern-dots px-4 py-12 text-white">
        <div className={`mx-auto ${hasGallery ? "max-w-6xl" : "max-w-3xl"}`}>
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <h1
            className={`font-display text-4xl font-bold leading-tight ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
        </div>
      </div>

      <article className={`mx-auto px-4 py-12 ${hasGallery ? "max-w-6xl" : "max-w-3xl"}`}>
        {excerpt && (
          <p className={`mb-6 text-lg text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}>
            {excerpt}
          </p>
        )}
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
