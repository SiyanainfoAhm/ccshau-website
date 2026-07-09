"use client";

import { Contrast, Moon, RotateCcw, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import {
  DEFAULT_A11Y_PREFERENCES,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  clampFontScale,
  getAccessibilitySnapshot,
  getServerAccessibilitySnapshot,
  resetAccessibilityPreferences,
  subscribeAccessibility,
  updateAccessibilityPreferences,
} from "@/lib/a11y/accessibility-storage";

type ToolbarVariant = "on-dark" | "on-light";

function toolbarShellClass(variant: ToolbarVariant): string {
  return variant === "on-light"
    ? "border-slate-200 bg-white/95 text-slate-800 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm"
    : "border-white/20 bg-black/30 text-white backdrop-blur-md";
}

function toolbarButtonClass(variant: ToolbarVariant, active = false): string {
  const base =
    "rounded-full p-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";
  if (variant === "on-light") {
    return `${base} focus-visible:outline-emerald-600 ${active ? "bg-emerald-100 text-emerald-900" : "hover:bg-emerald-50 hover:text-emerald-900"}`;
  }
  return `${base} focus-visible:outline-amber-300 ${active ? "bg-white/25" : "hover:bg-white/15"}`;
}

export function AccessibilityToolbar({ variant = "on-dark" }: { variant?: ToolbarVariant }) {
  const prefs = useSyncExternalStore(
    subscribeAccessibility,
    getAccessibilitySnapshot,
    getServerAccessibilitySnapshot,
  );

  const increaseFont = useCallback(() => {
    updateAccessibilityPreferences((current) => ({
      ...current,
      fontScale: clampFontScale(current.fontScale + FONT_SCALE_STEP),
    }));
  }, []);

  const decreaseFont = useCallback(() => {
    updateAccessibilityPreferences((current) => ({
      ...current,
      fontScale: clampFontScale(current.fontScale - FONT_SCALE_STEP),
    }));
  }, []);

  const toggleTheme = useCallback(() => {
    updateAccessibilityPreferences((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    updateAccessibilityPreferences((current) => ({
      ...current,
      highContrast: !current.highContrast,
    }));
  }, []);

  const handleReset = useCallback(() => {
    resetAccessibilityPreferences();
  }, []);

  const fontPercent = Math.round(prefs.fontScale * 100);
  const atMinScale = prefs.fontScale <= FONT_SCALE_MIN;
  const atMaxScale = prefs.fontScale >= FONT_SCALE_MAX;
  const isDefault =
    prefs.theme === DEFAULT_A11Y_PREFERENCES.theme &&
    prefs.fontScale === DEFAULT_A11Y_PREFERENCES.fontScale &&
    prefs.highContrast === DEFAULT_A11Y_PREFERENCES.highContrast;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-full border px-2 py-1 ${toolbarShellClass(variant)}`}
      role="toolbar"
      aria-label="Accessibility tools"
    >
      <button
        type="button"
        onClick={decreaseFont}
        disabled={atMinScale}
        className={toolbarButtonClass(variant)}
        aria-label="Decrease font size"
      >
        <ZoomOut className="h-4 w-4" aria-hidden />
      </button>
      <span
        className={`min-w-[2.75rem] text-center text-[10px] font-semibold tabular-nums ${variant === "on-light" ? "text-emerald-800" : "text-emerald-100"}`}
        aria-live="polite"
        aria-label={`Font size ${fontPercent} percent`}
      >
        {fontPercent}%
      </span>
      <button
        type="button"
        onClick={increaseFont}
        disabled={atMaxScale}
        className={toolbarButtonClass(variant)}
        aria-label="Increase font size"
      >
        <ZoomIn className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className={toolbarButtonClass(variant, prefs.theme === "dark")}
        aria-label={prefs.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={prefs.theme === "dark"}
      >
        {prefs.theme === "dark" ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={toggleHighContrast}
        className={toolbarButtonClass(variant, prefs.highContrast)}
        aria-label={prefs.highContrast ? "Disable high contrast" : "Enable high contrast"}
        aria-pressed={prefs.highContrast}
      >
        <Contrast className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={handleReset}
        disabled={isDefault}
        className={toolbarButtonClass(variant)}
        aria-label="Reset accessibility settings"
        title="Reset"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
