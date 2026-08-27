"use client";

import Image from "next/image";
import { useState } from "react";

/** Shown when staff photo is missing or fails to load. */
export const STAFF_DEFAULT_PHOTO = "/images/staff-default.svg";

/** Explicit pixel sizes (inline style) so dimensions never depend on Tailwind purge. */
const SIZE_STYLE = {
  /** Faculty list thumbs — round size +30% from base 48. */
  sm: { width: 62, height: 62 },
  md: { width: 112, height: 112 },
  /** Head portraits — closer to legacy registrar photo scale. */
  lg: { width: 260, height: 320 },
  /** Dean / head-officer portraits — 20% smaller than prior 320×400. */
  xl: { width: 256, height: 320 },
} as const;

function shouldSkipOptimization(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const hostname = new URL(src).hostname;
    return (
      hostname === "hau.ac.in" ||
      hostname === "www.hau.ac.in" ||
      hostname.endsWith(".blob.core.windows.net")
    );
  } catch {
    return false;
  }
}

/**
 * Staff photo with automatic fallback to a default silhouette when `src` is
 * empty or the remote image fails (404 / broken legacy paths).
 */
export function StaffPhoto({
  src,
  alt,
  size = "sm",
  rounded = "full",
  className = "",
}: {
  src?: string | null;
  alt: string;
  size?: keyof typeof SIZE_STYLE;
  rounded?: "full" | "lg";
  className?: string;
}) {
  const resolved = src?.trim() || STAFF_DEFAULT_PHOTO;
  const [failedForSrc, setFailedForSrc] = useState<string | null>(null);
  const currentSrc = failedForSrc === resolved ? STAFF_DEFAULT_PHOTO : resolved;

  const usingDefault = currentSrc === STAFF_DEFAULT_PHOTO;
  // Keep circular only for tiny list thumbs
  const shapeClass =
    rounded === "full" && size === "sm" ? "rounded-full" : "rounded-lg";
  const dim = SIZE_STYLE[size];

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-emerald-200 bg-slate-100 shadow-sm ${shapeClass} ${className}`}
      style={{ width: dim.width, height: dim.height }}
    >
      <Image
        src={currentSrc}
        alt={usingDefault ? alt || "Staff photo placeholder" : alt}
        fill
        className="object-cover object-[center_20%]"
        sizes={`${dim.width}px`}
        unoptimized={shouldSkipOptimization(currentSrc)}
        onError={() => {
          if (resolved !== STAFF_DEFAULT_PHOTO) {
            setFailedForSrc(resolved);
          }
        }}
      />
    </div>
  );
}
