"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, Play } from "lucide-react";
import { getYouTubeVideo } from "@/lib/media/video-playback";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLanguage } from "@/components/design/shared/language-context";
import { useModalA11y } from "@/lib/a11y/use-modal-a11y";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PublicGalleryImage } from "@/lib/data/public-types";

function isRemoteSrc(src: string) {
  return /^https?:\/\//i.test(src);
}

export function PublicCollegeGallery({
  images,
  albumTitleEn = "Images",
  albumTitleHi = "छवियाँ",
  showCaptions = false,
  imageFit = "cover",
}: {
  images: PublicGalleryImage[];
  albumTitleEn?: string;
  albumTitleHi?: string;
  showCaptions?: boolean;
  imageFit?: "cover" | "contain";
}) {
  const { lang, t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const visibleImages = images.filter((image) => Boolean(image.thumbnailUrl ?? image.imageUrl));
  const imageCount = visibleImages.length;

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((index) =>
      index == null || imageCount === 0 ? null : (index - 1 + imageCount) % imageCount,
    );
  }, [imageCount]);
  const showNext = useCallback(() => {
    setActiveIndex((index) =>
      index == null || imageCount === 0 ? null : (index + 1) % imageCount,
    );
  }, [imageCount]);

  useModalA11y({
    open: activeIndex != null,
    onClose: close,
    panelRef: lightboxRef,
  });

  useEffect(() => {
    if (activeIndex == null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, showNext, showPrev]);

  if (imageCount === 0) {
    return (
      <p className="text-center text-slate-500">{t("Gallery images coming soon.", "गैलरी छवियाँ जल्द आ रही हैं।")}</p>
    );
  }

  const activeImage = activeIndex == null ? null : visibleImages[activeIndex];
  const activeVideo = activeImage ? getYouTubeVideo(activeImage.imageUrl) : null;

  const heading = pickBilingual(lang, albumTitleEn, albumTitleHi);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {heading ? (
          <div className="border-b border-slate-100 bg-emerald-50 px-6 py-4">
            <h2 className={`type-section-title text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}>
              {heading}
            </h2>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4">
          {visibleImages.map((image, index) => {
            const video = getYouTubeVideo(image.imageUrl);
            const label = pickBilingual(lang, image.titleEn, image.titleHi) || (video ? t("Video", "वीडियो") : t("Photo", "फोटो"));
            const thumb = (image.thumbnailUrl ?? video?.thumbnailUrl ?? image.imageUrl)!;
            const fitClass = imageFit === "contain" ? "object-contain" : "object-cover";

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`group text-left ${
                  showCaptions
                    ? "flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                    : "relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                }`}
                aria-label={t(`View ${label}`, `${label} देखें`)}
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-50">
                  <Image
                    src={thumb}
                    alt={label}
                    fill
                    unoptimized={isRemoteSrc(thumb)}
                    className={`${fitClass} transition duration-300 group-hover:scale-105`}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                    {video ? <Play className="h-10 w-10 rounded-full bg-black/60 p-2 text-white" aria-hidden /> : <ZoomIn className="h-8 w-8 text-white opacity-0 transition group-hover:opacity-100" aria-hidden />}
                  </span>
                </span>
                {showCaptions ? (
                  <span
                    className={`px-3 py-2 text-sm font-semibold leading-snug break-words text-slate-800 ${
                      lang === "hi" ? "font-hindi" : ""
                    }`}
                  >
                    {label}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeImage && activeIndex != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            aria-label={t("Close image viewer", "छवि दर्शक बंद करें")}
            className="absolute inset-0 cursor-default"
            onClick={close}
          />
          {!activeVideo && <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label={t("Close", "बंद करें")}
          >
            <X className="h-6 w-6" aria-hidden />
          </button>}

          {!activeVideo && imageCount > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrev();
                }}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label={t("Previous image", "पिछली छवि")}
              >
                <ChevronLeft className="h-7 w-7" aria-hidden />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label={t("Next image", "अगली छवि")}
              >
                <ChevronRight className="h-7 w-7" aria-hidden />
              </button>
            </>
          )}

          <div
            ref={lightboxRef}
            className="pointer-events-none relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col items-center outline-none"
            role="dialog"
            aria-modal="true"
            aria-label={activeVideo ? t("Video viewer", "वीडियो दर्शक") : t("Image viewer", "छवि दर्शक")}
            tabIndex={-1}
          >
            {activeVideo ? (
              <div className="pointer-events-auto w-full max-w-5xl">
                <div className="mb-2 flex items-center justify-end gap-2 text-white">
                  {imageCount > 1 && <>
                    <button type="button" onClick={showPrev} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label={t("Previous item", "पिछला आइटम")}><ChevronLeft className="h-5 w-5" aria-hidden /></button>
                    <button type="button" onClick={showNext} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label={t("Next item", "अगला आइटम")}><ChevronRight className="h-5 w-5" aria-hidden /></button>
                  </>}
                  <button type="button" onClick={close} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label={t("Close video", "वीडियो बंद करें")}><X className="h-5 w-5" aria-hidden /></button>
                </div>
                <iframe
                  key={activeImage.id}
                  src={activeVideo.embedUrl}
                  title={pickBilingual(lang, activeImage.titleEn, activeImage.titleHi) || t("YouTube video", "यूट्यूब वीडियो")}
                  className="aspect-video min-h-[200px] max-h-[75vh] w-full rounded-lg border-0 bg-black"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                <a href={activeVideo.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-sm text-white underline">
                  {t("Watch on YouTube", "यूट्यूब पर देखें")}
                </a>
              </div>
            ) : <Image
              src={activeImage.imageUrl}
              alt={pickBilingual(lang, activeImage.titleEn, activeImage.titleHi) || t("Gallery image", "गैलरी छवि")}
              width={1600}
              height={1200}
              unoptimized={isRemoteSrc(activeImage.imageUrl)}
              className="pointer-events-auto mx-auto max-h-[85vh] w-auto max-w-full object-contain"
              sizes="100vw"
              priority
            />}
            <p className="pointer-events-auto mt-3 max-w-3xl text-center text-sm text-white/90" aria-live="polite">
              {pickBilingual(lang, activeImage.titleEn, activeImage.titleHi) ||
                `${activeIndex + 1} / ${visibleImages.length}`}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
