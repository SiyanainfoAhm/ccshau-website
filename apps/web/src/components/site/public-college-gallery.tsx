"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/components/design/shared/language-context";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PublicGalleryImage } from "@/lib/data/public-types";

export function PublicCollegeGallery({
  images,
  albumTitleEn = "Images",
  albumTitleHi = "छवियाँ",
}: {
  images: PublicGalleryImage[];
  albumTitleEn?: string;
  albumTitleHi?: string;
}) {
  const { lang, t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((index) => (index == null ? null : (index - 1 + images.length) % images.length));
  }, [images.length]);
  const showNext = useCallback(() => {
    setActiveIndex((index) => (index == null ? null : (index + 1) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (activeIndex == null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, close, showNext, showPrev]);

  if (images.length === 0) {
    return (
      <p className="text-center text-slate-500">{t("Gallery images coming soon.", "गैलरी छवियाँ जल्द आ रही हैं।")}</p>
    );
  }

  const activeImage = activeIndex == null ? null : images[activeIndex];

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-emerald-50 px-6 py-4">
          <h2 className={`font-display text-2xl font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}>
            {pickBilingual(lang, albumTitleEn, albumTitleHi)}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const label = pickBilingual(lang, image.titleEn, image.titleHi) || t("Photo", "फोटो");
            const thumb = image.thumbnailUrl ?? image.imageUrl;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                aria-label={t(`View image ${index + 1}`, `छवि ${index + 1} देखें`)}
              >
                <Image
                  src={thumb}
                  alt={label}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 transition group-hover:opacity-100" aria-hidden />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeImage && activeIndex != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("Image viewer", "छवि दर्शक")}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label={t("Close", "बंद करें")}
          >
            <X className="h-6 w-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label={t("Previous image", "पिछली छवि")}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label={t("Next image", "अगली छवि")}
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          <div
            className="relative max-h-[90vh] w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={activeImage.imageUrl}
              alt={pickBilingual(lang, activeImage.titleEn, activeImage.titleHi) || t("Gallery image", "गैलरी छवि")}
              width={1600}
              height={1200}
              className="mx-auto max-h-[85vh] w-auto max-w-full object-contain"
              sizes="100vw"
              priority
            />
            <p className="mt-3 text-center text-sm text-white/80">
              {activeIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
