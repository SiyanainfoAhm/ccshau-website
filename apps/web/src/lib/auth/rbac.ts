import type { UserRole } from "@/lib/database/types";
import { Tables } from "@/lib/database/names";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserRoleAssignment {
  role: UserRole;
  departmentId: string | null;
}

export async function getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.userRoles)
    .select("role, department_id")
    .eq("user_id", userId);

  return (data ?? []).map((row) => ({
    role: row.role as UserRole,
    departmentId: row.department_id,
  }));
}

export function hasRole(
  assignments: UserRoleAssignment[],
  allowed: UserRole[],
  departmentId?: string | null,
): boolean {
  if (assignments.some((a) => a.role === "super_admin" && allowed.includes("super_admin"))) {
    return true;
  }

  return assignments.some((a) => {
    if (!allowed.includes(a.role)) return false;
    if (a.role === "super_admin") return true;
    if (!departmentId) return true;
    return a.departmentId === departmentId || a.departmentId === null;
  });
}

export async function requireRole(
  userId: string,
  allowed: UserRole[],
  departmentId?: string | null,
): Promise<void> {
  const assignments = await getUserRoles(userId);
  if (assignments.length === 0) {
    throw new Error("No CMS roles assigned to this account.");
  }
  if (!hasRole(assignments, allowed, departmentId)) {
    throw new Error("You do not have permission for this action.");
  }
}

export function highestRole(assignments: UserRoleAssignment[]): UserRole | null {
  const order: UserRole[] = ["super_admin", "dept_admin", "editor", "viewer"];
  for (const role of order) {
    if (assignments.some((a) => a.role === role)) return role;
  }
  return null;
}
