import { z } from "zod";

function optionalCoordinate(min: number, max: number, label: string) {
  return z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === "") return undefined;
      const parsed = typeof value === "number" ? value : Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    })
    .refine((value) => value === undefined || (value >= min && value <= max), {
      message: `${label} must be between ${min} and ${max}`,
    });
}

export const pageFormSchema = z
  .object({
  titleEn: z.string().min(1, "English title is required"),
  titleHi: z.string().optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  contentEn: z.string().optional(),
  contentHi: z.string().optional(),
  excerptEn: z.string().optional(),
  excerptHi: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  parentId: z.string().uuid().optional().or(z.literal("")),
  pageType: z.enum(["standard", "college"]).default("standard"),
  layoutTemplate: z.enum(["college_home", "office_portal", "standard"]).default("college_home"),
  featuredImagePath: z.string().optional(),
  logoImagePath: z.string().optional(),
  headNameEn: z.string().optional(),
  headNameHi: z.string().optional(),
  headRoleEn: z.string().optional(),
  headRoleHi: z.string().optional(),
  headImagePath: z.string().optional(),
  addressEn: z.string().optional(),
  addressHi: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  mapLat: optionalCoordinate(-90, 90, "Latitude"),
  mapLng: optionalCoordinate(-180, 180, "Longitude"),
  contactLocationEnabled: z
    .union([z.literal("on"), z.literal("off"), z.boolean()])
    .optional()
    .transform((value) => value === "on" || value === true)
    .default(false),
  officeCtaEnabled: z.coerce.boolean().optional().default(true),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
})
  .superRefine((data, ctx) => {
    if (data.pageType !== "college" || !data.contactLocationEnabled) return;

    if (!data.addressEn?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mailing address is required",
        path: ["addressEn"],
      });
    }
    if (!data.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is required",
        path: ["phone"],
      });
    }
    if (!data.email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required",
        path: ["email"],
      });
    }
  });

export type PageFormInput = z.infer<typeof pageFormSchema>;
