"use client";

import { Users } from "lucide-react";
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
    <section aria-label="Website visitor count" className="px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-3 rounded-xl border-2 border-amber-300 bg-emerald-950 px-5 py-3 text-white shadow-md sm:gap-4">
        <Users className="h-6 w-6 shrink-0 text-amber-300" aria-hidden />
        <span className="text-sm font-bold uppercase tracking-wider sm:text-base">Website visits</span>
        <span className="h-6 w-px bg-emerald-700" aria-hidden />
        <span className="min-w-12 text-center text-2xl font-black tabular-nums text-amber-300 sm:text-3xl" aria-live="polite">
            {total === null ? "—" : displayed.toLocaleString("en-IN")}
        </span>
      </div>
    </section>
  );
}
