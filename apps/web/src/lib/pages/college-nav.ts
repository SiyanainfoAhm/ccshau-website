import type { PageLayoutConfig } from "@/lib/pages/layout-config";

/**
 * Whether a college child page appears in the Departments dropdown.
 * Controlled by layout_config.showInDepartmentsMenu (default true via presets).
 * Crop/teaching sections are backfilled to false; admins can toggle in Page layout.
 */
export function isCollegeDepartmentMenuSubsection(item: {
  layoutConfig?: Pick<PageLayoutConfig, "showInDepartmentsMenu"> | null;
}): boolean {
  return item.layoutConfig?.showInDepartmentsMenu !== false;
}

/** Lower Display order first; same order → A–Z by English title. */
export function compareBySortOrderThenTitle(
  a: { sortOrder?: number | null; titleEn?: string | null },
  b: { sortOrder?: number | null; titleEn?: string | null },
): number {
  const orderA = a.sortOrder ?? 0;
  const orderB = b.sortOrder ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  return String(a.titleEn ?? "").localeCompare(String(b.titleEn ?? ""), "en-IN", {
    numeric: true,
    sensitivity: "base",
  });
}
