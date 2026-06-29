"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { useLanguage } from "@/components/design/shared/language-context";
import { FloatingOrbs } from "@/components/design/shared/floating-orbs";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import type { PublicHeroSlide } from "@/lib/data/public-types";
import { heroSlides as mockHeroSlides, university } from "@/lib/mock/site-content";

export function HeroCarousel({
  variant = "future",
  slides: slidesProp,
  tendersPath = SELECTED_LAYOUT.routes.tenders,
}: {
  variant?: "heritage" | "future" | "ministry";
  slides?: PublicHeroSlide[];
  tendersPath?: string;
}) {
  const { t } = useLanguage();
  const heroSlides =
    slidesProp && slidesProp.length > 0
      ? slidesProp
      : mockHeroSlides.map((s) => ({
          titleEn: s.titleEn,
          titleHi: s.titleHi,
          subtitleEn: s.subtitleEn,
          image: s.image,
          targetUrl: null,
        }));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(id);
  }, [heroSlides.length]);

  const slide = heroSlides[index];

  if (variant === "ministry") {
    return (
      <section className="border-b-4 border-[#146c43] bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-up">
            <div className="flex flex-wrap gap-2">
              <span className="rounded bg-[#e8850c] px-3 py-1 text-xs font-bold uppercase text-white">
                {t("A+ NAEAB", "ए+ एनएईएबी")}
              </span>
              <span className="rounded border-2 border-[#146c43] bg-white px-3 py-1 text-xs font-bold uppercase text-[#146c43]">
                {t("ICAR Deemed University", "आईसीएआर मान्य")}
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              {t(slide.titleEn, slide.titleHi ?? slide.titleEn)}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">{slide.subtitleEn}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/design/option-c/news"
                className="ministry-focus inline-flex items-center gap-2 rounded-md bg-[#146c43] px-6 py-3 font-bold text-white hover:bg-[#0b3d2e]"
              >
                {t("Latest Notices", "नवीनतम सूचनाएं")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/design/option-c/tenders"
                className="ministry-focus inline-flex items-center gap-2 rounded-md border-2 border-[#146c43] bg-white px-6 py-3 font-bold text-[#146c43] hover:bg-emerald-50"
              >
                {t("Tenders", "निविदाएं")}
              </Link>
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-md border-2 border-slate-300 bg-white shadow-md ring-1 ring-slate-200">
            <Image src={slide.image} alt="" fill className="object-cover" priority />
            <div className="absolute bottom-0 left-0 right-0 bg-[#146c43] px-4 py-2 text-center text-sm font-semibold text-white">
              {t(university.taglineEn, university.taglineHi)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "heritage") {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-50/50 via-white to-sky-50/50">
        <FloatingOrbs variant="heritage" />
        <div className="pattern-heritage-light absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-0 lg:grid-cols-12 lg:min-h-[500px]">
          <div className="relative z-10 flex flex-col justify-center border-b border-white/80 bg-white/70 px-8 py-14 shadow-lg shadow-rose-100/30 backdrop-blur-md lg:col-span-5 lg:border-b-0 lg:border-r lg:border-white/60 lg:px-12 lg:py-16">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-rose-100 via-amber-50 to-sky-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-700 ring-1 ring-white">
              {t(university.accreditationEn, university.accreditationHi)}
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.12] md:text-5xl">
              <span className="text-gradient-heritage">{t(slide.titleEn, slide.titleHi ?? slide.titleEn)}</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">{slide.subtitleEn}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:from-rose-600 hover:to-pink-600"
              >
                {t("Online Admission 2026-27", "ऑनलाइन प्रवेश 2026-27")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 px-6 py-3 font-semibold text-amber-800 ring-2 ring-amber-200 transition hover:from-amber-200 hover:to-orange-200"
              >
                {t("Farmers' Portal", "किसान पोर्टल")}
              </Link>
            </div>
            <div className="mt-10 flex gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-gradient-to-r from-rose-400 to-violet-400" : "w-3 bg-slate-200"}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="relative lg:col-span-7">
            <div className="relative h-[320px] p-4 lg:absolute lg:inset-0 lg:h-auto lg:p-6">
              <div className="relative h-full overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/80">
                <Image src={slide.image} alt="" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-200/20 via-transparent to-sky-200/25" />
              </div>
              <div className="absolute -bottom-2 left-8 right-8 hidden rounded-2xl bg-gradient-to-r from-amber-100 via-rose-50 to-sky-100 p-4 shadow-lg ring-1 ring-white lg:block lg:left-10 lg:right-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
                  {t("Legacy of Excellence", "उत्कृष्टता की विरासत")}
                </p>
                <p className="mt-1 font-display text-base font-bold text-slate-800">
                  {t("55+ Years of Agricultural Leadership", "55+ वर्षों की कृषि नेतृत्व")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="heritage-rainbow-bar relative z-10" />
        <div className="relative z-10 bg-gradient-to-r from-rose-50/90 via-amber-50/90 to-sky-50/90 py-3 text-center text-sm font-semibold text-slate-700">
          {t(
            "Est. 1970 · Hisar, Haryana · ICAR Deemed University",
            "स्थापना 1970 · हिसार, हरियाणा · आईसीएआर मान्य विश्वविद्यालय",
          )}
        </div>
      </section>
    );
  }

  // Option B — Future (most exciting)
  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      <FloatingOrbs />
      {heroSlides.map((s, i) => (
        <div
          key={s.titleEn}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={s.image}
            alt=""
            fill
            className={`object-cover ${i === index ? "animate-ken-burns" : "scale-105"}`}
            priority={i === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b3d2e]/95 via-[#146c43]/80 to-[#0b3d2e]/60" />
          <div className="pattern-dots absolute inset-0" />
        </div>
      ))}

      <div className="relative mx-auto flex min-h-[90vh] max-w-7xl flex-col justify-center px-4 py-20">
        <div className="animate-fade-up stagger-children">
          <span className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-2 text-sm font-medium text-amber-200 animate-pulse-glow">
            <Sparkles className="h-4 w-4" />
            {t("NAEAB A+ Accredited University", "एनएईएबी ए+ मान्यता")}
          </span>

          <h1 className="mt-8 max-w-4xl font-display text-5xl font-bold leading-[1.1] text-white md:text-7xl">
            <span className="text-gradient-gold">{t(slide.titleEn, slide.titleHi ?? slide.titleEn)}</span>
          </h1>

          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-emerald-100/90">
            {slide.subtitleEn ?? ""}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={slide.targetUrl || "#"}
              className="group inline-flex items-center gap-2 rounded-2xl gradient-gold px-8 py-4 font-bold text-emerald-950 shadow-xl shadow-amber-500/25 transition hover:scale-105"
            >
              {t("Learn more", "और जानें")}
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href={tendersPath}
              className="inline-flex items-center gap-2 rounded-2xl glass-panel px-8 py-4 font-semibold text-white transition hover:bg-white/20"
            >
              {t("View Tenders", "निविदाएं देखें")}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-4 right-4 flex justify-center gap-2 md:left-auto md:right-8">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-10 bg-amber-400" : "w-2 bg-white/40"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
