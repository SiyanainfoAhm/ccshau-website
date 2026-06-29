"use client";

import { Contrast, Moon, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";

export function AccessibilityToolbar() {
  const [dark, setDark] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(scale));
  }, [scale]);

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2 py-1 text-white backdrop-blur-md"
      role="toolbar"
      aria-label="Accessibility tools"
    >
      <button
        type="button"
        onClick={() => setScale((s) => Math.min(1.4, s + 0.1))}
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="Increase font size"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setScale((s) => Math.max(0.9, s - 0.1))}
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="Decrease font size"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setDark((d) => !d)}
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <button
        type="button"
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="High contrast"
        onClick={() => document.body.classList.toggle("high-contrast")}
      >
        <Contrast className="h-4 w-4" />
      </button>
    </div>
  );
}
