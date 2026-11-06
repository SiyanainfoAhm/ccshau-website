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

/** Count titled links that point at PDF files. */
function countPdfAnchorHrefs(html: string): number {
  return html.match(/<a\b[^>]*\bhref=["'][^"']+\.pdf[^"']*["']/gi)?.length ?? 0;
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPdfEmbed(html: string): boolean {
  return /<(?:iframe|embed|object)\b[^>]*\b(?:src|data)=["'][^"']+\.pdf/i.test(html);
}

/**
 * True when the HTML is essentially one PDF embed or a single PDF link
 * (plus a short caption). Used to swap that markup for the full-width viewer.
 * A heading plus a file link, or several titled PDF links, stay as CMS content.
 */
export function isPrimarilyPdfHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  if (!extractPdfUrlFromHtml(html)) return false;
  if (countPdfAnchorHrefs(html) > 1) return false;

  // "Industrial Conclave" plus a named PDF is the page, not a viewer caption.
  if (!hasPdfEmbed(html) && countPdfAnchorHrefs(html) === 1) {
    const withoutAnchors = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " ");
    if (visibleText(withoutAnchors).length > 0) return false;
  }

  // Allow short captions like "Last Updated :- Fri Mar 22 2024"
  return visibleText(html).length < 280;
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
