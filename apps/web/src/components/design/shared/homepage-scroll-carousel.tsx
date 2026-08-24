"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useLanguage } from "@/components/design/shared/language-context";

type CarouselVariant = "heritage" | "future" | "ministry";

const OVERFLOW_EPSILON = 2;

export function HomepageScrollCarousel({
  children,
  ariaLabel,
  variant = "future",
  scrollStep = 320,
}: {
  children: ReactNode;
  ariaLabel: string;
  variant?: CarouselVariant;
  scrollStep?: number;
}) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const overflow = maxScroll > OVERFLOW_EPSILON;
    setCanScrollLeft(overflow && el.scrollLeft > OVERFLOW_EPSILON);
    setCanScrollRight(overflow && el.scrollLeft < maxScroll - OVERFLOW_EPSILON);
  }, []);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => updateOverflow());
    const observeAll = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(el);
      for (const child of Array.from(el.children)) {
        resizeObserver.observe(child);
      }
    };

    observeAll();
    updateOverflow();

    const mutationObserver = new MutationObserver(() => {
      observeAll();
      updateOverflow();
    });
    mutationObserver.observe(el, { childList: true, subtree: true });

    el.addEventListener("scroll", updateOverflow, { passive: true });
    window.addEventListener("resize", updateOverflow);

    const images = el.querySelectorAll("img");
    images.forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", updateOverflow);
        image.addEventListener("error", updateOverflow);
      }
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      el.removeEventListener("scroll", updateOverflow);
      window.removeEventListener("resize", updateOverflow);
      images.forEach((image) => {
        image.removeEventListener("load", updateOverflow);
        image.removeEventListener("error", updateOverflow);
      });
    };
  }, [updateOverflow, children]);

  const scroll = useCallback(
    (direction: -1 | 1) => {
      trackRef.current?.scrollBy({ left: direction * scrollStep, behavior: "smooth" });
    },
    [scrollStep],
  );

  const overflows = canScrollLeft || canScrollRight;

  const controlClass =
    variant === "heritage"
      ? "border-rose-200 bg-white/95 text-violet-700 shadow-md hover:bg-rose-50"
      : variant === "ministry"
        ? "border-slate-300 bg-white text-[#0c3b6e] shadow-md hover:bg-sky-50"
        : "border-emerald-200/80 bg-white/95 text-emerald-800 shadow-lg hover:bg-sky-50 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-amber-300 dark:hover:bg-emerald-900";

  return (
    <div className="relative mt-10">
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scroll(-1)}
          className={`absolute -left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition sm:h-10 sm:w-10 lg:-left-5 ${controlClass}`}
          aria-label={t("Previous", "पिछला")}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        className={`homepage-carousel-track flex gap-5 overflow-x-auto scroll-smooth pb-3 pt-1 snap-x snap-mandatory ${
          overflows ? "justify-start" : "justify-center"
        }`}
      >
        {children}
      </div>

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scroll(1)}
          className={`absolute -right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition sm:h-10 sm:w-10 lg:-right-5 ${controlClass}`}
          aria-label={t("Next", "अगला")}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
