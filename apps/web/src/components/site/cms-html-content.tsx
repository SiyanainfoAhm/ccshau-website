import { normalizeCmsHtml, sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

export function CmsHtmlContent({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={["cms-html", className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(normalizeCmsHtml(html)) }}
    />
  );
}
