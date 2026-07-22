import { redirect } from "next/navigation";

import {
  canAccessAdmin,
  isCollegeOnlyUser,
  type CollegeAssignment,
} from "@/lib/auth/college-scope";
import { getCollegeAssignmentForUser } from "@/lib/auth/college-scope-server";
import type { DepartmentPageAssignment } from "@/lib/auth/department-hod-scope";
import { getDepartmentPageAssignmentForUser } from "@/lib/auth/department-hod-scope-server";
import { getAdminNavAccess, canAccessAdminPath } from "@/lib/auth/admin-nav-access";
import { getAllowedCmsModulesForSession } from "@/lib/auth/cms-module-access-server";
import { getUserRoles, highestRole, type UserRoleAssignment } from "@/lib/auth/rbac";
import { Tables } from "@/lib/database/names";
import type { UserRole } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type { CollegeAssignment, DepartmentPageAssignment };

export interface AdminSession {
  userId: string;
  email: string;
  displayName: string;
  roles: UserRoleAssignment[];
  primaryRole: UserRole | null;
  departmentId: string | null;
  collegeAssignment: CollegeAssignment | null;
  departmentPageAssignment: DepartmentPageAssignment | null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const roles = await getUserRoles(user.id);
  const [collegeAssignment, departmentPageAssignment] = await Promise.all([
    getCollegeAssignmentForUser(user.id),
    getDepartmentPageAssignmentForUser(user.id),
  ]);
  const admin = createAdminClient();

  let displayName = user.email;
  let departmentId: string | null = null;

  if (admin) {
    const { data: profile } = await admin
      .from(Tables.profiles)
      .select("display_name, department_id, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      if (profile.is_active === false) return null;
      displayName = profile.display_name;
      departmentId = profile.department_id;
    }
  }

  const session: AdminSession = {
    userId: user.id,
    email: user.email,
    displayName,
    roles,
    primaryRole: highestRole(roles),
    departmentId,
    collegeAssignment,
    departmentPageAssignment,
  };

  if (!canAccessAdmin(session)) return null;

  return session;
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/** Server-side admin route guard — redirects to dashboard when the path is not allowed. */
export async function requireAdminPathOrRedirect(pathname: string): Promise<AdminSession> {
  const session = await requireAdminSession();
  const allowedCmsModules = await getAllowedCmsModulesForSession(session);
  const access = getAdminNavAccess(session, allowedCmsModules);
  if (!canAccessAdminPath(access, pathname)) {
    redirect("/admin");
  }
  return session;
}

function sessionHasAllowedRole(session: AdminSession, allowed: UserRole[]): boolean {
  const allowedSet = new Set(allowed);
  return (
    session.roles.some((r) => r.role === "super_admin" && allowedSet.has("super_admin")) ||
    session.roles.some((r) => allowedSet.has(r.role))
  );
}

export async function requireAdminWithRoles(allowed: UserRole[]): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (!sessionHasAllowedRole(session, allowed)) {
    throw new Error("Insufficient permissions.");
  }
  return session;
}

/** For admin pages — redirects to dashboard instead of throwing a runtime error. */
export async function requireAdminWithRolesOrRedirect(
  allowed: UserRole[],
): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (!sessionHasAllowedRole(session, allowed)) {
    redirect("/admin");
  }
  return session;
}

/** Page CMS: university roles or college staff with edit rights. */
export async function requirePageEditSession(): Promise<AdminSession> {
  const session = await requireAdminSession();
  const { canEditPages } = await import("@/lib/auth/college-scope");
  if (!canEditPages(session)) {
    throw new Error("You do not have permission to edit pages.");
  }
  const { isDepartmentHodOnlyUser } = await import("@/lib/auth/department-hod-scope");
  if (isDepartmentHodOnlyUser(session)) {
    return session;
  }
  if (!isCollegeOnlyUser(session)) {
    const { assertCmsModuleAccess } = await import("@/lib/auth/cms-module-access-server");
    await assertCmsModuleAccess(session, "pages");
  }
  return session;
}
