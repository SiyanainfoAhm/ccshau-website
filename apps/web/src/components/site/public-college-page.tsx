"use client";

import Image from "next/image";
import Link from "next/link";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type {
  PublicCollegePage,
  PublicCollegeSection,
  PublicCollegeSubsection,
} from "@/lib/data/public-types";

function SectionContent({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  const { lang } = useLanguage();

  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      <h1 className={`font-display text-3xl font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}>
        {title}
      </h1>
      {content ? (
        <CmsHtmlContent
          html={content}
          className={`prose prose-emerald mt-6 max-w-none ${lang === "hi" ? "font-hindi" : ""}`}
        />
      ) : (
        <p className="mt-6 text-slate-500">Content coming soon.</p>
      )}
    </article>
  );
}

export function PublicCollegeHome({ college }: { college: PublicCollegePage }) {
  const { lang, t } = useLanguage();
  const title = pickBilingual(lang, college.titleEn, college.titleHi);
  const excerpt = pickBilingual(lang, college.excerptEn, college.excerptHi);
  const content = pickBilingual(lang, college.contentEn, college.contentHi);
  const heroImage =
    college.featuredImageUrl ??
    "https://images.unsplash.com/photo-1560438154-779a4a5e3e38?auto=format&fit=crop&w=1600&q=80";

  return (
    <>
      <section className="relative min-h-[420px] overflow-hidden">
        <Image src={heroImage} alt="" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center text-white">
          {college.logoImageUrl ? (
            <div className="mb-4 overflow-hidden rounded-xl bg-white p-2 shadow-xl">
              <Image
                src={college.logoImageUrl}
                alt=""
                width={96}
                height={96}
                className="h-20 w-20 object-contain"
              />
            </div>
          ) : (
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-white/90 font-display text-2xl font-bold text-emerald-900 shadow-xl">
              HAU
            </div>
          )}
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
            {t("Welcome to The", "में आपका स्वागत है")}
          </p>
          <h1
            className={`mt-2 font-display text-3xl font-bold leading-tight md:text-5xl ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
          {excerpt && (
            <p className={`mt-4 max-w-2xl text-lg text-emerald-100 ${lang === "hi" ? "font-hindi" : ""}`}>
              {excerpt}
            </p>
          )}
          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-full bg-[#6b9b37] px-8 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#5a8530]"
          >
            {t("Contact Us", "संपर्क करें")}
          </Link>
        </div>
      </section>

      {content && (
        <article className="mx-auto max-w-4xl px-4 py-12">
          <CmsHtmlContent
            html={content}
            className={`prose prose-emerald max-w-none ${lang === "hi" ? "font-hindi" : ""}`}
          />
        </article>
      )}
    </>
  );
}

export function PublicCollegeSectionView({
  section,
}: {
  college: PublicCollegePage;
  section: PublicCollegeSection;
}) {
  const { lang } = useLanguage();
  const title = pickBilingual(lang, section.titleEn, section.titleHi);
  const content = pickBilingual(lang, section.contentEn, section.contentHi);

  return <SectionContent title={title} content={content} />;
}

export function PublicCollegeSubsectionView({
  subsection,
}: {
  college: PublicCollegePage;
  section: PublicCollegeSection;
  subsection: PublicCollegeSubsection;
}) {
  const { lang } = useLanguage();
  const title = pickBilingual(lang, subsection.titleEn, subsection.titleHi);
  const content = pickBilingual(lang, subsection.contentEn, subsection.contentHi);

  return <SectionContent title={title} content={content} />;
}
