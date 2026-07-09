"use client";

import { useEffect, useRef, type RefObject } from "react";

import { getFocusableElements, trapFocus } from "@/lib/a11y/focus-trap";

type UseModalA11yOptions = {
  open: boolean;
  onClose: () => void;
  /** Panel element that receives focus trap. */
  panelRef: RefObject<HTMLElement | null>;
  /** When true, locks body scroll and restores focus on close. */
  lockScroll?: boolean;
};

export function useModalA11y({
  open,
  onClose,
  panelRef,
  lockScroll = true,
}: UseModalA11yOptions): void {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (lockScroll) document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    if (panel) {
      requestAnimationFrame(() => {
        const focusable = getFocusableElements(panel);
        (focusable[0] ?? panel).focus();
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      const container = panelRef.current;
      if (container) trapFocus(event, container);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (lockScroll) document.body.style.overflow = "";
      returnFocusRef.current?.focus();
    };
  }, [open, onClose, lockScroll, panelRef]);
}
