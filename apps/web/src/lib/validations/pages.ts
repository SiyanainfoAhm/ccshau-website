import { z } from "zod";

export const pageFormSchema = z.object({
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  contentEn: z.string().optional(),
  contentHi: z.string().optional(),
  excerptEn: z.string().optional(),
  excerptHi: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  parentId: z.string().uuid().optional().or(z.literal("")),
  pageType: z.enum(["standard", "college"]).default("standard"),
  featuredImagePath: z.string().optional(),
  logoImagePath: z.string().optional(),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
});

export type PageFormInput = z.infer<typeof pageFormSchema>;
