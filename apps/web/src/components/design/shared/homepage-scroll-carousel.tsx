"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef, type ReactNode } from "react";

import { useLanguage } from "@/components/design/shared/language-context";

type CarouselVariant = "heritage" | "future" | "ministry";

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

  const scroll = useCallback(
    (direction: -1 | 1) => {
      trackRef.current?.scrollBy({ left: direction * scrollStep, behavior: "smooth" });
    },
    [scrollStep],
  );

  const controlClass =
    variant === "heritage"
      ? "border-rose-200 bg-white/95 text-violet-700 shadow-md hover:bg-rose-50"
      : variant === "ministry"
        ? "border-slate-300 bg-white text-[#146c43] shadow-md hover:bg-emerald-50"
        : "border-emerald-200/80 bg-white/95 text-emerald-800 shadow-lg hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-amber-300 dark:hover:bg-emerald-900";

  return (
    <div className="relative mt-10">
      <button
        type="button"
        onClick={() => scroll(-1)}
        className={`absolute -left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition sm:h-10 sm:w-10 lg:-left-5 ${controlClass}`}
        aria-label={t("Previous", "पिछला")}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>

      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        className="homepage-carousel-track flex gap-5 overflow-x-auto scroll-smooth pb-3 pt-1 snap-x snap-mandatory"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        className={`absolute -right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition sm:h-10 sm:w-10 lg:-right-5 ${controlClass}`}
        aria-label={t("Next", "अगला")}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
