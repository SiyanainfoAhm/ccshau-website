import { z } from "zod";

import type { MenuLocation } from "@/lib/database/types";

export const MENU_LOCATIONS: MenuLocation[] = ["header", "footer", "quick_links"];

export function isValidMenuLocation(value: string): value is MenuLocation {
  return MENU_LOCATIONS.includes(value as MenuLocation);
}

export const menuItemFormSchema = z.object({
  labelEn: z.string().min(1, "English label is required"),
  labelHi: z.string().optional(),
  href: z.string().optional(),
  pageId: z.string().uuid().optional().or(z.literal("")),
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  openInNewTab: z.coerce.boolean().optional().default(false),
  isActive: z.coerce.boolean().optional().default(true),
});
