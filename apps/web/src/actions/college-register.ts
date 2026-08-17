"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/auth/audit";
import { canDeletePages, canEditPages, isSuperAdminSession } from "@/lib/auth/college-scope";
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
import type { FacultyAssignment, FacultyPerson, PageStaff } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  registerDepartmentSchema,
  registerFacultySchema,
  assignExistingFacultySchema,
  updateDepartmentSchema,
  updateFacultySchema,
  updateFacultyPersonSchema,
  updateFacultyAssignmentSchema,
} from "@/lib/validations/college-register";
import { removeStorageObjects, uploadFacultyImage } from "@/lib/storage/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { readStoredLayoutConfig } from "@/lib/pages/layout-config";
import {
  deactivateAssignmentForStaff,
  saveFacultyPersonProfile,
  searchFacultyPeople,
  syncPersonFromPageStaff,
} from "@/lib/faculty/people";
import type { SupabaseClient } from "@supabase/supabase-js";

function getFacultyImageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

function isStoredFacultyImagePath(path: string): boolean {
  return path !== "pending" && !path.startsWith("http://") && !path.startsWith("https://");
}

async function resolveFacultyImagePath(
  admin: SupabaseClient,
  staffId: string,
  formData: FormData,
  imagePathInput: string | undefined,
  existingPath: string | null | undefined,
): Promise<ActionResult<string | null>> {
  const imageFile = getFacultyImageFile(formData);

  if (imageFile) {
    if (existingPath && isStoredFacultyImagePath(existingPath)) {
      await removeStorageObjects(admin, [existingPath]);
    }
    const upload = await uploadFacultyImage(admin, staffId, imageFile);
    if (!upload.success) return upload;
    return ok(upload.data);
  }

  const url = imagePathInput?.trim();
  if (url) {
    if (existingPath && isStoredFacultyImagePath(existingPath) && url !== existingPath) {
      await removeStorageObjects(admin, [existingPath]);
    }
    return ok(url);
  }

  if (existingPath && existingPath !== "pending") {
    return ok(existingPath);
  }

  return ok(null);
}

export async function getCollegesForRegisterForm() {
  const session = await requireAdminSession();
  if (
    !isSuperAdminSession(session) &&
    !session.collegeAssignment &&
    !session.departmentPageAssignment
  ) {
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
  if (
    !isSuperAdminSession(session) &&
    !session.collegeAssignment &&
    !session.departmentPageAssignment
  ) {
    return [];
  }
  if (session.departmentPageAssignment) {
    const depts = await listDepartmentsForRegister(session, collegePageId);
    return depts.filter((d) => d.id === session.departmentPageAssignment!.departmentPageId);
  }
  if (collegePageId) {
    await assertCollegeRegisterAccess(session, collegePageId);
  }
  return listDepartmentsForRegister(session, collegePageId);
}

export async function getFacultyListForRegister(collegePageId?: string) {
  const session = await requireAdminSession();
  if (
    !isSuperAdminSession(session) &&
    !session.collegeAssignment &&
    !session.departmentPageAssignment
  ) {
    return [];
  }
  if (session.departmentPageAssignment) {
    const list = await listFacultyForRegister(session, collegePageId);
    return list.filter((f) => f.page_id === session.departmentPageAssignment!.departmentPageId);
  }
  if (collegePageId) {
    await assertCollegeRegisterAccess(session, collegePageId);
  }
  return listFacultyForRegister(session, collegePageId);
}

async function requireRegisterSession() {
  const session = await requireAdminSession();
  if (
    !isSuperAdminSession(session) &&
    !session.collegeAssignment &&
    !session.departmentPageAssignment
  ) {
    throw new Error("You do not have permission to register college content.");
  }
  return session;
}

export async function registerDepartmentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const session = await requireRegisterSession();
    if (session.departmentPageAssignment) {
      return fail("Department HOD cannot create departments.");
    }
    if (!canEditPages(session)) {
      return fail("You do not have permission to add departments.");
    }
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
      sortOrder: formData.get("sortOrder") ?? 0,
      showInDepartmentsMenu: formData.get("showInDepartmentsMenu") === "true",
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
    if (!canEditPages(session)) {
      return fail("You do not have permission to add faculty.");
    }
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
      qualificationEn: formData.get("qualificationEn") || undefined,
      qualificationHi: formData.get("qualificationHi") || undefined,
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

    const slug = input.staffSlug.trim().toLowerCase();
    if (!slug) return fail("Profile URL slug is required.");

    const { data: existingSlug } = await admin
      .from(Tables.pageStaff)
      .select("id")
      .eq("page_id", input.departmentPageId)
      .eq("staff_slug", slug)
      .maybeSingle();

    if (existingSlug) return fail("A faculty profile with this URL slug already exists in this department.");

    const email = (input.email || "").trim().toLowerCase();
    if (email) {
      const { data: existingEmail } = await admin
        .from(Tables.pageStaff)
        .select("id, name_en")
        .eq("page_id", input.departmentPageId)
        .ilike("email", email)
        .maybeSingle();
      if (existingEmail) {
        return fail(
          `A faculty member with this email already exists in this department (${existingEmail.name_en}). Edit that profile instead of creating a duplicate.`,
        );
      }
    }

    if (input.memberType === "hod") {
      const { count } = await admin
        .from(Tables.pageStaff)
        .select("id", { count: "exact", head: true })
        .eq("page_id", input.departmentPageId)
        .eq("member_type", "hod")
        .eq("is_active", true);

      if ((count ?? 0) > 0) {
        return fail("This department already has a Head of Department. Edit the existing HOD or choose Faculty.");
      }
    }

    const detailPath = await buildFacultyDetailPath(input.departmentPageId, slug);
    const sortOrder = input.sortOrder;

    const { data, error } = await admin
      .from(Tables.pageStaff)
      .insert({
        page_id: input.departmentPageId,
        member_type: input.memberType,
        staff_slug: slug,
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        designation_en: input.designationEn,
        designation_hi: input.designationHi || null,
        specialization_en: input.specializationEn || null,
        specialization_hi: input.specializationHi || null,
        image_path: input.imagePath || null,
        mobile: input.mobile || null,
        email: email || null,
        experience_en: input.experienceEn || null,
        experience_hi: input.experienceHi || null,
        qualification_en: input.qualificationEn || null,
        qualification_hi: input.qualificationHi || null,
        detail_content_en: input.detailContentEn || null,
        detail_content_hi: input.detailContentHi || null,
        detail_href: detailPath,
        sort_order: sortOrder,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !data) return fail(error?.message ?? "Failed to register faculty.");

    const imageResult = await resolveFacultyImagePath(
      admin,
      data.id,
      formData,
      input.imagePath,
      input.imagePath || null,
    );
    if (!imageResult.success) return imageResult;

    if (imageResult.data && imageResult.data !== (input.imagePath || null)) {
      const { error: imageError } = await admin
        .from(Tables.pageStaff)
        .update({ image_path: imageResult.data })
        .eq("id", data.id);
      if (imageError) return fail(imageError.message);
    }

    const { data: staffRow } = await admin.from(Tables.pageStaff).select("*").eq("id", data.id).maybeSingle();
    if (staffRow) {
      try {
        await syncPersonFromPageStaff(admin, staffRow as PageStaff, { overwritePersonProfile: false });
      } catch (syncError) {
        return fail(syncError instanceof Error ? syncError.message : "Faculty saved, but shared profile sync failed.");
      }
    }

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
    sortOrder: page.sort_order ?? 0,
    showInDepartmentsMenu:
      readStoredLayoutConfig(page.layout_config, page.layout_template ?? "office_portal")
        .showInDepartmentsMenu !== false,
  };
}

export async function updateDepartmentAction(
  departmentId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRegisterSession();
    if (!canEditPages(session)) {
      return fail("You do not have permission to edit departments.");
    }
    const parsed = updateDepartmentSchema.safeParse({
      titleEn: formData.get("titleEn"),
      titleHi: formData.get("titleHi") || undefined,
      slug: formData.get("slug"),
      excerptEn: formData.get("excerptEn") || undefined,
      contentEn: formData.get("contentEn") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      showInDepartmentsMenu: formData.get("showInDepartmentsMenu") === "true",
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

    const nextSlug = session.departmentPageAssignment ? existing.slug : input.slug;

    const { data: slugTaken } = await admin
      .from(Tables.pages)
      .select("id")
      .eq("slug", nextSlug)
      .neq("id", departmentId)
      .maybeSingle();

    if (slugTaken) return fail("A page with this slug already exists.");

    const layoutConfig = {
      ...readStoredLayoutConfig(existing.layout_config, existing.layout_template ?? "office_portal"),
      showInDepartmentsMenu: input.showInDepartmentsMenu,
    };

    const { error } = await admin
      .from(Tables.pages)
      .update({
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        slug: nextSlug,
        excerpt_en: input.excerptEn || null,
        content_en: input.contentEn || null,
        sort_order: input.sortOrder ?? 0,
        layout_config: layoutConfig,
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
    if (existing.college_root_id) {
      const { data: college } = await admin
        .from(Tables.pages)
        .select("slug")
        .eq("id", existing.college_root_id)
        .maybeSingle();
      if (college?.slug) {
        revalidatePath(`/college/${college.slug}`);
      }
    }

    return ok({ id: departmentId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update department.");
  }
}

export async function deleteDepartmentAction(departmentId: string): Promise<ActionResult> {
  try {
    const session = await requireRegisterSession();
    if (session.departmentPageAssignment) {
      return fail("Department HOD cannot delete departments.");
    }
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

  const { data: link } = await admin
    .from(Tables.facultyAssignments)
    .select("person_id")
    .eq("source_staff_id", staffId)
    .maybeSingle();

  return { staff: row, department: dept, personId: (link?.person_id as string | null) ?? null };
}

export async function getFacultyPersonForEdit(personId: string) {
  const session = await requireRegisterSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: person } = await admin.from(Tables.facultyPeople).select("*").eq("id", personId).maybeSingle();
  if (!person) return null;

  const { data: assignments } = await admin
    .from(Tables.facultyAssignments)
    .select("*")
    .eq("person_id", personId)
    .order("sort_order");
  const rows = (assignments ?? []) as FacultyAssignment[];
  if (!rows.length) return null;

  const accessible = await listDepartmentsForRegister(session);
  const accessibleIds = new Set(accessible.map((d) => d.id));
  if (!rows.some((row) => accessibleIds.has(row.page_id))) {
    return null;
  }

  const pageIds = [...new Set(rows.map((row) => row.page_id))];
  const { data: pages } = await admin
    .from(Tables.pages)
    .select("id, title_en, college_root_id, slug")
    .in("id", pageIds);
  const pageById = new Map((pages ?? []).map((p) => [p.id, p]));
  const collegeIds = [...new Set((pages ?? []).map((p) => p.college_root_id).filter(Boolean))] as string[];
  const { data: colleges } = collegeIds.length
    ? await admin.from(Tables.pages).select("id, title_en").in("id", collegeIds)
    : { data: [] };
  const collegeById = new Map((colleges ?? []).map((c) => [c.id, c.title_en as string]));

  return {
    person: person as FacultyPerson,
    assignments: rows.map((row) => {
      const page = pageById.get(row.page_id);
      return {
        assignment: row,
        departmentTitle: (page?.title_en as string) ?? "Department",
        collegeTitle: page?.college_root_id ? collegeById.get(page.college_root_id) ?? "" : "",
        collegeRootId: (page?.college_root_id as string | null) ?? null,
        canEdit: accessibleIds.has(row.page_id),
      };
    }),
  };
}

export async function updateFacultyPersonAction(
  personId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRegisterSession();
    if (!canEditPages(session)) return fail("You do not have permission to edit faculty.");
    const parsed = updateFacultyPersonSchema.safeParse({
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      imagePath: formData.get("imagePath") || undefined,
      mobile: formData.get("mobile") || undefined,
      email: formData.get("email") || undefined,
      experienceEn: formData.get("experienceEn") || undefined,
      experienceHi: formData.get("experienceHi") || undefined,
      qualificationEn: formData.get("qualificationEn") || undefined,
      qualificationHi: formData.get("qualificationHi") || undefined,
      detailContentEn: formData.get("detailContentEn") || undefined,
      detailContentHi: formData.get("detailContentHi") || undefined,
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const personData = await getFacultyPersonForEdit(personId);
    if (!personData) return fail("Faculty person not found.");
    if (!personData.assignments.some((row) => row.canEdit)) {
      return fail("You do not have permission to edit this profile.");
    }

    const staffId = personData.assignments.find((row) => row.assignment.source_staff_id)?.assignment.source_staff_id;
    const imageResult = await resolveFacultyImagePath(
      admin,
      staffId || personId,
      formData,
      parsed.data.imagePath,
      personData.person.image_path,
    );
    if (!imageResult.success) return imageResult;

    await saveFacultyPersonProfile(admin, personId, {
      nameEn: parsed.data.nameEn,
      nameHi: parsed.data.nameHi,
      imagePath: imageResult.data,
      email: parsed.data.email,
      mobile: parsed.data.mobile,
      qualificationEn: parsed.data.qualificationEn,
      qualificationHi: parsed.data.qualificationHi,
      experienceEn: parsed.data.experienceEn,
      experienceHi: parsed.data.experienceHi,
      specializationEn: parsed.data.specializationEn,
      specializationHi: parsed.data.specializationHi,
      detailContentEn: parsed.data.detailContentEn,
      detailContentHi: parsed.data.detailContentHi,
    });

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "faculty_person",
      entityId: personId,
    });
    revalidatePath("/admin/register/faculty");
    revalidatePath(`/admin/register/faculty/person/${personId}`);
    return ok({ id: personId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update faculty profile.");
  }
}

export async function updateFacultyAssignmentAction(
  assignmentId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireRegisterSession();
    if (!canEditPages(session)) return fail("You do not have permission to edit assignments.");
    const parsed = updateFacultyAssignmentSchema.safeParse({
      memberType: formData.get("memberType"),
      designationEn: formData.get("designationEn"),
      designationHi: formData.get("designationHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const { data: assignment } = await admin
      .from(Tables.facultyAssignments)
      .select("*")
      .eq("id", assignmentId)
      .maybeSingle();
    if (!assignment) return fail("Assignment not found.");
    const row = assignment as FacultyAssignment;
    await assertRegisterPageAccess(session, row.page_id);

    if (parsed.data.memberType === "hod") {
      const { data: otherHod } = await admin
        .from(Tables.facultyAssignments)
        .select("id")
        .eq("page_id", row.page_id)
        .eq("member_type", "hod")
        .eq("is_active", true)
        .neq("id", assignmentId)
        .maybeSingle();
      if (otherHod) {
        return fail("This department already has a Head of Department. Demote the existing HOD first.");
      }
    }

    const specEn = parsed.data.specializationEn?.trim() || null;
    const specHi = parsed.data.specializationHi?.trim() || null;
    const { error } = await admin
      .from(Tables.facultyAssignments)
      .update({
        member_type: parsed.data.memberType,
        designation_en: parsed.data.designationEn,
        designation_hi: parsed.data.designationHi || null,
        specialization_en: specEn,
        specialization_hi: specHi,
        sort_order: parsed.data.sortOrder,
        is_active: parsed.data.isActive ?? true,
      })
      .eq("id", assignmentId);
    if (error) return fail(error.message);

    if (row.source_staff_id) {
      const { data: person } = await admin
        .from(Tables.facultyPeople)
        .select("specialization_en, specialization_hi")
        .eq("id", row.person_id)
        .maybeSingle();
      await admin
        .from(Tables.pageStaff)
        .update({
          member_type: parsed.data.memberType,
          designation_en: parsed.data.designationEn,
          designation_hi: parsed.data.designationHi || null,
          specialization_en: specEn || person?.specialization_en || null,
          specialization_hi: specHi || person?.specialization_hi || null,
          sort_order: parsed.data.sortOrder,
          is_active: parsed.data.isActive ?? true,
        })
        .eq("id", row.source_staff_id);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "faculty_assignment",
      entityId: assignmentId,
    });
    revalidatePath("/admin/register/faculty");
    revalidatePath(`/admin/register/faculty/person/${row.person_id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update assignment.");
  }
}

export async function getFacultyDuplicateReportAction(collegePageId: string) {
  const session = await requireRegisterSession();
  await assertCollegeRegisterAccess(session, collegePageId);
  const list = await listFacultyForRegister(session, collegePageId);
  const active = list.filter((row) => row.is_active);
  const byPage = new Map<string, typeof active>();
  for (const row of active) {
    const bucket = byPage.get(row.page_id) ?? [];
    bucket.push(row);
    byPage.set(row.page_id, bucket);
  }

  function normalizeName(name: string) {
    return name.toLowerCase().replace(/\b(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  const withinPage: Array<{ page: string; reason: string; names: string[] }> = [];
  for (const rows of byPage.values()) {
    const page = rows[0]?.department_title ?? "Department";
    const slugMap = new Map<string, string[]>();
    const emailMap = new Map<string, string[]>();
    const nameMap = new Map<string, string[]>();
    for (const row of rows) {
      if (row.staff_slug) {
        const names = slugMap.get(row.staff_slug) ?? [];
        names.push(row.name_en);
        slugMap.set(row.staff_slug, names);
      }
      if (row.email) {
        const key = row.email.toLowerCase();
        const names = emailMap.get(key) ?? [];
        names.push(row.name_en);
        emailMap.set(key, names);
      }
      const nameKey = normalizeName(row.name_en);
      if (nameKey) {
        const names = nameMap.get(nameKey) ?? [];
        names.push(row.name_en);
        nameMap.set(nameKey, names);
      }
    }
    for (const [slug, names] of slugMap) {
      if (names.length > 1) withinPage.push({ page, reason: `slug ${slug}`, names });
    }
    for (const [email, names] of emailMap) {
      if (names.length > 1) withinPage.push({ page, reason: `email ${email}`, names });
    }
    for (const [nameKey, names] of nameMap) {
      if (names.length > 1) withinPage.push({ page, reason: `name “${nameKey}” (review only)`, names });
    }
  }

  const unlinked = active.filter((row) => !row.person_id).map((row) => ({
    name: row.name_en,
    department: row.department_title,
  }));

  return { withinPage, unlinkedCount: unlinked.length, unlinked: unlinked.slice(0, 20) };
}

export async function updateFacultyAction(
  staffId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string; detailPath: string | null }>> {
  try {
    const session = await requireRegisterSession();
    if (!canEditPages(session)) {
      return fail("You do not have permission to edit faculty.");
    }
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
      qualificationEn: formData.get("qualificationEn") || undefined,
      qualificationHi: formData.get("qualificationHi") || undefined,
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

    const slug = input.staffSlug.trim().toLowerCase();
    if (!slug) return fail("Profile URL slug is required.");

    const { data: slugTaken } = await admin
      .from(Tables.pageStaff)
      .select("id")
      .eq("page_id", input.departmentPageId)
      .eq("staff_slug", slug)
      .neq("id", staffId)
      .maybeSingle();

    if (slugTaken) return fail("A faculty profile with this URL slug already exists in this department.");

    const email = (input.email || "").trim().toLowerCase();
    if (email) {
      const { data: existingEmail } = await admin
        .from(Tables.pageStaff)
        .select("id, name_en")
        .eq("page_id", input.departmentPageId)
        .ilike("email", email)
        .neq("id", staffId)
        .maybeSingle();
      if (existingEmail) {
        return fail(
          `A faculty member with this email already exists in this department (${existingEmail.name_en}). Edit that profile instead of creating a duplicate.`,
        );
      }
    }

    if (input.memberType === "hod") {
      const { data: otherHod } = await admin
        .from(Tables.pageStaff)
        .select("id")
        .eq("page_id", input.departmentPageId)
        .eq("member_type", "hod")
        .eq("is_active", true)
        .neq("id", staffId)
        .maybeSingle();

      if (otherHod) {
        return fail("This department already has a Head of Department. Edit the existing HOD or choose Faculty.");
      }
    }

    const detailPath = await buildFacultyDetailPath(input.departmentPageId, slug);
    const sortOrder = input.sortOrder;

    const imageResult = await resolveFacultyImagePath(
      admin,
      staffId,
      formData,
      input.imagePath,
      existingRow.image_path,
    );
    if (!imageResult.success) return imageResult;

    const { error } = await admin
      .from(Tables.pageStaff)
      .update({
        page_id: input.departmentPageId,
        member_type: input.memberType,
        staff_slug: slug,
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        designation_en: input.designationEn,
        designation_hi: input.designationHi || null,
        specialization_en: input.specializationEn || null,
        specialization_hi: input.specializationHi || null,
        image_path: imageResult.data,
        mobile: input.mobile || null,
        email: email || null,
        experience_en: input.experienceEn || null,
        experience_hi: input.experienceHi || null,
        qualification_en: input.qualificationEn || null,
        qualification_hi: input.qualificationHi || null,
        detail_content_en: input.detailContentEn || null,
        detail_content_hi: input.detailContentHi || null,
        detail_href: detailPath,
        sort_order: sortOrder,
      })
      .eq("id", staffId);

    if (error) return fail(error.message);

    const { data: staffRow } = await admin.from(Tables.pageStaff).select("*").eq("id", staffId).maybeSingle();
    if (staffRow) {
      try {
        await syncPersonFromPageStaff(admin, staffRow as PageStaff, { overwritePersonProfile: true });
      } catch (syncError) {
        return fail(syncError instanceof Error ? syncError.message : "Faculty saved, but shared profile sync failed.");
      }
    }

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
    if (!canDeletePages(session) && !session.departmentPageAssignment) {
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

    await deactivateAssignmentForStaff(admin, staffId);

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

export async function searchFacultyPeopleAction(query: string) {
  const session = await requireRegisterSession();
  if (!canEditPages(session)) return [];
  const admin = createAdminClient();
  if (!admin) return [];
  return searchFacultyPeople(admin, query);
}

export async function assignExistingFacultyAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; detailPath: string | null }>> {
  try {
    const session = await requireRegisterSession();
    if (!canEditPages(session)) {
      return fail("You do not have permission to assign faculty.");
    }
    const parsed = assignExistingFacultySchema.safeParse({
      personId: formData.get("personId"),
      departmentPageId: formData.get("departmentPageId"),
      memberType: formData.get("memberType"),
      designationEn: formData.get("designationEn"),
      designationHi: formData.get("designationHi") || undefined,
      specializationEn: formData.get("specializationEn") || undefined,
      specializationHi: formData.get("specializationHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 1,
    });
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const input = parsed.data;
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    await assertRegisterPageAccess(session, input.departmentPageId);

    const { data: person } = await admin
      .from(Tables.facultyPeople)
      .select("*")
      .eq("id", input.personId)
      .maybeSingle();
    if (!person) return fail("Faculty person not found.");
    const personRow = person as FacultyPerson;

    const { data: already } = await admin
      .from(Tables.facultyAssignments)
      .select("id")
      .eq("person_id", personRow.id)
      .eq("page_id", input.departmentPageId)
      .maybeSingle();
    if (already) return fail("This person is already assigned to this department.");

    const staffSlug = personRow.global_slug;
    const { data: slugTaken } = await admin
      .from(Tables.pageStaff)
      .select("id")
      .eq("page_id", input.departmentPageId)
      .eq("staff_slug", staffSlug)
      .maybeSingle();
    if (slugTaken) return fail("A faculty profile with this URL slug already exists in this department.");

    if (input.memberType === "hod") {
      const { count } = await admin
        .from(Tables.pageStaff)
        .select("id", { count: "exact", head: true })
        .eq("page_id", input.departmentPageId)
        .eq("member_type", "hod")
        .eq("is_active", true);
      if ((count ?? 0) > 0) {
        return fail("This department already has a Head of Department. Edit the existing HOD or choose Faculty.");
      }
    }

    const detailPath = await buildFacultyDetailPath(input.departmentPageId, staffSlug);
    const { data, error } = await admin
      .from(Tables.pageStaff)
      .insert({
        page_id: input.departmentPageId,
        member_type: input.memberType,
        staff_slug: staffSlug,
        name_en: personRow.name_en,
        name_hi: personRow.name_hi,
        designation_en: input.designationEn,
        designation_hi: input.designationHi || null,
        specialization_en: input.specializationEn || personRow.specialization_en,
        specialization_hi: input.specializationHi || personRow.specialization_hi,
        image_path: personRow.image_path,
        mobile: personRow.mobile,
        email: personRow.email,
        experience_en: personRow.experience_en,
        experience_hi: personRow.experience_hi,
        qualification_en: personRow.qualification_en,
        qualification_hi: personRow.qualification_hi,
        detail_content_en: personRow.detail_content_en,
        detail_content_hi: personRow.detail_content_hi,
        detail_href: detailPath,
        sort_order: input.sortOrder,
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !data) return fail(error?.message ?? "Failed to assign faculty.");

    const { data: staffRow } = await admin.from(Tables.pageStaff).select("*").eq("id", data.id).maybeSingle();
    if (staffRow) {
      try {
        await syncPersonFromPageStaff(admin, staffRow as PageStaff, { overwritePersonProfile: false });
      } catch (syncError) {
        return fail(syncError instanceof Error ? syncError.message : "Assigned, but shared profile sync failed.");
      }
    }

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "page_staff",
      entityId: data.id,
      details: { assignedPersonId: personRow.id, departmentPageId: input.departmentPageId },
    });
    revalidatePath("/admin/register/faculty");
    if (detailPath) revalidatePath(detailPath);
    return ok({ id: data.id, detailPath });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to assign faculty.");
  }
}

/** Super admin, college staff, or Department HOD — register / microsite setup. */
export async function requireCollegeRegisterAdmin() {
  const session = await requireAdminSession();
  if (
    !isSuperAdminSession(session) &&
    !session.collegeAssignment &&
    !session.departmentPageAssignment
  ) {
    throw new Error("Insufficient permissions.");
  }
  return session;
}

export async function requireCollegeRegisterAdminOrRedirect() {
  const session = await requireAdminSession();
  if (
    !isSuperAdminSession(session) &&
    !session.collegeAssignment &&
    !session.departmentPageAssignment
  ) {
    redirect("/admin");
  }
  return session;
}

export async function requireSuperAdminForCollegeRegister() {
  return requireAdminWithRoles(["super_admin"]);
}
