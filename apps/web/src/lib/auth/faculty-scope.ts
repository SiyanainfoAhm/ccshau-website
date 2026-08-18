import type { AdminSession } from "@/lib/auth/session";
import {
  hasUniversityCmsRole,
  isCollegeScopedUser,
  isSuperAdminSession,
} from "@/lib/auth/college-scope";
import {
  hasDepartmentPageAssignment,
  isDepartmentHodOnlyUser,
} from "@/lib/auth/department-hod-scope";

export interface FacultyPersonSession {
  id: string;
  nameEn: string;
  email: string | null;
}

export function hasFacultyPerson(session: AdminSession): boolean {
  return Boolean(session.facultyPerson);
}

/**
 * Faculty-only CMS user: linked to a faculty person, no university CMS role,
 * no college microsite assignment, no Department HOD assignment.
 */
export function isFacultyOnlyUser(session: AdminSession): boolean {
  return (
    hasFacultyPerson(session) &&
    !isSuperAdminSession(session) &&
    !hasUniversityCmsRole(session) &&
    !isCollegeScopedUser(session) &&
    !hasDepartmentPageAssignment(session)
  );
}

/** HOD or faculty self-service: may update only their own ccshau_faculty_people row. */
export function isOwnFacultyProfileOnlyUser(session: AdminSession): boolean {
  return isFacultyOnlyUser(session) || isDepartmentHodOnlyUser(session);
}

export function canEditOwnFacultyPerson(session: AdminSession, personId: string): boolean {
  return session.facultyPerson?.id === personId;
}
