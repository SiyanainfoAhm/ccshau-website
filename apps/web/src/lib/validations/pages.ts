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
  layoutTemplate: z.enum(["college_home", "office_portal", "standard"]).default("college_home"),
  featuredImagePath: z.string().optional(),
  logoImagePath: z.string().optional(),
  headNameEn: z.string().optional(),
  headNameHi: z.string().optional(),
  headRoleEn: z.string().optional(),
  headRoleHi: z.string().optional(),
  headImagePath: z.string().optional(),
  officeCtaEnabled: z.coerce.boolean().optional().default(true),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
});

export type PageFormInput = z.infer<typeof pageFormSchema>;
