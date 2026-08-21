/** True when CMS HTML has visible text or meaningful media/structure. */
export function hasCmsHtmlContent(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 0) return true;
  return /<(img|iframe|video|audio|embed|object|table|svg|picture|figure)\b/i.test(html);
}
