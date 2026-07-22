import type { AdminSession } from "@/lib/auth/session";
import type { CollegeScopeRole, Page, UserRole } from "@/lib/database/types";

export interface CollegeAssignment {
  collegePageId: string;
  collegeName: string;
  collegeSlug: string;
  role: CollegeScopeRole;
}

const UNIVERSITY_CMS_ROLES: UserRole[] = [
  "super_admin",
  "university_admin",
  "dept_admin",
  "editor",
  "viewer",
  "reviewer",
];
const COLLEGE_EDIT_ROLES: CollegeScopeRole[] = ["college_admin", "college_editor"];
const COLLEGE_PUBLISH_ROLES: CollegeScopeRole[] = ["college_admin"];

export function isSuperAdminSession(session: AdminSession): boolean {
  return session.roles.some((r) => r.role === "super_admin");
}

export function isUniversityAdminSession(session: AdminSession): boolean {
  return session.roles.some((r) => r.role === "university_admin");
}

export function hasUniversityCmsRole(session: AdminSession): boolean {
  return session.roles.some((r) => UNIVERSITY_CMS_ROLES.includes(r.role));
}

export function isCollegeScopedUser(session: AdminSession): boolean {
  return Boolean(session.collegeAssignment);
}

export function isCollegeOnlyUser(session: AdminSession): boolean {
  return isCollegeScopedUser(session) && !isSuperAdminSession(session) && !hasUniversityCmsRole(session);
}

export function canAccessAdmin(session: AdminSession): boolean {
  return (
    isSuperAdminSession(session) ||
    hasUniversityCmsRole(session) ||
    isCollegeScopedUser(session) ||
    Boolean(session.departmentPageAssignment)
  );
}

/** PostgREST `.or()` filter — mirrors `assertPageAccess` for university CMS page lists. */
export function universityCmsPageListOrFilter(departmentId: string): string {
  return `department_id.eq.${departmentId},department_id.is.null,college_root_id.not.is.null`;
}

export function canEditPages(session: AdminSession): boolean {
  if (isSuperAdminSession(session) || isUniversityAdminSession(session)) return true;
  if (session.roles.some((r) => ["dept_admin", "editor"].includes(r.role))) return true;
  if (session.collegeAssignment && COLLEGE_EDIT_ROLES.includes(session.collegeAssignment.role)) {
    return true;
  }
  if (session.departmentPageAssignment) return true;
  return false;
}

/** Create/edit university-wide CMS content (news, tenders, circulars, downloads, etc.). */
export function canManageUniversityContent(session: AdminSession): boolean {
  return session.roles.some((r) =>
    ["super_admin", "university_admin", "dept_admin", "editor"].includes(r.role),
  );
}

export function canPublishPages(session: AdminSession): boolean {
  if (isSuperAdminSession(session) || isUniversityAdminSession(session)) return true;
  if (session.roles.some((r) => ["dept_admin", "reviewer"].includes(r.role))) return true;
  if (
    session.collegeAssignment &&
    COLLEGE_PUBLISH_ROLES.includes(session.collegeAssignment.role)
  ) {
    return true;
  }
  if (session.departmentPageAssignment) return true;
  return false;
}

export function canDeletePages(session: AdminSession): boolean {
  if (isSuperAdminSession(session) || isUniversityAdminSession(session)) return true;
  if (session.roles.some((r) => r.role === "dept_admin")) return true;
  if (session.collegeAssignment?.role === "college_admin") return true;
  return false;
}

export function canCreateCollegeRoot(session: AdminSession): boolean {
  return isSuperAdminSession(session);
}

export function sessionCanAccessCollegeRoot(session: AdminSession, collegeRootId: string | null): boolean {
  if (!collegeRootId) return isSuperAdminSession(session) || hasUniversityCmsRole(session);
  if (isSuperAdminSession(session) || isUniversityAdminSession(session)) return true;
  if (hasUniversityCmsRole(session) && !isCollegeOnlyUser(session)) return true;
  return session.collegeAssignment?.collegePageId === collegeRootId;
}
