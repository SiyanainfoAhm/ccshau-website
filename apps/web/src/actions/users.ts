"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { Profile, UserRole, UserRoleRow } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  assignRoleSchema,
  inviteUserSchema,
  updateUserSchema,
} from "@/lib/validations/users";
import { createAdminClient } from "@/lib/supabase/admin";

const USER_ADMIN_ROLES = ["super_admin"] as const;

export interface RoleAssignmentView {
  id: string;
  role: UserRole;
  department_id: string | null;
  department_name: string | null;
}

export interface AdminUserListItem extends Profile {
  department_name: string | null;
  role_assignments: RoleAssignmentView[];
}

export interface AdminUserDetail extends AdminUserListItem {}

async function requireSuperAdmin() {
  return requireAdminWithRoles([...USER_ADMIN_ROLES]);
}

async function getDepartmentNameMap() {
  const admin = createAdminClient();
  if (!admin) return new Map<string, string>();

  const { data } = await admin.from(Tables.departments).select("id, name_en");
  return new Map((data ?? []).map((d) => [d.id, d.name_en as string]));
}

function mapUserWithRoles(
  profile: Profile,
  roles: UserRoleRow[],
  deptMap: Map<string, string>,
): AdminUserListItem {
  return {
    ...profile,
    department_name: profile.department_id ? (deptMap.get(profile.department_id) ?? null) : null,
    role_assignments: roles.map((r) => ({
      id: r.id,
      role: r.role,
      department_id: r.department_id,
      department_name: r.department_id ? (deptMap.get(r.department_id) ?? null) : null,
    })),
  };
}

export async function listUsersForAdmin(): Promise<AdminUserListItem[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  if (!admin) return [];

  const [profilesRes, rolesRes, deptMap] = await Promise.all([
    admin.from(Tables.profiles).select("*").order("display_name"),
    admin.from(Tables.userRoles).select("*"),
    getDepartmentNameMap(),
  ]);

  const rolesByUser = new Map<string, UserRoleRow[]>();
  for (const row of (rolesRes.data ?? []) as UserRoleRow[]) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row);
    rolesByUser.set(row.user_id, list);
  }

  return ((profilesRes.data ?? []) as Profile[]).map((profile) =>
    mapUserWithRoles(profile, rolesByUser.get(profile.id) ?? [], deptMap),
  );
}

export async function getUserById(id: string): Promise<AdminUserDetail | null> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  if (!admin) return null;

  const [profileRes, rolesRes, deptMap] = await Promise.all([
    admin.from(Tables.profiles).select("*").eq("id", id).maybeSingle(),
    admin.from(Tables.userRoles).select("*").eq("user_id", id),
    getDepartmentNameMap(),
  ]);

  if (!profileRes.data) return null;

  return mapUserWithRoles(
    profileRes.data as Profile,
    (rolesRes.data ?? []) as UserRoleRow[],
    deptMap,
  );
}

function parseInviteForm(formData: FormData) {
  return inviteUserSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    departmentId: formData.get("departmentId") || undefined,
    initialRole: formData.get("initialRole") || undefined,
  });
}

function parseUpdateForm(formData: FormData) {
  return updateUserSchema.safeParse({
    displayName: formData.get("displayName"),
    departmentId: formData.get("departmentId") || undefined,
    isActive: formData.get("isActive") !== "off",
  });
}

function parseAssignRoleForm(formData: FormData) {
  return assignRoleSchema.safeParse({
    role: formData.get("role"),
    departmentId: formData.get("departmentId") || undefined,
  });
}

export async function inviteUserAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSuperAdmin();
    const parsed = parseInviteForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const input = parsed.data;
    const departmentId = input.departmentId || null;

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName },
    });

    if (authError || !authData.user) {
      return fail(authError?.message ?? "Failed to create auth user.");
    }

    const userId = authData.user.id;

    const { error: profileError } = await admin.from(Tables.profiles).insert({
      id: userId,
      display_name: input.displayName,
      email: input.email,
      department_id: departmentId,
      is_active: true,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return fail(profileError.message);
    }

    if (input.initialRole) {
      const roleDepartmentId =
        input.initialRole === "super_admin" ? null : departmentId;
      if (input.initialRole !== "super_admin" && !roleDepartmentId) {
        return fail("Select a department before assigning a department-scoped role.");
      }

      const { error: roleError } = await admin.from(Tables.userRoles).insert({
        user_id: userId,
        role: input.initialRole,
        department_id: roleDepartmentId,
      });

      if (roleError) {
        return fail(roleError.message);
      }
    }

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "user",
      entityId: userId,
      details: { email: input.email, initialRole: input.initialRole ?? null },
    });

    revalidatePath("/admin/users");
    return ok({ id: userId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to invite user.");
  }
}

export async function updateUserAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    if (session.userId === id && formData.get("isActive") === "off") {
      return fail("You cannot deactivate your own account.");
    }

    const parsed = parseUpdateForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const input = parsed.data;
    const { error } = await admin
      .from(Tables.profiles)
      .update({
        display_name: input.displayName,
        department_id: input.departmentId || null,
        is_active: input.isActive ?? true,
      })
      .eq("id", id);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "user",
      entityId: id,
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update user.");
  }
}

export async function assignRoleAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSuperAdmin();
    const parsed = parseAssignRoleForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const input = parsed.data;
    const departmentId = input.role === "super_admin" ? null : input.departmentId || null;

    const { data, error } = await admin
      .from(Tables.userRoles)
      .insert({
        user_id: userId,
        role: input.role,
        department_id: departmentId,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "user_role",
      entityId: data.id,
      details: { userId, role: input.role, departmentId },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to assign role.");
  }
}

async function countSuperAdmins(excludeRoleId?: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;

  let query = admin
    .from(Tables.userRoles)
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin");

  if (excludeRoleId) {
    query = query.neq("id", excludeRoleId);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function revokeRoleAction(roleId: string, userId: string): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: roleRow } = await admin
      .from(Tables.userRoles)
      .select("role")
      .eq("id", roleId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!roleRow) return fail("Role assignment not found.");

    if (roleRow.role === "super_admin") {
      const remaining = await countSuperAdmins(roleId);
      if (remaining === 0) {
        return fail("Cannot remove the last super admin role.");
      }
      if (session.userId === userId) {
        return fail("You cannot revoke your own super admin role.");
      }
    }

    const { error } = await admin.from(Tables.userRoles).delete().eq("id", roleId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "user_role",
      entityId: roleId,
      details: { userId, role: roleRow.role },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to revoke role.");
  }
}
