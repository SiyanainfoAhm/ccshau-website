"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildImageAlt } from "@/lib/a11y/image-alt";
import { useModalA11y } from "@/lib/a11y/use-modal-a11y";
import { publicCardClass } from "@/lib/design/public-page-classes";
import type { PublicMediaItem } from "@/lib/data/public-types";
import { getVideoPlayback } from "@/lib/media/video-playback";

type ZoomableImage = {
  item: PublicMediaItem;
  alt: string;
};

export function PublicMediaAlbumGrid({
  items,
  albumTitleEn,
}: {
  items: PublicMediaItem[];
  albumTitleEn: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const zoomableImages = useMemo<ZoomableImage[]>(
    () =>
      items
        .filter((item) => item.mediaType === "image" && item.url)
        .map((item) => ({
          item,
          alt: buildImageAlt({
            altEn: item.captionEn,
            altHi: item.captionHi,
            titleEn: item.titleEn,
            titleHi: item.titleHi,
            contextEn: `${albumTitleEn} media`,
          }),
        })),
    [albumTitleEn, items],
  );

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((index) =>
      index == null ? null : (index - 1 + zoomableImages.length) % zoomableImages.length,
    );
  }, [zoomableImages.length]);
  const showNext = useCallback(() => {
    setActiveIndex((index) => (index == null ? null : (index + 1) % zoomableImages.length));
  }, [zoomableImages.length]);

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

  const activeImage = activeIndex == null ? null : zoomableImages[activeIndex];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const playback =
            item.mediaType === "video" && item.url ? getVideoPlayback(item.url) : null;
          const zoomIndex =
            item.mediaType === "image" && item.url
              ? zoomableImages.findIndex((entry) => entry.item.id === item.id)
              : -1;

          return (
            <figure key={item.id} className={`overflow-hidden ${publicCardClass} shadow-sm`}>
              <div className="relative aspect-[4/3] bg-slate-100">
                {item.mediaType === "video" ? (
                  playback?.kind === "embed" ? (
                    <iframe
                      src={playback.embedUrl}
                      title={item.titleEn ?? "Video"}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : playback?.kind === "file" ? (
                    <video
                      src={playback.src}
                      controls
                      className="h-full w-full object-cover"
                      poster={item.thumbnailUrl ?? undefined}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Play className="h-12 w-12 text-slate-400" />
                    </div>
                  )
                ) : item.url && zoomIndex >= 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveIndex(zoomIndex)}
                    className="group absolute inset-0 text-left"
                    aria-label={`Zoom photo${item.titleEn ? `: ${item.titleEn}` : ""}`}
                  >
                    <Image
                      src={item.url}
                      alt={zoomableImages[zoomIndex]!.alt}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                      <ZoomIn
                        className="h-8 w-8 text-white opacity-0 transition group-hover:opacity-100"
                        aria-hidden
                      />
                    </div>
                  </button>
                ) : null}
              </div>
              {(item.titleEn || item.captionEn) && (
                <figcaption className="p-4 text-sm">
                  {item.titleEn && <p className="font-semibold text-slate-900">{item.titleEn}</p>}
                  {item.captionEn && <p className="mt-1 text-slate-600">{item.captionEn}</p>}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>

      {activeImage && activeIndex != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            aria-label="Close image viewer"
            className="absolute inset-0 cursor-default"
            onClick={close}
          />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>

          {zoomableImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrev();
                }}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label="Previous image"
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
                aria-label="Next image"
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
            aria-label="Image viewer"
            tabIndex={-1}
          >
            <Image
              src={activeImage.item.url!}
              alt={activeImage.alt}
              width={1600}
              height={1200}
              className="pointer-events-auto mx-auto max-h-[85vh] w-auto max-w-full object-contain"
              sizes="100vw"
              priority
            />
            {(activeImage.item.titleEn || activeImage.item.captionEn) && (
              <div className="pointer-events-auto mt-3 max-w-3xl text-center text-sm text-white/90">
                {activeImage.item.titleEn && (
                  <p className="font-semibold">{activeImage.item.titleEn}</p>
                )}
                {activeImage.item.captionEn && (
                  <p className="mt-1 text-white/75">{activeImage.item.captionEn}</p>
                )}
              </div>
            )}
            <p className="pointer-events-auto mt-2 text-center text-sm text-white/80" aria-live="polite">
              {activeIndex + 1} / {zoomableImages.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
