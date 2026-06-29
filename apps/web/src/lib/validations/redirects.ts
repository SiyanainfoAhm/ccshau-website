import { z } from "zod";

export const redirectFormSchema = z.object({
  legacyPath: z
    .string()
    .min(1, "Legacy path is required")
    .refine((v) => v.startsWith("/"), "Path must start with /"),
  newPath: z
    .string()
    .min(1, "New path is required")
    .refine((v) => v.startsWith("/"), "Path must start with /"),
  redirectType: z.coerce.number().refine((v) => v === 301 || v === 302, "Must be 301 or 302"),
  isActive: z.coerce.boolean().optional().default(true),
  notes: z.string().optional(),
});
