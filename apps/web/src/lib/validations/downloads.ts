import { z } from "zod";

export const DOWNLOAD_CATEGORIES = [
  "forms",
  "prospectus",
  "syllabus",
  "reports",
  "guidelines",
  "other",
] as const;

export const downloadFormSchema = z.object({
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  category: z.string().optional(),
  version: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
  removeFile: z.coerce.boolean().optional().default(false),
});
