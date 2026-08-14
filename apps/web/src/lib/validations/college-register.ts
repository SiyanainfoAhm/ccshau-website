import { z } from "zod";

export const registerDepartmentSchema = z.object({
  collegePageId: z.string().uuid("Select a college"),
  titleEn: z.string().min(2, "Department name is required"),
  titleHi: z.string().optional(),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  excerptEn: z.string().optional(),
  contentEn: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  showInDepartmentsMenu: z.boolean().default(true),
});

export const registerFacultySchema = z.object({
  departmentPageId: z.string().uuid("Select a department"),
  memberType: z.enum(["hod", "faculty"]),
  nameEn: z.string().min(2, "Name is required"),
  nameHi: z.string().optional(),
  designationEn: z.string().min(2, "Designation is required"),
  designationHi: z.string().optional(),
  specializationEn: z.string().optional(),
  specializationHi: z.string().optional(),
  imagePath: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  experienceEn: z.string().optional(),
  experienceHi: z.string().optional(),
  qualificationEn: z.string().optional(),
  qualificationHi: z.string().optional(),
  detailContentEn: z.string().optional(),
  detailContentHi: z.string().optional(),
  staffSlug: z
    .string()
    .min(2, "Profile URL slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export const updateDepartmentSchema = registerDepartmentSchema.omit({ collegePageId: true });

export const updateFacultySchema = registerFacultySchema;
