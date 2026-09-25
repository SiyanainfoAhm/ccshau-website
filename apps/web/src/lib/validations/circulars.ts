import { z } from "zod";

export const circularFormSchema = z.object({
  circularNumber: z.string().optional(),
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  removeFile: z.coerce.boolean().optional().default(false),
});
