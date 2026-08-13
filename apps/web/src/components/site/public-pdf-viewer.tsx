"use client";

import { Expand, ExternalLink, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { useEscapeKey } from "@/lib/a11y/use-escape-key";
import { useLanguage } from "@/components/design/shared/language-context";

export function PublicPdfViewer({
  src,
  title,
  caption,
}: {
  src: string;
  title?: string | null;
  caption?: string | null;
}) {
  const { t } = useLanguage();
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);

  const close = useCallback(() => setExpanded(false), []);
  useEscapeKey(expanded, close);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  return (
    <>
      <div className="overflow-hidden bg-slate-100">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t("Open in new tab", "नई टैब में खोलें")}
          </a>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            <Expand className="h-3.5 w-3.5" aria-hidden />
            {t("Full size", "पूर्ण आकार")}
          </button>
        </div>
        <iframe
          src={src}
          className="block h-[min(80vh,900px)] w-full border-0 bg-slate-200"
          title={title ?? t("PDF document", "पीडीएफ दस्तावेज़")}
        />
      </div>
      {caption ? (
        <p className="border-t border-slate-100 bg-white px-5 py-3 text-center text-sm text-slate-600 sm:px-6">
          {caption}
        </p>
      ) : null}

      {expanded ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/80 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4">
              <p
                id={titleId}
                className="truncate font-display text-sm font-bold text-emerald-900 sm:text-base"
              >
                {title ?? t("PDF document", "पीडीएफ दस्तावेज़")}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {t("Open in new tab", "नई टैब में खोलें")}
                </a>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                  {t("Exit full size", "बंद करें")}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                  aria-label={t("Close", "बंद करें")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              src={src}
              className="min-h-0 w-full flex-1 border-0 bg-slate-200"
              title={title ?? t("PDF document", "पीडीएफ दस्तावेज़")}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
