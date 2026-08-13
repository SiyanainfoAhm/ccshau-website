/**
 * Extract a primary PDF URL from CMS / sidebar HTML (link, iframe, or embed).
 */
export function extractPdfUrlFromHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;

  const patterns = [
    /<(?:iframe|embed|object)\b[^>]*\b(?:src|data)=["']([^"']+\.pdf[^"']*)["']/i,
    /\b(?:src|data|href)=["']([^"']+\.pdf[^"']*)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

/**
 * True when the HTML is essentially a PDF embed/link (plus short captions).
 * Used to swap CMS HTML for the dedicated full-width PDF viewer.
 */
export function isPrimarilyPdfHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  if (!extractPdfUrlFromHtml(html)) return false;

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Allow short captions like "Last Updated :- Fri Mar 22 2024"
  return stripped.length < 280;
}

/** Optional caption text under a PDF embed (e.g. Last Updated). */
export function extractPdfCaptionFromHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped || stripped.length > 280) return null;
  return stripped;
}
