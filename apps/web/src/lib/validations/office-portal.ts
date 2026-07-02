import { z } from "zod";

const sortOrder = z.coerce.number().int().min(0).default(0);
const isActive = z.coerce.boolean().optional().default(true);

export const pageContactLineSchema = z.object({
  labelEn: z.string().min(1, "Label is required"),
  labelHi: z.string().optional(),
  valueEn: z.string().min(1, "Value is required"),
  valueHi: z.string().optional(),
  sortOrder,
  isActive,
});

export const pageStaffSchema = z.object({
  nameEn: z.string().min(1, "Name is required"),
  nameHi: z.string().optional(),
  designationEn: z.string().min(1, "Designation is required"),
  designationHi: z.string().optional(),
  specializationEn: z.string().optional(),
  specializationHi: z.string().optional(),
  imagePath: z.string().optional(),
  detailHref: z.string().optional(),
  sortOrder,
  isActive,
});

export const pageSidebarItemSchema = z.object({
  side: z.enum(["left", "right"]),
  labelEn: z.string().min(1, "Label is required"),
  labelHi: z.string().optional(),
  href: z.string().optional(),
  linkedPageId: z.string().uuid().optional().or(z.literal("")),
  sortOrder,
  isActive,
});
