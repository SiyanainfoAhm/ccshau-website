import { z } from "zod";

const userRoleEnum = z.enum(["super_admin", "dept_admin", "editor", "viewer"]);

export const inviteUserSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  displayName: z.string().min(2, "Display name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  initialRole: userRoleEnum.optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(2, "Display name is required"),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional().default(true),
});

export const assignRoleSchema = z
  .object({
    role: userRoleEnum,
    departmentId: z.string().uuid().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "super_admin" && !data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Department is required for this role",
        path: ["departmentId"],
      });
    }
    if (data.role === "super_admin" && data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Super admin is not scoped to a department",
        path: ["departmentId"],
      });
    }
  });

export const ROLE_LABELS: Record<z.infer<typeof userRoleEnum>, string> = {
  super_admin: "Super Admin",
  dept_admin: "Department Admin",
  editor: "Content Editor",
  viewer: "Viewer",
};
