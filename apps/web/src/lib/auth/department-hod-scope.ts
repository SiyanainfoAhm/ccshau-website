import type { AdminSession } from "@/lib/auth/session";
import type { DepartmentPageRole } from "@/lib/database/types";
import {
  hasUniversityCmsRole,
  isCollegeScopedUser,
  isSuperAdminSession,
} from "@/lib/auth/college-scope";

export interface DepartmentPageAssignment {
  departmentPageId: string;
  departmentTitle: string;
  departmentSlug: string;
  collegePageId: string | null;
  collegeTitle: string | null;
  collegeSlug: string | null;
  role: DepartmentPageRole;
}

/** User has a Department HOD page assignment (may also have other roles). */
export function hasDepartmentPageAssignment(session: AdminSession): boolean {
  return Boolean(session.departmentPageAssignment);
}

/**
 * HOD-only CMS user: department page assignment, no university CMS role,
 * no college microsite assignment.
 */
export function isDepartmentHodOnlyUser(session: AdminSession): boolean {
  return (
    hasDepartmentPageAssignment(session) &&
    !isSuperAdminSession(session) &&
    !hasUniversityCmsRole(session) &&
    !isCollegeScopedUser(session)
  );
}

export function canEditAssignedDepartmentPage(
  session: AdminSession,
  pageId: string,
): boolean {
  return session.departmentPageAssignment?.departmentPageId === pageId;
}

export function sessionCanManageDepartmentHodAssignments(session: AdminSession): boolean {
  if (isSuperAdminSession(session)) return true;
  return session.collegeAssignment?.role === "college_admin";
}
