import type { UserRoleAssignment } from "@/lib/auth/rbac";
import type { AdminSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/database/types";

/** Roles with university-wide scope (no department filter on content). */
export const UNIVERSITY_WIDE_ROLES = ["super_admin", "university_admin"] as const satisfies readonly UserRole[];

/** Read access to CMS modules (lists and detail views). */
export const CMS_READ_ROLES = [
  "super_admin",
  "university_admin",
  "dept_admin",
  "editor",
  "viewer",
  "reviewer",
] as const satisfies readonly UserRole[];

/** Create and edit content. */
export const CONTENT_EDIT_ROLES = [
  "super_admin",
  "university_admin",
  "dept_admin",
  "editor",
] as const satisfies readonly UserRole[];

/** Publish or approve content (includes reviewer). */
export const PUBLISH_ROLES = [
  "super_admin",
  "university_admin",
  "dept_admin",
  "reviewer",
] as const satisfies readonly UserRole[];

export const USER_ADMIN_ROLES = ["super_admin"] as const satisfies readonly UserRole[];

/** Settings hub and URL redirects (not security settings). */
export const SETTINGS_ACCESS_ROLES = [
  "super_admin",
  "university_admin",
  "dept_admin",
] as const satisfies readonly UserRole[];

/** Homepage, banners, menus, and related links — university-wide site structure. */
export const SITE_STRUCTURE_ACCESS_ROLES = [
  "super_admin",
  "university_admin",
] as const satisfies readonly UserRole[];

export function sessionHasCmsRole(
  session: Pick<AdminSession, "roles">,
  allowed: readonly UserRole[],
): boolean {
  return session.roles.some((r) => allowed.includes(r.role));
}

export function canPublishContent(session: AdminSession): boolean {
  return sessionHasCmsRole(session, PUBLISH_ROLES);
}

export function canEditContent(session: AdminSession): boolean {
  return sessionHasCmsRole(session, CONTENT_EDIT_ROLES);
}

export function canManageSiteStructure(session: AdminSession): boolean {
  return sessionHasCmsRole(session, SITE_STRUCTURE_ACCESS_ROLES);
}

/** University-wide content access — bypasses department scoping on lists and records. */
export function isUniversityWideCmsSession(session: AdminSession): boolean {
  if (sessionHasCmsRole(session, UNIVERSITY_WIDE_ROLES)) return true;
  return session.roles.some((r) => r.role === "reviewer" && !r.departmentId);
}

export function isUniversityAdminSession(session: AdminSession): boolean {
  return session.roles.some((r) => r.role === "university_admin");
}

export function isReviewerSession(session: AdminSession): boolean {
  return session.roles.some((r) => r.role === "reviewer");
}

export function isReviewerOnlySession(session: AdminSession): boolean {
  return (
    isReviewerSession(session) &&
    !sessionHasCmsRole(session, ["super_admin", "university_admin", "dept_admin", "editor"])
  );
}

export function isViewerOnlySession(session: AdminSession): boolean {
  return (
    session.roles.some((r) => r.role === "viewer") &&
    !sessionHasCmsRole(session, [
      "super_admin",
      "university_admin",
      "dept_admin",
      "editor",
      "reviewer",
    ])
  );
}

export function requiresDepartmentForRole(role: UserRole): boolean {
  return role !== "super_admin" && role !== "university_admin" && role !== "reviewer";
}

export function isUniversityWideRole(role: UserRole): boolean {
  return role === "super_admin" || role === "university_admin";
}

/** Department-scoped publish/review check for a content row. */
export function canActOnDepartmentContent(
  session: AdminSession,
  departmentId: string | null | undefined,
): boolean {
  if (isUniversityWideCmsSession(session)) return true;
  if (!session.departmentId) return true;
  if (!departmentId) return true;
  return session.departmentId === departmentId;
}

/**
 * Force department_id from the session for scoped editors so form tampering
 * cannot create/update content under another department.
 */
export function resolveScopedDepartmentId(
  session: AdminSession,
  formDepartmentId: string | null | undefined,
): string | null {
  if (!isUniversityWideCmsSession(session) && session.departmentId) {
    return session.departmentId;
  }
  return formDepartmentId || null;
}

export function roleAssignmentCanActOnDepartment(
  assignments: UserRoleAssignment[],
  departmentId: string | null | undefined,
  allowed: readonly UserRole[],
): boolean {
  if (assignments.some((a) => UNIVERSITY_WIDE_ROLES.includes(a.role as (typeof UNIVERSITY_WIDE_ROLES)[number]))) {
    return allowed.includes("super_admin") || allowed.includes("university_admin");
  }

  return assignments.some((a) => {
    if (!allowed.includes(a.role)) return false;
    if (a.role === "reviewer" && !a.departmentId) return true;
    if (!departmentId) return true;
    return a.departmentId === departmentId || a.departmentId === null;
  });
}
