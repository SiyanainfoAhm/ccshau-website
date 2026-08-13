/**
 * Crop/teaching "Section" pages live under Departments for routing, but must not
 * appear in the Departments dropdown — navigate via parent department content.
 */
export function isCollegeDepartmentMenuSubsection(item: {
  slug?: string | null;
  titleEn?: string | null;
  title_en?: string | null;
}): boolean {
  const slug = String(item.slug || "").toLowerCase();
  const title = String(item.titleEn ?? item.title_en ?? "")
    .trim()
    .toLowerCase();
  if (/-section$/.test(slug)) return false;
  if (/\bsection$/.test(title)) return false;
  return true;
}
