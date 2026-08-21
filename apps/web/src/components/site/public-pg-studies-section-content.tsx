"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { PublicCollegeGallery } from "@/components/site/public-college-gallery";
import { useLanguage } from "@/components/design/shared/language-context";
import type {
  PublicGalleryImage,
  PublicPgStudiesHub,
  PublicPgStudiesSection,
} from "@/lib/data/public-types";
import { buildImageAlt } from "@/lib/a11y/image-alt";
import { hasCmsHtmlContent } from "@/lib/html/has-cms-html-content";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import { getPgStudiesHubPath } from "@/lib/pages/routes";

export function PublicPgStudiesSectionContent({
  hub,
  section,
  galleryImages,
  heroImageUrl,
}: {
  hub: PublicPgStudiesHub;
  section: PublicPgStudiesSection;
  galleryImages?: PublicGalleryImage[];
  heroImageUrl?: string | null;
}) {
  const { lang, t } = useLanguage();
  const title = pickBilingual(lang, section.titleEn, section.titleHi);
  const bodyHtml = pickBilingual(lang, section.contentEn, section.contentHi);
  const showGallery = section.layoutConfig.gallery && (galleryImages?.length ?? 0) > 0;
  const hasBody = hasCmsHtmlContent(bodyHtml);

  const heroImage =
    heroImageUrl ??
    hub.featuredImageUrl ??
    "https://images.unsplash.com/photo-1560438154-779a4a5e3e38?auto=format&fit=crop&w=1600&q=80";

  return (
    <>
      <section className="relative min-h-[240px] overflow-hidden">
        <Image
          src={heroImage}
          alt={buildImageAlt({ titleEn: `${title} — PG Studies`, titleHi: section.titleHi, lang })}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 text-center text-white md:py-14">
          <Link
            href={getPgStudiesHubPath()}
            className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {t("PG Studies Home", "स्नातकोत्तर अध्ययन होम")}
          </Link>
          <h1
            className={`font-display text-3xl font-bold leading-tight md:text-4xl ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {showGallery && galleryImages ? (
          <PublicCollegeGallery images={galleryImages} />
        ) : hasBody ? (
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <CmsHtmlContent
              html={bodyHtml!}
              className={`prose prose-emerald max-w-none ${lang === "hi" ? "font-hindi" : ""}`}
            />
          </article>
        ) : (
          <p className="text-center text-slate-500">{t("Content coming soon.", "सामग्री जल्द आ रही है।")}</p>
        )}
      </div>
    </>
  );
}
