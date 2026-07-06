import { z } from "zod";

const collegeScopeRoleEnum = z.enum(["college_admin", "college_editor", "college_viewer"]);

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

export const collegeWizardSchema = z.object({
  titleEn: z.string().min(2, "English title is required"),
  titleHi: z.string().optional(),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  shortPrefix: z
    .string()
    .min(2, "Short prefix is required for section slugs")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  excerptEn: z.string().optional(),
  excerptHi: z.string().optional(),
  contentEn: z.string().optional(),
  contentHi: z.string().optional(),
  featuredImagePath: z.string().optional(),
  logoImagePath: z.string().optional(),
  headNameEn: z.string().optional(),
  headNameHi: z.string().optional(),
  headRoleEn: z.string().optional(),
  headRoleHi: z.string().optional(),
  headImagePath: z.string().optional(),
  addressEn: z.string().min(5, "Mailing address is required"),
  addressHi: z.string().optional(),
  phone: z.string().min(6, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  mapLat: optionalCoordinate(-90, 90, "Latitude"),
  mapLng: optionalCoordinate(-180, 180, "Longitude"),
  status: z.enum(["draft", "published"]).default("draft"),
  seedDefaultSections: z
    .union([z.literal("on"), z.literal("off"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === true)
    .default(true),
  departmentNames: z.string().optional(),
  assignUserId: z.string().uuid().optional().or(z.literal("")),
  collegeRole: collegeScopeRoleEnum.optional().or(z.literal("")),
});

export type CollegeWizardInput = z.infer<typeof collegeWizardSchema>;
