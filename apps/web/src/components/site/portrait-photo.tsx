import Image from "next/image";

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
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={RENDER_WIDTH}
      height={RENDER_HEIGHT}
      quality={92}
      unoptimized={shouldSkipOptimization(src)}
      className={`shrink-0 rounded-lg border border-slate-200 bg-white object-cover object-top shadow-sm ${className}`}
      style={{ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT }}
      sizes={`${DISPLAY_WIDTH}px`}
    />
  );
}
