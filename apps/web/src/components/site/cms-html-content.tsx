"use client";

import { useEffect, useState } from "react";

import { normalizeCmsHtml, sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

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
  const [ready, setReady] = useState(false);
  const safeHtml = sanitizeCmsHtml(normalizeCmsHtml(html));

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div
      className={["cms-html", "notranslate", className].filter(Boolean).join(" ")}
      translate="no"
      suppressHydrationWarning
      {...(ready ? { dangerouslySetInnerHTML: { __html: safeHtml } } : {})}
    />
  );
}
