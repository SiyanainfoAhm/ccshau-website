"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** Shown when staff photo is missing or fails to load. */
export const STAFF_DEFAULT_PHOTO = "/images/staff-default.svg";

const SIZE_CLASS = {
  sm: "h-12 w-12",
  md: "h-28 w-28",
  lg: "h-[200px] w-[160px]",
} as const;

const SIZE_PX = {
  sm: 48,
  md: 112,
  lg: 160,
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
  size?: keyof typeof SIZE_CLASS;
  rounded?: "full" | "lg";
  className?: string;
}) {
  const resolved = src?.trim() || STAFF_DEFAULT_PHOTO;
  const [currentSrc, setCurrentSrc] = useState(resolved);

  useEffect(() => {
    setCurrentSrc(src?.trim() || STAFF_DEFAULT_PHOTO);
  }, [src]);

  const usingDefault = currentSrc === STAFF_DEFAULT_PHOTO;
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-lg";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-slate-200 bg-slate-100 shadow-sm ${SIZE_CLASS[size]} ${roundedClass} ${className}`}
    >
      <Image
        src={currentSrc}
        alt={usingDefault ? alt || "Staff photo placeholder" : alt}
        fill
        className="object-cover object-top"
        sizes={`${SIZE_PX[size]}px`}
        unoptimized={shouldSkipOptimization(currentSrc)}
        onError={() => {
          if (currentSrc !== STAFF_DEFAULT_PHOTO) {
            setCurrentSrc(STAFF_DEFAULT_PHOTO);
          }
        }}
      />
    </div>
  );
}
