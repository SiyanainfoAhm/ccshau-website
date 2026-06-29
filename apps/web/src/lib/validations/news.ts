import { z } from "zod";

export const NEWS_CATEGORIES = [
  "general",
  "examination",
  "admission",
  "recruitment",
  "extension",
  "research",
  "events",
] as const;

export const newsFormSchema = z.object({
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  bodyEn: z.string().optional(),
  bodyHi: z.string().optional(),
  noticeType: z.enum(["news", "notice", "corrigendum", "cancellation"]),
  category: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
  expiresAt: z.string().optional(),
  isFeatured: z.coerce.boolean().optional().default(false),
  isPinned: z.coerce.boolean().optional().default(false),
  removedAttachments: z.string().optional(),
});

export type NewsFormInput = z.infer<typeof newsFormSchema>;
