import { z } from "zod";

export const pgSeminarRegistrationUpdateSchema = z.object({
  status: z.enum(["submitted", "under_review", "approved", "rejected"]),
  adminRemarks: z.string().optional(),
});
