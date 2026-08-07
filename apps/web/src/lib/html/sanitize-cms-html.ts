/** Strip risky markup from admin-authored CMS HTML before rendering. */
import sanitizeHtml from "sanitize-html";

function stripLinkPaintStyles(style: string | undefined): string | undefined {
  if (!style) return undefined;
  const cleaned = style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const prop = part.split(":")[0]?.trim().toLowerCase();
      return prop !== "color" && prop !== "text-decoration" && prop !== "text-decoration-line";
    })
    .join("; ");
  return cleaned || undefined;
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "span",
    "div",
    "section",
    "article",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    "iframe",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "style", "title", "lang", "dir"],
    a: ["href", "name", "target", "rel", "class", "title", "style"],
    img: ["src", "alt", "title", "width", "height", "class", "loading"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "class",
      "style",
      "allow",
      "allowfullscreen",
      "loading",
      "referrerpolicy",
      "sandbox",
      "frameborder",
      "name",
    ],
    td: ["colspan", "rowspan", "class", "style"],
    th: ["colspan", "rowspan", "class", "style", "scope"],
    col: ["span", "width", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  // Match prior DOMPurify policy for CMS content.
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => {
      const next = { ...attribs };
      const cleanedStyle = stripLinkPaintStyles(next.style);
      if (cleanedStyle) next.style = cleanedStyle;
      else delete next.style;
      return { tagName, attribs: next };
    },
  },
};

export function sanitizeCmsHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

const HAS_HTML_TAG = /<[a-z][\s\S]*>/i;
const HAS_BLOCK_HTML =
  /<(p|div|ul|ol|li|h[1-6]|table|thead|tbody|tr|td|th|section|article|blockquote|pre|br|iframe)\b/i;

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
