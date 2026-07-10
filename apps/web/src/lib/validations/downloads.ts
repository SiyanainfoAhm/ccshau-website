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
  tags: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
  isPublic: z.enum(["true", "false"]).optional(),
  expiresAt: z.string().optional(),
  removeFile: z.coerce.boolean().optional().default(false),
});

export function parseDownloadTags(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function formatDownloadCategory(category: string | null | undefined): string {
  if (!category) return "—";
  return category.charAt(0).toUpperCase() + category.slice(1);
}
