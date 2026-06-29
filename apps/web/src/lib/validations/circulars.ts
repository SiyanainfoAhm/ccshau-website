import { z } from "zod";

export const circularFormSchema = z.object({
  circularNumber: z.string().optional(),
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
  removeFile: z.coerce.boolean().optional().default(false),
});
