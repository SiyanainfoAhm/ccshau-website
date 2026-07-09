import Image from "next/image";

import { buildImageAlt } from "@/lib/a11y/image-alt";

const DISPLAY_WIDTH = 160;
const DISPLAY_HEIGHT = 200;
const RENDER_WIDTH = DISPLAY_WIDTH * 2;
const RENDER_HEIGHT = DISPLAY_HEIGHT * 2;

function shouldSkipOptimization(src: string): boolean {
  try {
    const hostname = new URL(src).hostname;
    return hostname === "hau.ac.in" || hostname === "www.hau.ac.in";
  } catch {
    return false;
  }
}

export function PortraitPhoto({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={RENDER_WIDTH}
      height={RENDER_HEIGHT}
      quality={92}
      unoptimized={shouldSkipOptimization(src)}
      className={`shrink-0 rounded-lg border border-slate-200 bg-white object-cover object-top shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 ${className}`}
      style={{ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT }}
      sizes={`${DISPLAY_WIDTH}px`}
    />
  );
}

export function portraitAltFromName(nameEn: string, nameHi?: string | null): string {
  return buildImageAlt({ nameEn, nameHi, contextEn: "Portrait photo", fallback: "Portrait photo" });
}
