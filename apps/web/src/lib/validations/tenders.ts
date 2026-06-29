import { z } from "zod";

export const TENDER_CATEGORIES = [
  "goods",
  "services",
  "works",
  "consultancy",
  "equipment",
  "recruitment",
  "other",
] as const;

export const tenderFormSchema = z.object({
  tenderNumber: z.string().optional(),
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  descriptionEn: z.string().optional(),
  descriptionHi: z.string().optional(),
  category: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "open", "closed", "archived"]),
  closingDate: z.string().optional(),
  removedDocuments: z.string().optional(),
});

export const corrigendumFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type TenderFormInput = z.infer<typeof tenderFormSchema>;
