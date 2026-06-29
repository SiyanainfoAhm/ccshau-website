import { redirect } from "next/navigation";

import { getUserRoles, highestRole, type UserRoleAssignment } from "@/lib/auth/rbac";
import { Tables } from "@/lib/database/names";
import type { UserRole } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface AdminSession {
  userId: string;
  email: string;
  displayName: string;
  roles: UserRoleAssignment[];
  primaryRole: UserRole | null;
  departmentId: string | null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const roles = await getUserRoles(user.id);
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

  return {
    userId: user.id,
    email: user.email,
    displayName,
    roles,
    primaryRole: highestRole(roles),
    departmentId,
  };
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireAdminWithRoles(allowed: UserRole[]): Promise<AdminSession> {
  const session = await requireAdminSession();
  const allowedSet = new Set(allowed);
  const isAllowed =
    session.roles.some((r) => r.role === "super_admin" && allowedSet.has("super_admin")) ||
    session.roles.some((r) => allowedSet.has(r.role));

  if (!isAllowed) {
    throw new Error("Insufficient permissions.");
  }

  return session;
}
