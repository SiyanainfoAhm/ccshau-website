"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, FileText, Maximize2, Minus, Play, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { buildImageAlt } from "@/lib/a11y/image-alt";
import { useModalA11y } from "@/lib/a11y/use-modal-a11y";
import { useLanguage } from "@/components/design/shared/language-context";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import { publicCardClass } from "@/lib/design/public-page-classes";
import type { PublicMediaItem } from "@/lib/data/public-types";
import { getVideoPlayback } from "@/lib/media/video-playback";

type SlideKind = "image" | "pdf" | "video" | "link";

function slideKind(item: PublicMediaItem): SlideKind {
  const href = item.url ?? "";
  if (item.mediaType === "pdf" || /\.pdf(?:$|[?#])/i.test(href)) return "pdf";
  if (
    item.mediaType === "video" ||
    /\.(mp4|webm|ogg)(?:$|[?#])/i.test(href) ||
    getVideoPlayback(href)?.kind === "embed"
  ) {
    return "video";
  }
  if (item.mediaType === "image") return "image";
  return "link";
}

function embedSrc(item: PublicMediaItem, kind: SlideKind): string | null {
  const href = item.url;
  if (!href) return null;
  if (kind === "pdf") return href.includes("#") ? href : `${href}#toolbar=1`;
  if (kind === "video") {
    const playback = getVideoPlayback(href);
    if (playback?.kind === "embed") return playback.embedUrl;
    if (playback?.kind === "file") return playback.src;
  }
  return href;
}

function DialogSlide({ item, albumTitleEn }: { item: PublicMediaItem; albumTitleEn: string }) {
  const { lang } = useLanguage();
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const kind = slideKind(item);
  const src = embedSrc(item, kind);
  const title = pickBilingual(lang, item.titleEn, item.titleHi) || albumTitleEn;
  const alt = buildImageAlt({
    altEn: item.captionEn,
    altHi: item.captionHi,
    titleEn: item.titleEn,
    titleHi: item.titleHi,
    contextEn: `${albumTitleEn} media`,
  });

  function toggleFullscreen() {
    const node = frameRef.current;
    if (!node) return;
    if (document.fullscreenElement === node) void document.exitFullscreen();
    else void node.requestFullscreen();
  }

  if (!src) return null;

  return (
    <div ref={frameRef} className="relative flex h-[70vh] w-full items-center justify-center bg-black">
      {kind === "image" ? (
        <div className="flex h-full w-full items-center justify-center overflow-auto">
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={1200}
            className="max-h-full max-w-full object-contain"
            style={{ transform: `scale(${zoom})` }}
            sizes="100vw"
            priority
          />
        </div>
      ) : (
        <iframe
          key={src}
          src={src}
          title={title}
          className="h-full border-0 bg-white"
          style={{ width: `${zoom * 100}%` }}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
      <div className="absolute bottom-3 right-3 z-10 flex gap-1">
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}
          className="rounded bg-white/15 p-2 text-white hover:bg-white/25"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))}
          className="rounded bg-white/15 p-2 text-white hover:bg-white/25"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded bg-white/15 p-2 text-white hover:bg-white/25"
          aria-label="Full screen"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function PublicMediaAlbumGrid({
  items,
  albumTitleEn,
}: {
  items: PublicMediaItem[];
  albumTitleEn: string;
}) {
  const { lang } = useLanguage();
  const slides = items.filter((item) => Boolean(item.url));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((index) => (index == null ? null : (index - 1 + slides.length) % slides.length));
  }, [slides.length]);
  const showNext = useCallback(() => {
    setActiveIndex((index) => (index == null ? null : (index + 1) % slides.length));
  }, [slides.length]);

  useModalA11y({
    open: activeIndex != null,
    onClose: close,
    panelRef: dialogRef,
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

  const active = activeIndex == null ? null : slides[activeIndex];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slides.map((item, index) => {
          const title = pickBilingual(lang, item.titleEn, item.titleHi);
          const caption = pickBilingual(lang, item.captionEn, item.captionHi);
          const kind = slideKind(item);
          const previewSrc = embedSrc(item, kind);
          const playback = item.url ? getVideoPlayback(item.url) : null;
          const alt = buildImageAlt({
            altEn: item.captionEn,
            altHi: item.captionHi,
            titleEn: item.titleEn,
            titleHi: item.titleHi,
            contextEn: `${albumTitleEn} media`,
          });

          return (
            <figure key={item.id} className={`overflow-hidden ${publicCardClass} shadow-sm`}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group relative block aspect-[4/3] w-full bg-slate-100 text-left"
                aria-label={`Open ${title || kind}`}
              >
                {kind === "image" && item.url ? (
                  <Image
                    src={item.url}
                    alt={alt}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : kind === "pdf" && previewSrc ? (
                  <iframe
                    src={previewSrc}
                    title={title || "PDF"}
                    className="pointer-events-none h-full w-full border-0 bg-white"
                  />
                ) : kind === "video" && playback?.kind === "embed" ? (
                  <iframe
                    src={playback.embedUrl}
                    title={title || "Video"}
                    className="pointer-events-none h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : kind === "video" && playback?.kind === "file" ? (
                  <video src={playback.src} className="pointer-events-none h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
                    {kind === "pdf" ? <FileText className="h-12 w-12" aria-hidden /> : <Play className="h-12 w-12" aria-hidden />}
                    <span className="text-xs font-medium uppercase tracking-wide">{kind === "pdf" ? "PDF" : "Video"}</span>
                  </span>
                )}
              </button>
              {(title || caption) && (
                <figcaption className="p-4 text-sm">
                  {title && <p className="font-semibold text-slate-900">{title}</p>}
                  {caption && <p className="mt-1 text-slate-600">{caption}</p>}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>

      {active && activeIndex != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button type="button" aria-label="Close viewer" className="absolute inset-0" onClick={close} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Media viewer"
            tabIndex={-1}
            className="relative z-10 w-full max-w-6xl outline-none"
          >
            <button
              type="button"
              onClick={close}
              className="absolute -top-12 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-6 w-6" aria-hidden />
            </button>
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-7 w-7" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                  aria-label="Next"
                >
                  <ChevronRight className="h-7 w-7" aria-hidden />
                </button>
              </>
            )}
            <DialogSlide key={active.id} item={active} albumTitleEn={albumTitleEn} />
            <p className="mt-3 text-center text-sm text-white" aria-live="polite">
              {pickBilingual(lang, active.titleEn, active.titleHi)} {activeIndex + 1} / {slides.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
