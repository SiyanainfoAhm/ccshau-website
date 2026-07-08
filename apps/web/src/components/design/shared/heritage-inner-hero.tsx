"use client";

import { useLanguage } from "@/components/design/shared/language-context";

export function HeritageInnerHero({
  title,
  titleHi,
  subtitle,
  subtitleHi,
}: {
  title: string;
  titleHi: string;
  subtitle?: string;
  subtitleHi?: string;
}) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden border-b border-rose-100 bg-gradient-to-br from-rose-50 via-amber-50/60 to-sky-50">
      <div className="heritage-rainbow-bar" />
      <div className="pattern-heritage-light absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
          {t("Heritage Premium demo", "विरासत प्रीमियम डेमो")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-5xl">
          <span className="text-gradient-heritage">{t(title, titleHi)}</span>
        </h1>
        {(subtitle || subtitleHi) && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            {t(subtitle ?? "", subtitleHi ?? subtitle ?? "")}
          </p>
        )}
      </div>
    </section>
  );
}
