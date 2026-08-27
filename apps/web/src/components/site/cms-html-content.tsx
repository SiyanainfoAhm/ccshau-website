"use client";

import { useSyncExternalStore } from "react";

import { normalizeCmsHtml, sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

const emptySubscribe = () => () => {};

/**
 * Renders CMS HTML after mount so browser DOM rewrites (and extensions such as
 * Google Translate wrapping text nodes) cannot crash React during hydration.
 */
export function CmsHtmlContent({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const ready = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const safeHtml = sanitizeCmsHtml(normalizeCmsHtml(html));

  return (
    <div
      className={["cms-html", "notranslate", className].filter(Boolean).join(" ")}
      translate="no"
      suppressHydrationWarning
      {...(ready ? { dangerouslySetInnerHTML: { __html: safeHtml } } : {})}
    />
  );
}
