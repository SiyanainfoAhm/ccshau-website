import { z } from "zod";

export const mediaAlbumFormSchema = z.object({
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  albumType: z.enum(["photo", "video", "press_release", "event"]),
  eventDate: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
  removeCover: z.coerce.boolean().optional().default(false),
});

export const mediaItemFormSchema = z.object({
  titleEn: z.string().optional(),
  titleHi: z.string().optional(),
  captionEn: z.string().optional(),
  captionHi: z.string().optional(),
  mediaType: z.enum(["image", "video"]),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
