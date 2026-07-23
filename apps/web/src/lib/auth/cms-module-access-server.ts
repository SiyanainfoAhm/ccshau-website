import { cache } from "react";
import { redirect } from "next/navigation";

import {
  CMS_READ_ROLES,
  CONTENT_EDIT_ROLES,
  isUniversityWideCmsSession,
} from "@/lib/auth/cms-roles";
import {
  resolveSessionDepartmentId,
  sessionCanAccessCmsModule,
} from "@/lib/auth/cms-module-access";
import { isSuperAdminSession } from "@/lib/auth/college-scope";
import type { AdminSession } from "@/lib/auth/session";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { CmsModule, UserRole } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

function isModuleRestrictionBypass(session: AdminSession): boolean {
  if (isSuperAdminSession(session)) return true;
  if (isUniversityWideCmsSession(session)) return true;
  return false;
}

const loadAllowedCmsModules = cache(
  async (
    userId: string,
    departmentId: string | null,
    bypass: boolean,
  ): Promise<CmsModule[] | null> => {
    if (bypass) return null;
    if (!departmentId) return null;

    const admin = createAdminClient();
    if (!admin) return null;

    const { data, error } = await admin
      .from(Tables.departmentModules)
      .select("module")
      .eq("department_id", departmentId);

    if (error || !data?.length) return null;

    return data.map((row) => row.module as CmsModule);
  },
);

/** `null` = unrestricted (all content modules). Array = explicit allow-list. */
export async function getAllowedCmsModulesForSession(
  session: AdminSession,
): Promise<CmsModule[] | null> {
  return loadAllowedCmsModules(
    session.userId,
    resolveSessionDepartmentId(session),
    isModuleRestrictionBypass(session),
  );
}

export async function hasCmsModuleAccess(
  session: AdminSession,
  module: CmsModule,
): Promise<boolean> {
  const allowed = await getAllowedCmsModulesForSession(session);
  return sessionCanAccessCmsModule(allowed, module);
}

export async function assertCmsModuleAccess(
  session: AdminSession,
  module: CmsModule,
): Promise<void> {
  const allowed = await getAllowedCmsModulesForSession(session);
  if (!sessionCanAccessCmsModule(allowed, module)) {
    throw new Error(`You do not have access to the ${module} module for your department.`);
  }
}

/** Server actions — throws on denied module access. */
export async function requireAdminSessionForCmsModule(
  module: CmsModule,
  roles: readonly UserRole[] = CMS_READ_ROLES,
): Promise<AdminSession> {
  const session = await requireAdminWithRoles([...roles]);
  await assertCmsModuleAccess(session, module);
  return session;
}

/** Admin pages — redirects to dashboard when module is not allowed. */
export async function requireCmsModuleOrRedirect(
  module: CmsModule,
  roles: readonly UserRole[] = CMS_READ_ROLES,
): Promise<AdminSession> {
  const session = await requireAdminWithRoles([...roles]);
  const allowed = await getAllowedCmsModulesForSession(session);
  if (!sessionCanAccessCmsModule(allowed, module)) {
    redirect("/admin");
  }
  return session;
}

export async function requireCmsModuleEditOrRedirect(module: CmsModule): Promise<AdminSession> {
  return requireCmsModuleOrRedirect(module, [...CONTENT_EDIT_ROLES]);
}

/** Read-only session check with module guard (for list/detail loaders). */
export async function requireCmsModuleRead(module: CmsModule): Promise<AdminSession> {
  const session = await requireAdminSession();
  await assertCmsModuleAccess(session, module);
  return session;
}
