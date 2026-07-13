"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { ALL_CMS_MODULES } from "@/lib/auth/cms-module-access";
import { requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { CmsModule } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_ROLES = ["super_admin"] as const;

export interface DepartmentModuleView {
  id: string;
  slug: string;
  name_en: string;
  modules: CmsModule[];
  /** `true` when no rows in department_modules (legacy / full content access). */
  unrestricted: boolean;
}

export async function listDepartmentModulesForAdmin(): Promise<DepartmentModuleView[]> {
  await requireAdminWithRoles([...SUPER_ADMIN_ROLES]);
  const admin = createAdminClient();
  if (!admin) return [];

  const [{ data: departments }, { data: moduleRows }] = await Promise.all([
    admin
      .from(Tables.departments)
      .select("id, slug, name_en")
      .eq("is_active", true)
      .order("sort_order"),
    admin.from(Tables.departmentModules).select("department_id, module"),
  ]);

  const modulesByDept = new Map<string, CmsModule[]>();
  for (const row of moduleRows ?? []) {
    const list = modulesByDept.get(row.department_id) ?? [];
    list.push(row.module as CmsModule);
    modulesByDept.set(row.department_id, list);
  }

  return (departments ?? []).map((dept) => {
    const modules = modulesByDept.get(dept.id) ?? [];
    return {
      id: dept.id,
      slug: dept.slug,
      name_en: dept.name_en,
      modules,
      unrestricted: modules.length === 0,
    };
  });
}

function parseModules(formData: FormData): CmsModule[] {
  const raw = formData.getAll("modules");
  const selected = raw
    .map((value) => String(value))
    .filter((value): value is CmsModule =>
      (ALL_CMS_MODULES as readonly string[]).includes(value),
    );
  return [...new Set(selected)];
}

export async function updateDepartmentModulesAction(
  departmentId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...SUPER_ADMIN_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: department } = await admin
      .from(Tables.departments)
      .select("id, name_en")
      .eq("id", departmentId)
      .maybeSingle();

    if (!department) return fail("Department not found.");

    const modules = parseModules(formData);

    const { error: deleteError } = await admin
      .from(Tables.departmentModules)
      .delete()
      .eq("department_id", departmentId);

    if (deleteError) return fail(deleteError.message);

    if (modules.length > 0) {
      const { error: insertError } = await admin.from(Tables.departmentModules).insert(
        modules.map((module) => ({
          department_id: departmentId,
          module,
        })),
      );
      if (insertError) return fail(insertError.message);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "department_modules",
      entityId: departmentId,
      details: {
        department: department.name_en,
        modules: modules.length ? modules : "unrestricted",
      },
    });

    revalidatePath("/admin/settings/department-modules");
    revalidatePath("/admin");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to update department modules.");
  }
}
