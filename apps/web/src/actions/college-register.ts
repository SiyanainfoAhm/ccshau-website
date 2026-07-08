"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/auth/audit";
import { isSuperAdminSession } from "@/lib/auth/college-scope";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import {
  assertCollegeRegisterAccess,
  assertRegisterPageAccess,
  buildFacultyDetailPath,
  departmentInsertRow,
  getOrCreateDepartmentSection,
  listCollegesForRegister,
  listDepartmentsForRegister,
  listFacultyForRegister,
  seedDepartmentSidebar,
} from "@/lib/pages/college-register-helpers";
import type { PageStaff } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  registerDepartmentSchema,
  registerFacultySchema,
  updateDepartmentSchema,
  updateFacultySchema,
} from "@/lib/validations/college-register";
import { canDeletePages } from "@/lib/auth/college-scope";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCollegesForRegisterForm() {
  const session = await requireAdminSession();
  if (!isSuperAdminSession(session) && !session.collegeAssignment) {
    return [];
  }
  return listCollegesForRegister(session);
}

export async function getCollegeForRegisterHub(collegePageId: string) {
  const session = await requireCollegeRegisterAdmin();
  return assertCollegeRegisterAccess(session, collegePageId);
}

export async function getDepartmentsForRegisterForm(collegePageId?: string) {
  const session = await requireAdminSession();
  if (!isSuperAdminSession(session) && !session.collegeAssignment) {
    return [];
  }
  if (collegePageId) {
    await assertCollegeRegisterAccess(session, collegePageId);
  }
  return listDepartmentsForRegister(session, collegePageId);
}

export async function getFacultyListForRegister(collegePageId?: string) {
  const session = await requireAdminSession();
  if (!isSuperAdminSession(session) && !session.collegeAssignment) {
    return [];
  }
  if (collegePageId) {
    await assertCollegeRegisterAccess(session, collegePageId);
  }
  return listFacultyForRegister(session, collegePageId);
}

async function requireRegisterSession() {
  const session = await requireAdminSession();
  if (!isSuperAdminSession(session) && !session.collegeAssignment) {
    throw new Error("You do not have permission to register college content.");
  }
  return session;
}

export async function registerDepartmentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const session = await requireRegisterSession();
    if (!isSuperAdminSession(session) && !session.collegeAssignment) {
      return fail("College staff cannot create departments without an assignment.");
    }

    const parsed = registerDepartmentSchema.safeParse({
      collegePageId: formData.get("collegePageId"),
      titleEn: formData.get("titleEn"),
      titleHi: formData.get("titleHi") || undefined,
      slug: formData.get("slug"),
      excerptEn: formData.get("excerptEn") || undefined,
      contentEn: formData.get("contentEn") || undefined,
    });

    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const input = parsed.data;
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    if (!isSuperAdminSession(session) && session.collegeAssignment?.collegePageId !== input.collegePageId) {
      return fail("You can only add departments to your assigned college.");
    }

    await assertRegisterPageAccess(session, input.collegePageId);

    const { data: college } = await admin
      .from(Tables.pages)
      .select("id, slug")
      .eq("id", input.collegePageId)
      .maybeSingle();

    if (!college) return fail("College not found.");

    const { data: slugTaken } = await admin
      .from(Tables.pages)
      .select("id")
      .eq("slug", input.slug)
      .maybeSingle();

    if (slugTaken) return fail("A page with this slug already exists.");

    const sectionId = await getOrCreateDepartmentSection(admin, college.id, college.slug);
    const row = departmentInsertRow(input, sectionId, session.userId);

    const { data, error } = await admin.from(Tables.pages).insert(row).select("id, slug").single();
    if (error || !data) return fail(error?.message ?? "Failed to create department.");

    await seedDepartmentSidebar(data.id);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "department_page",
      entityId: data.id,
      details: { slug: data.slug, collegePageId: input.collegePageId },
    });

    revalidatePath("/admin/register");
    revalidatePath("/admin/register/department");
    revalidatePath("/admin/pages");
    revalidatePath(`/college/${college.slug}`);

    return ok({ id: data.id, slug: data.slug });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to register department.");
  }
}

export async function registerFacultyAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; detailPath: string | null }>> {
  try {
    const session = await requireRegisterSession();
    const parsed = registerFacultySchema.safeParse({
      departmentPageId: formData.get("departmentPageId"),
      memberType: formData.get("memberType"),
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi") || undefined,
      designationEn: formData.get("designationEn"),
      designationHi: formData.get("designationHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      imagePath: formData.get("imagePath") || undefined,
      mobile: formData.get("mobile") || undefined,
      email: formData.get("email") || undefined,
      experienceEn: formData.get("experienceEn") || undefined,
      experienceHi: formData.get("experienceHi") || undefined,
      detailContentEn: formData.get("detailContentEn") || undefined,
      detailContentHi: formData.get("detailContentHi") || undefined,
      staffSlug: formData.get("staffSlug"),
      sortOrder: formData.get("sortOrder") ?? (formData.get("memberType") === "hod" ? 0 : 1),
    });

    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const input = parsed.data;
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    await assertRegisterPageAccess(session, input.departmentPageId);

    const { data: existingSlug } = await admin
      .from(Tables.pageStaff)
      .select("id")
      .eq("page_id", input.departmentPageId)
      .eq("staff_slug", input.staffSlug)
      .maybeSingle();

    if (existingSlug) return fail("A faculty profile with this URL slug already exists in this department.");

    if (input.memberType === "hod") {
      const { count } = await admin
        .from(Tables.pageStaff)
        .select("id", { count: "exact", head: true })
        .eq("page_id", input.departmentPageId)
        .eq("member_type", "hod");

      if ((count ?? 0) > 0) {
        return fail("This department already has a Head of Department. Edit the existing HOD or choose Faculty.");
      }
    }

    const detailPath = await buildFacultyDetailPath(input.departmentPageId, input.staffSlug);
    const sortOrder = input.memberType === "hod" ? 0 : input.sortOrder;

    const { data, error } = await admin
      .from(Tables.pageStaff)
      .insert({
        page_id: input.departmentPageId,
        member_type: input.memberType,
        staff_slug: input.staffSlug,
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        designation_en: input.designationEn,
        designation_hi: input.designationHi || null,
        specialization_en: input.specializationEn || null,
        specialization_hi: input.specializationHi || null,
        image_path: input.imagePath || null,
        mobile: input.mobile || null,
        email: input.email || null,
        experience_en: input.experienceEn || null,
        experience_hi: input.experienceHi || null,
        detail_content_en: input.detailContentEn || null,
        detail_content_hi: input.detailContentHi || null,
        detail_href: detailPath,
        sort_order: sortOrder,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !data) return fail(error?.message ?? "Failed to register faculty.");

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_staff",
      entityId: data.id,
      details: { memberType: input.memberType, departmentPageId: input.departmentPageId },
    });

    revalidatePath("/admin/register");
    revalidatePath("/admin/register/faculty");
    if (detailPath) {
      revalidatePath(detailPath);
    }

    return ok({ id: data.id, detailPath });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to register faculty.");
  }
}

export async function getDepartmentForEdit(departmentId: string) {
  const session = await requireRegisterSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const page = await assertRegisterPageAccess(session, departmentId);
  if (page.layout_template !== "office_portal" || !page.college_root_id || page.college_root_id === page.id) {
    return null;
  }

  const { data: college } = await admin
    .from(Tables.pages)
    .select("id, title_en")
    .eq("id", page.college_root_id)
    .maybeSingle();

  return {
    id: page.id,
    collegePageId: page.college_root_id,
    collegeTitle: college?.title_en ?? "",
    titleEn: page.title_en,
    titleHi: page.title_hi,
    slug: page.slug,
    excerptEn: page.excerpt_en,
    contentEn: page.content_en,
  };
}

export async function updateDepartmentAction(
  departmentId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRegisterSession();
    const parsed = updateDepartmentSchema.safeParse({
      titleEn: formData.get("titleEn"),
      titleHi: formData.get("titleHi") || undefined,
      slug: formData.get("slug"),
      excerptEn: formData.get("excerptEn") || undefined,
      contentEn: formData.get("contentEn") || undefined,
    });

    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const input = parsed.data;
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await assertRegisterPageAccess(session, departmentId);
    if (existing.layout_template !== "office_portal") {
      return fail("This page is not a department.");
    }

    const { data: slugTaken } = await admin
      .from(Tables.pages)
      .select("id")
      .eq("slug", input.slug)
      .neq("id", departmentId)
      .maybeSingle();

    if (slugTaken) return fail("A page with this slug already exists.");

    const { error } = await admin
      .from(Tables.pages)
      .update({
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        slug: input.slug,
        excerpt_en: input.excerptEn || null,
        content_en: input.contentEn || null,
        updated_by: session.userId,
      })
      .eq("id", departmentId);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "department_page",
      entityId: departmentId,
      details: { slug: input.slug },
    });

    revalidatePath("/admin/register/department");
    revalidatePath(`/admin/register/department/${departmentId}`);
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${departmentId}`);

    return ok({ id: departmentId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update department.");
  }
}

export async function deleteDepartmentAction(departmentId: string): Promise<ActionResult> {
  try {
    const session = await requireRegisterSession();
    if (!canDeletePages(session)) {
      return fail("You do not have permission to delete departments.");
    }

    const existing = await assertRegisterPageAccess(session, departmentId);
    if (existing.layout_template !== "office_portal") {
      return fail("This page is not a department.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: college } = existing.college_root_id
      ? await admin.from(Tables.pages).select("slug").eq("id", existing.college_root_id).maybeSingle()
      : { data: null };

    const { error } = await admin.from(Tables.pages).delete().eq("id", departmentId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "department_page",
      entityId: departmentId,
    });

    revalidatePath("/admin/register/department");
    revalidatePath("/admin/pages");
    if (college?.slug) revalidatePath(`/college/${college.slug}`);

    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete department.");
  }
}

export async function getFacultyForEdit(staffId: string) {
  const session = await requireRegisterSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: staff } = await admin
    .from(Tables.pageStaff)
    .select("*")
    .eq("id", staffId)
    .maybeSingle();

  if (!staff) return null;

  const row = staff as PageStaff;
  await assertRegisterPageAccess(session, row.page_id);

  const departments = await listDepartmentsForRegister(session);
  const dept = departments.find((d) => d.id === row.page_id);
  if (!dept) return null;

  return { staff: row, department: dept };
}

export async function updateFacultyAction(
  staffId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string; detailPath: string | null }>> {
  try {
    const session = await requireRegisterSession();
    const parsed = updateFacultySchema.safeParse({
      departmentPageId: formData.get("departmentPageId"),
      memberType: formData.get("memberType"),
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi") || undefined,
      designationEn: formData.get("designationEn"),
      designationHi: formData.get("designationHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      imagePath: formData.get("imagePath") || undefined,
      mobile: formData.get("mobile") || undefined,
      email: formData.get("email") || undefined,
      experienceEn: formData.get("experienceEn") || undefined,
      experienceHi: formData.get("experienceHi") || undefined,
      detailContentEn: formData.get("detailContentEn") || undefined,
      detailContentHi: formData.get("detailContentHi") || undefined,
      staffSlug: formData.get("staffSlug"),
      sortOrder: formData.get("sortOrder") ?? (formData.get("memberType") === "hod" ? 0 : 1),
    });

    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const input = parsed.data;
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.pageStaff)
      .select("*")
      .eq("id", staffId)
      .maybeSingle();

    if (!existing) return fail("Faculty not found.");

    const existingRow = existing as PageStaff;
    await assertRegisterPageAccess(session, existingRow.page_id);
    await assertRegisterPageAccess(session, input.departmentPageId);

    const { data: slugTaken } = await admin
      .from(Tables.pageStaff)
      .select("id")
      .eq("page_id", input.departmentPageId)
      .eq("staff_slug", input.staffSlug)
      .neq("id", staffId)
      .maybeSingle();

    if (slugTaken) return fail("A faculty profile with this URL slug already exists in this department.");

    if (input.memberType === "hod") {
      const { data: otherHod } = await admin
        .from(Tables.pageStaff)
        .select("id")
        .eq("page_id", input.departmentPageId)
        .eq("member_type", "hod")
        .neq("id", staffId)
        .maybeSingle();

      if (otherHod) {
        return fail("This department already has a Head of Department. Edit the existing HOD or choose Faculty.");
      }
    }

    const detailPath = await buildFacultyDetailPath(input.departmentPageId, input.staffSlug);
    const sortOrder = input.memberType === "hod" ? 0 : input.sortOrder;

    const { error } = await admin
      .from(Tables.pageStaff)
      .update({
        page_id: input.departmentPageId,
        member_type: input.memberType,
        staff_slug: input.staffSlug,
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        designation_en: input.designationEn,
        designation_hi: input.designationHi || null,
        specialization_en: input.specializationEn || null,
        specialization_hi: input.specializationHi || null,
        image_path: input.imagePath || null,
        mobile: input.mobile || null,
        email: input.email || null,
        experience_en: input.experienceEn || null,
        experience_hi: input.experienceHi || null,
        detail_content_en: input.detailContentEn || null,
        detail_content_hi: input.detailContentHi || null,
        detail_href: detailPath,
        sort_order: sortOrder,
      })
      .eq("id", staffId);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "page_staff",
      entityId: staffId,
      details: { memberType: input.memberType, departmentPageId: input.departmentPageId },
    });

    revalidatePath("/admin/register/faculty");
    revalidatePath(`/admin/register/faculty/${staffId}`);
    if (detailPath) revalidatePath(detailPath);

    return ok({ id: staffId, detailPath });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update faculty.");
  }
}

export async function deleteFacultyAction(staffId: string): Promise<ActionResult> {
  try {
    const session = await requireRegisterSession();
    if (!canDeletePages(session)) {
      return fail("You do not have permission to delete faculty.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.pageStaff)
      .select("*")
      .eq("id", staffId)
      .maybeSingle();

    if (!existing) return fail("Faculty not found.");

    const row = existing as PageStaff;
    await assertRegisterPageAccess(session, row.page_id);

    const detailPath = row.detail_href;

    const { error } = await admin.from(Tables.pageStaff).delete().eq("id", staffId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "page_staff",
      entityId: staffId,
    });

    revalidatePath("/admin/register/faculty");
    if (detailPath) revalidatePath(detailPath);

    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete faculty.");
  }
}

/** Super admin or college staff — register / microsite setup. */
export async function requireCollegeRegisterAdmin() {
  const session = await requireAdminSession();
  if (!isSuperAdminSession(session) && !session.collegeAssignment) {
    throw new Error("Insufficient permissions.");
  }
  return session;
}

export async function requireCollegeRegisterAdminOrRedirect() {
  const session = await requireAdminSession();
  if (!isSuperAdminSession(session) && !session.collegeAssignment) {
    redirect("/admin");
  }
  return session;
}

export async function requireSuperAdminForCollegeRegister() {
  return requireAdminWithRoles(["super_admin"]);
}
