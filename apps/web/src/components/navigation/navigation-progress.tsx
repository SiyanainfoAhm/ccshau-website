"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 280;

function isInternalNavigation(anchor: HTMLAnchorElement, pathname: string, search: string) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;

  const next = `${url.pathname}${url.search}`;
  const current = `${pathname}${search ? `?${search}` : ""}`;
  return next !== current;
}

function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shownAt = useRef(0);
  const visibleRef = useRef(false);

  const setProgressVisible = (next: boolean) => {
    visibleRef.current = next;
    setVisible(next);
  };

  useEffect(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);

    if (!visibleRef.current) return;

    const elapsed = Date.now() - shownAt.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    hideTimer.current = setTimeout(() => setProgressVisible(false), remaining);
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element).closest("a");
      if (!anchor || !isInternalNavigation(anchor, pathname, search)) return;

      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
      showTimer.current = setTimeout(() => {
        shownAt.current = Date.now();
        setProgressVisible(true);
      }, SHOW_DELAY_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, [pathname, search]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-1 overflow-hidden bg-emerald-900/10"
    >
      <div className="navigation-progress-bar h-full w-2/5 rounded-full bg-gradient-to-r from-[#0b3d2e] via-[#22a06b] to-amber-400 shadow-[0_0_10px_rgba(34,160,107,0.45)]" />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  );
}
