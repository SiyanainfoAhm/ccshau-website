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
