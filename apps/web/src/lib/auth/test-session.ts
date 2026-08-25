import type { AdminSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/database/types";

/** Minimal session factory for unit tests (no DB / React). */
export function mockAdminSession(
  overrides: Partial<AdminSession> & {
    role?: UserRole;
    roles?: AdminSession["roles"];
  } = {},
): AdminSession {
  const { role = "editor", roles, ...rest } = overrides;
  return {
    userId: "user-1",
    email: "editor@ccshau.test",
    displayName: "Test User",
    roles: roles ?? [{ role, departmentId: null }],
    primaryRole: role,
    departmentId: null,
    collegeAssignment: null,
    departmentPageAssignment: null,
    facultyPerson: null,
    ...rest,
  };
}
