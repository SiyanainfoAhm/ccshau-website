import { z } from "zod";

export const FEEDBACK_CATEGORIES = [
  "general",
  "admission",
  "examination",
  "recruitment",
  "technical",
  "complaint",
  "suggestion",
] as const;

export const feedbackUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "closed"]),
  category: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  adminRemarks: z.string().optional(),
});
