import { z } from "zod";

export const RELATED_LINK_CATEGORIES = [
  "government",
  "education",
  "research",
  "agriculture",
  "other",
] as const;

export const relatedLinkFormSchema = z.object({
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  url: z.string().url("Valid URL is required"),
  category: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isExternal: z.coerce.boolean().optional().default(true),
  isActive: z.coerce.boolean().optional().default(true),
});
