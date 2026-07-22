"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import {
  isUniversityWideRole,
  requiresDepartmentForRole,
  USER_ADMIN_ROLES,
} from "@/lib/auth/cms-roles";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { CollegeScopeRole, Profile, UserRole, UserRoleRow } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  assignRoleSchema,
  assignCollegeSchema,
  assignDepartmentHodSchema,
  inviteUserSchema,
  updateUserSchema,
} from "@/lib/validations/users";
import {
  buildPaginatedResult,
  paginationRange,
  type PaginatedResult,
} from "@/lib/data/pagination";
import {
  emptyPaginatedResult,
  mergeAdminListOptions,
  type AdminListOptions,
} from "@/lib/data/admin-list";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RoleAssignmentView {
  id: string;
  role: UserRole;
  department_id: string | null;
  department_name: string | null;
}

export interface CollegeAssignmentView {
  college_page_id: string;
  college_name: string;
  college_slug: string;
  role: CollegeScopeRole;
}

export interface DepartmentHodAssignmentView {
  department_page_id: string;
  department_title: string;
  department_slug: string;
  college_title: string | null;
  role: "dept_hod";
}

export interface AdminUserListItem extends Profile {
  department_name: string | null;
  role_assignments: RoleAssignmentView[];
  college_assignment: CollegeAssignmentView | null;
  department_hod_assignment: DepartmentHodAssignmentView | null;
}

export type AdminUserDetail = AdminUserListItem;

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
  collegeAssignment: CollegeAssignmentView | null,
  departmentHodAssignment: DepartmentHodAssignmentView | null,
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
    college_assignment: collegeAssignment,
    department_hod_assignment: departmentHodAssignment,
  };
}

async function getCollegeAssignmentsMap() {
  const admin = createAdminClient();
  if (!admin) return new Map<string, CollegeAssignmentView>();

  const { data } = await admin
    .from(Tables.userColleges)
    .select("user_id, college_page_id, role, college:college_page_id (title_en, slug)");

  const map = new Map<string, CollegeAssignmentView>();
  for (const row of data ?? []) {
    const college = row.college as unknown as { title_en: string; slug: string } | null;
    if (!college) continue;
    map.set(row.user_id, {
      college_page_id: row.college_page_id,
      college_name: college.title_en,
      college_slug: college.slug,
      role: row.role as CollegeScopeRole,
    });
  }
  return map;
}

async function getDepartmentHodAssignmentsMap() {
  const admin = createAdminClient();
  if (!admin) return new Map<string, DepartmentHodAssignmentView>();

  const { data } = await admin
    .from(Tables.userDepartmentPages)
    .select(
      "user_id, department_page_id, role, page:department_page_id (title_en, slug, college_root_id)",
    );

  const map = new Map<string, DepartmentHodAssignmentView>();
  const collegeIds = [
    ...new Set(
      (data ?? [])
        .map((row) => {
          const page = row.page as unknown as { college_root_id: string | null } | null;
          return page?.college_root_id ?? null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const collegeTitles = new Map<string, string>();
  if (collegeIds.length) {
    const { data: colleges } = await admin
      .from(Tables.pages)
      .select("id, title_en")
      .in("id", collegeIds);
    for (const c of colleges ?? []) collegeTitles.set(c.id, c.title_en);
  }

  for (const row of data ?? []) {
    const page = row.page as unknown as {
      title_en: string;
      slug: string;
      college_root_id: string | null;
    } | null;
    if (!page) continue;
    map.set(row.user_id, {
      department_page_id: row.department_page_id,
      department_title: page.title_en,
      department_slug: page.slug,
      college_title: page.college_root_id
        ? (collegeTitles.get(page.college_root_id) ?? null)
        : null,
      role: "dept_hod",
    });
  }
  return map;
}

const USERS_LIST_SORTS = ["display_name", "email", "created_at", "is_active"] as const;

function escapeIlikeTerm(value: string): string {
  return value.replace(/[%_\\]/g, "");
}

export async function listUsersForAdmin(
  options: AdminListOptions = {},
): Promise<PaginatedResult<AdminUserListItem>> {
  const opts = mergeAdminListOptions(options, {
    sortBy: "display_name",
    sortOrder: "asc",
    allowedSorts: USERS_LIST_SORTS,
  });

  await requireSuperAdmin();
  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  const { from, to } = paginationRange(opts.page, opts.pageSize);
  const [deptMap, collegeMap, hodMap] = await Promise.all([
    getDepartmentNameMap(),
    getCollegeAssignmentsMap(),
    getDepartmentHodAssignmentsMap(),
  ]);

  let profileQuery = admin.from(Tables.profiles).select("*", { count: "exact" });

  if (opts.search) {
    const escaped = escapeIlikeTerm(opts.search);
    if (escaped) {
      const term = `%${escaped}%`;
      const matchingDeptIds = [...deptMap.entries()]
        .filter(([, name]) => name.toLowerCase().includes(escaped.toLowerCase()))
        .map(([id]) => id);

      let roleMatchedUserIds: string[] = [];
      if (matchingDeptIds.length > 0) {
        const { data: roleRows } = await admin
          .from(Tables.userRoles)
          .select("user_id")
          .in("department_id", matchingDeptIds);
        roleMatchedUserIds = [...new Set((roleRows ?? []).map((row) => row.user_id as string))];
      }

      const orClauses = [`display_name.ilike.${term}`, `email.ilike.${term}`];
      if (matchingDeptIds.length > 0) {
        orClauses.push(`department_id.in.(${matchingDeptIds.join(",")})`);
      }
      if (roleMatchedUserIds.length > 0) {
        orClauses.push(`id.in.(${roleMatchedUserIds.join(",")})`);
      }
      profileQuery = profileQuery.or(orClauses.join(","));
    }
  }

  const profilesRes = await profileQuery
    .order(opts.sortBy, { ascending: opts.sortOrder === "asc" })
    .range(from, to);

  const profiles = (profilesRes.data ?? []) as Profile[];
  if (!profiles.length) {
    return buildPaginatedResult([], profilesRes.count ?? 0, opts.page, opts.pageSize);
  }

  const profileIds = profiles.map((p) => p.id);
  const { data: rolesData } = await admin
    .from(Tables.userRoles)
    .select("*")
    .in("user_id", profileIds);

  const rolesByUser = new Map<string, UserRoleRow[]>();
  for (const row of (rolesData ?? []) as UserRoleRow[]) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row);
    rolesByUser.set(row.user_id, list);
  }

  const items = profiles.map((profile) =>
    mapUserWithRoles(
      profile,
      rolesByUser.get(profile.id) ?? [],
      deptMap,
      collegeMap.get(profile.id) ?? null,
      hodMap.get(profile.id) ?? null,
    ),
  );

  return buildPaginatedResult(items, profilesRes.count ?? 0, opts.page, opts.pageSize);
}

export async function listAllUsersForAdmin(): Promise<AdminUserListItem[]> {
  const result = await listUsersForAdmin({ page: 1, pageSize: 5000 });
  return result.items;
}

export async function getUserById(id: string): Promise<AdminUserDetail | null> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  if (!admin) return null;

  const [profileRes, rolesRes, deptMap, collegeMap, hodMap] = await Promise.all([
    admin.from(Tables.profiles).select("*").eq("id", id).maybeSingle(),
    admin.from(Tables.userRoles).select("*").eq("user_id", id),
    getDepartmentNameMap(),
    getCollegeAssignmentsMap(),
    getDepartmentHodAssignmentsMap(),
  ]);

  if (!profileRes.data) return null;

  return mapUserWithRoles(
    profileRes.data as Profile,
    (rolesRes.data ?? []) as UserRoleRow[],
    deptMap,
    collegeMap.get(id) ?? null,
    hodMap.get(id) ?? null,
  );
}

function parseInviteForm(formData: FormData) {
  return inviteUserSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    departmentId: formData.get("departmentId") || undefined,
    initialRole: formData.get("initialRole") || undefined,
    collegePageId: formData.get("collegePageId") || undefined,
    collegeRole: formData.get("collegeRole") || undefined,
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
      const roleDepartmentId = isUniversityWideRole(input.initialRole)
        ? null
        : departmentId;
      if (requiresDepartmentForRole(input.initialRole) && !roleDepartmentId) {
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

    if (input.collegePageId && input.collegeRole) {
      const { error: collegeError } = await admin.from(Tables.userColleges).insert({
        user_id: userId,
        college_page_id: input.collegePageId,
        role: input.collegeRole,
      });

      if (collegeError) {
        return fail(collegeError.message);
      }
    }

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "user",
      entityId: userId,
      details: {
        email: input.email,
        initialRole: input.initialRole ?? null,
        collegePageId: input.collegePageId ?? null,
        collegeRole: input.collegeRole ?? null,
      },
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
    const departmentId = isUniversityWideRole(input.role) ? null : input.departmentId || null;

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

function parseAssignCollegeForm(formData: FormData) {
  return assignCollegeSchema.safeParse({
    collegePageId: formData.get("collegePageId"),
    collegeRole: formData.get("collegeRole"),
  });
}

export async function assignCollegeAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const parsed = parseAssignCollegeForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin.from(Tables.userColleges).upsert(
      {
        user_id: userId,
        college_page_id: parsed.data.collegePageId,
        role: parsed.data.collegeRole,
      },
      { onConflict: "user_id" },
    );

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "user_college",
      entityId: userId,
      details: {
        collegePageId: parsed.data.collegePageId,
        collegeRole: parsed.data.collegeRole,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to assign college.");
  }
}

export async function revokeCollegeAction(userId: string): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin.from(Tables.userColleges).delete().eq("user_id", userId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "user_college",
      entityId: userId,
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to revoke college assignment.");
  }
}

function parseAssignDepartmentHodForm(formData: FormData) {
  return assignDepartmentHodSchema.safeParse({
    departmentPageId: formData.get("departmentPageId"),
  });
}

async function requireHodAssignSession() {
  const session = await requireAdminSession();
  const { sessionCanManageDepartmentHodAssignments } = await import(
    "@/lib/auth/department-hod-scope"
  );
  if (!sessionCanManageDepartmentHodAssignments(session)) {
    throw new Error("Insufficient permissions.");
  }
  return session;
}

export async function assignDepartmentHodAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireHodAssignSession();
    const parsed = parseAssignDepartmentHodForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: page } = await admin
      .from(Tables.pages)
      .select("id, layout_template, college_root_id")
      .eq("id", parsed.data.departmentPageId)
      .maybeSingle();

    if (!page || page.layout_template !== "office_portal" || !page.college_root_id) {
      return fail("Select a valid college department page.");
    }
    if (page.college_root_id === page.id) {
      return fail("Select a department page, not the college home.");
    }
    if (
      session.collegeAssignment &&
      session.collegeAssignment.collegePageId !== page.college_root_id
    ) {
      return fail("That department is outside your college assignment.");
    }

    const { error } = await admin.from(Tables.userDepartmentPages).upsert(
      {
        user_id: userId,
        department_page_id: parsed.data.departmentPageId,
        role: "dept_hod",
      },
      { onConflict: "user_id" },
    );

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "user_department_page",
      entityId: userId,
      details: { departmentPageId: parsed.data.departmentPageId },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to assign Department HOD.");
  }
}

export async function revokeDepartmentHodAction(userId: string): Promise<ActionResult> {
  try {
    const session = await requireHodAssignSession();
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    if (session.collegeAssignment) {
      const { data: existing } = await admin
        .from(Tables.userDepartmentPages)
        .select("department_page_id, page:department_page_id (college_root_id)")
        .eq("user_id", userId)
        .maybeSingle();
      const page = existing?.page as unknown as { college_root_id: string | null } | null;
      if (
        page?.college_root_id &&
        page.college_root_id !== session.collegeAssignment.collegePageId
      ) {
        return fail("You cannot revoke a HOD outside your college.");
      }
    }

    const { error } = await admin.from(Tables.userDepartmentPages).delete().eq("user_id", userId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "user_department_page",
      entityId: userId,
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to revoke Department HOD assignment.");
  }
}
