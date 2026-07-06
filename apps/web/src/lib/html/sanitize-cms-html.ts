/** Strip risky markup from admin-authored CMS HTML before rendering. */
export function sanitizeCmsHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

/** Convert plain text (no HTML tags) into simple paragraph markup. */
export function normalizeCmsHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;

  return trimmed
    .split(/\r?\n\s*\r?\n/)
    .filter(Boolean)
    .map((block) => `<p>${block.trim().replace(/\r?\n/g, "<br />")}</p>`)
    .join("\n");
}
