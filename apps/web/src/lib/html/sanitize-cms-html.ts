/** Strip risky markup from admin-authored CMS HTML before rendering. */
export function sanitizeCmsHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

const HAS_HTML_TAG = /<[a-z][\s\S]*>/i;
const HAS_BLOCK_HTML = /<(p|div|ul|ol|li|h[1-6]|table|thead|tbody|tr|td|th|section|article|blockquote|pre|br)\b/i;

/** Convert plain / mixed CMS content into renderable HTML (preserve tags, honor line breaks). */
export function normalizeCmsHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  // Pure plain text → paragraph blocks with <br> for single newlines.
  if (!HAS_HTML_TAG.test(trimmed)) {
    return trimmed
      .split(/\r?\n\s*\r?\n/)
      .filter(Boolean)
      .map((block) => `<p>${block.trim().replace(/\r?\n/g, "<br />")}</p>`)
      .join("\n");
  }

  // Already structured block HTML (Froala / pasted rich content) — leave as-is.
  if (HAS_BLOCK_HTML.test(trimmed)) {
    return trimmed;
  }

  // Mixed inline HTML + newlines (e.g. plain lines with <a> links).
  // Without this, browsers collapse newlines and the page looks like one paragraph.
  return trimmed
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => {
      if (line.length > 0) return true;
      // Keep a single blank line between content blocks.
      return index > 0 && lines[index - 1]!.length > 0;
    })
    .map((line) => (line.length === 0 ? "<br />" : `<p>${line}</p>`))
    .join("\n");
}
