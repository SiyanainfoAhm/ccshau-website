import { z } from "zod";

export const bannerFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  targetUrl: z.string().url().optional().or(z.literal("")),
  altText: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  priority: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().optional().default(true),
  removeImage: z.coerce.boolean().optional().default(false),
});
