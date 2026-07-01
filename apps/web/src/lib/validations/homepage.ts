import { z } from "zod";

const sortOrder = z.coerce.number().int().min(0).default(0);
const isActive = z.coerce.boolean().optional().default(true);

export const homepageQuoteSchema = z.object({
  authorEn: z.string().min(1, "Author is required"),
  authorHi: z.string().optional(),
  quoteEn: z.string().min(1, "Quote is required"),
  quoteHi: z.string().optional(),
  sortOrder,
  isActive,
});

export const homepageDignitarySchema = z.object({
  nameEn: z.string().min(1, "Name is required"),
  nameHi: z.string().optional(),
  roleEn: z.string().min(1, "Role is required"),
  roleHi: z.string().optional(),
  imagePath: z.string().optional(),
  removeImage: z.coerce.boolean().optional().default(false),
  sortOrder,
  isActive,
});

export const homepageInitiativeSchema = z.object({
  titleEn: z.string().min(1, "Title is required"),
  titleHi: z.string().optional(),
  descriptionEn: z.string().min(1, "Description is required"),
  descriptionHi: z.string().optional(),
  imagePath: z.string().optional(),
  removeImage: z.coerce.boolean().optional().default(false),
  linkSlug: z.string().optional(),
  linkHref: z.string().optional(),
  sortOrder,
  isActive,
});

export const homepageCtaSchema = z.object({
  titleEn: z.string().min(1, "Title is required"),
  titleHi: z.string().optional(),
  subtitleEn: z.string().optional(),
  subtitleHi: z.string().optional(),
  buttonEn: z.string().min(1, "Button label is required"),
  buttonHi: z.string().optional(),
  linkHref: z.string().min(1, "Link is required"),
  isActive,
});
