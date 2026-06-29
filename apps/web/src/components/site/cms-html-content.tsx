import { sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

export function CmsHtmlContent({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(html) }}
    />
  );
}
