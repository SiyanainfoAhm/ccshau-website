import { z } from "zod";

export const publicFeedbackSchema = z.object({
  submitterName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  category: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  captchaToken: z.string().optional(),
});
