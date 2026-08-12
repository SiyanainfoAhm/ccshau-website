/** Legacy imports often use the university name as banner title/alt — hide on hero. */
export function normalizeBannerLabel(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGenericHeroBannerLabel(value: string | null | undefined): boolean {
  const n = normalizeForMatch(String(value || ""));
  if (!n) return true;
  if (n.startsWith("logo ")) return true;
  return (
    n === "ccs hau" ||
    n === "ccs hau hisar" ||
    n === "ccshau" ||
    n === "ccshau hisar"
  );
}

export function heroBannerTitle(titleEn: string | null | undefined): string | null {
  const title = normalizeBannerLabel(titleEn);
  if (!title || isGenericHeroBannerLabel(title)) return null;
  return title;
}

export function heroBannerSubtitle(
  subtitleEn: string | null | undefined,
  titleEn: string | null | undefined,
): string | null {
  const subtitle = normalizeBannerLabel(subtitleEn);
  if (!subtitle || isGenericHeroBannerLabel(subtitle)) return null;
  const title = normalizeBannerLabel(titleEn);
  if (title && normalizeForMatch(subtitle) === normalizeForMatch(title)) return null;
  return subtitle;
}
