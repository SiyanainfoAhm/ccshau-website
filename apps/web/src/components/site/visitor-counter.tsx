"use client";

import { useEffect, useRef, useState } from "react";

export function VisitorCounter() {
  const [total, setTotal] = useState<number | null>(null);
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);

  useEffect(() => {
    let active = true;
    fetch("/api/visits", { method: "POST", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { total?: number | null } | null) => {
        if (active && typeof data?.total === "number") setTotal(data.total);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (total === null) return;
    const start = displayedRef.current;
    const distance = total - start;
    if (distance === 0) return;
    const startedAt = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(start + distance * eased);
      displayedRef.current = next;
      setDisplayed(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [total]);

  return (
    <section aria-label="Visitor" className="px-4 pb-6 sm:px-8">
      <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-amber-300/45 bg-emerald-900/70 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.16)] ring-1 ring-white/10 backdrop-blur-sm transition hover:border-amber-300 hover:bg-emerald-800/80">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 sm:text-sm">Visitor</span>
        <span className="h-4 w-px bg-amber-300/50" aria-hidden />
        <span className="min-w-8 text-center text-lg font-black tabular-nums text-amber-300" aria-live="polite">
          {total === null ? "—" : displayed.toLocaleString("en-IN")}
        </span>
      </div>
    </section>
  );
}
