import { assertPageAccess } from "@/lib/auth/college-scope-server";
import { isSuperAdminSession } from "@/lib/auth/college-scope";
import type { AdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { Page } from "@/lib/database/types";
import { DEPARTMENT_SUBSECTION_LAYOUT_CONFIG } from "@/lib/pages/college-wizard-defaults";
import { compareBySortOrderThenTitle } from "@/lib/pages/college-nav";
import { readStoredLayoutConfig } from "@/lib/pages/layout-config";
import { inferMicrositeKind, isMicrositeRoot, type MicrositeKind } from "@/lib/pages/microsite-kind";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CollegeOption {
  id: string;
  slug: string;
  title_en: string;
  kind: MicrositeKind;
}

export interface DepartmentOption {
  id: string;
  slug: string;
  title_en: string;
  college_root_id: string;
  college_title: string;
  college_slug: string;
  section_slug: string;
  sort_order: number;
  showInDepartmentsMenu: boolean;
}

export const DEFAULT_DEPARTMENT_SIDEBAR = [
  { labelEn: "Head of Department", labelHi: "विभागाध्यक्ष", sortOrder: 1 },
  { labelEn: "Faculty", labelHi: "संकाय", sortOrder: 2 },
  { labelEn: "Thrust Area", labelHi: "थ्रस्ट क्षेत्र", sortOrder: 3 },
  { labelEn: "Teaching and Research", labelHi: "शिक्षण और अनुसंधान", sortOrder: 4 },
  { labelEn: "Awards and Honors", labelHi: "पुरस्कार और सम्मान", sortOrder: 5 },
  { labelEn: "Infrastructure", labelHi: "अवसंरचना", sortOrder: 6 },
  { labelEn: "Alumni of the Department", labelHi: "विभाग के पूर्व छात्र", sortOrder: 7 },
  { labelEn: "Retiree of the Department", labelHi: "सेवानिवृत्त", sortOrder: 8 },
  { labelEn: "Course Structure", labelHi: "पाठ्यक्रम संरचना", sortOrder: 9 },
] as const;

export async function listCollegesForRegister(session: AdminSession): Promise<CollegeOption[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.pages)
    .select("id, slug, title_en, parent_id, college_root_id, page_type")
    .eq("page_type", "college")
    .not("college_root_id", "is", null)
    .order("title_en");

  if (!isSuperAdminSession(session) && session.collegeAssignment) {
    query = query.eq("id", session.collegeAssignment.collegePageId);
  } else if (!isSuperAdminSession(session) && session.departmentPageAssignment?.collegePageId) {
    query = query.eq("id", session.departmentPageAssignment.collegePageId);
  } else if (!isSuperAdminSession(session) && session.departmentPageAssignment) {
    return [];
  }

  const { data } = await query;
  const roots = ((data ?? []) as Array<{
    id: string;
    slug: string;
    title_en: string;
    parent_id: string | null;
    college_root_id: string | null;
    page_type: string;
  }>).filter(isMicrositeRoot);

  const parentIds = [...new Set(roots.map((r) => r.parent_id).filter(Boolean))] as string[];
  const parentSlugById = new Map<string, string>();
  if (parentIds.length > 0) {
    const { data: parents } = await admin.from(Tables.pages).select("id, slug").in("id", parentIds);
    for (const parent of parents ?? []) {
      parentSlugById.set(parent.id, parent.slug);
    }
  }

  return roots.map((row) => ({
    id: row.id,
    slug: row.slug,
    title_en: row.title_en,
    kind: inferMicrositeKind(row, parentSlugById),
  }));
}

export async function getCollegeForRegister(
  session: AdminSession,
  collegePageId: string,
): Promise<CollegeOption | null> {
  const colleges = await listCollegesForRegister(session);
  return colleges.find((c) => c.id === collegePageId) ?? null;
}

export async function assertCollegeRegisterAccess(
  session: AdminSession,
  collegePageId: string,
): Promise<CollegeOption> {
  const college = await getCollegeForRegister(session, collegePageId);
  if (!college) {
    throw new Error("College not found or you do not have access.");
  }
  return college;
}

export async function listDepartmentsForRegister(
  session: AdminSession,
  collegePageId?: string,
): Promise<DepartmentOption[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.pages)
    .select("id, slug, title_en, college_root_id, parent_id, layout_template, layout_config, sort_order")
    .eq("layout_template", "office_portal")
    .not("college_root_id", "is", null)
    .order("sort_order")
    .order("title_en");

  if (collegePageId) {
    query = query.eq("college_root_id", collegePageId);
  } else if (!isSuperAdminSession(session) && session.collegeAssignment) {
    query = query.eq("college_root_id", session.collegeAssignment.collegePageId);
  } else if (!isSuperAdminSession(session) && session.departmentPageAssignment) {
    query = query.eq("id", session.departmentPageAssignment.departmentPageId);
  }

  const { data: deptPages } = await query;
  if (!deptPages?.length) return [];

  const collegeIds = [...new Set(deptPages.map((p) => p.college_root_id as string))];
  const parentIds = [...new Set(deptPages.map((p) => p.parent_id as string))];

  const [{ data: colleges }, { data: parents }] = await Promise.all([
    admin.from(Tables.pages).select("id, slug, title_en").in("id", collegeIds),
    admin.from(Tables.pages).select("id, slug").in("id", parentIds),
  ]);

  const collegeById = new Map((colleges ?? []).map((c) => [c.id, c]));
  const parentById = new Map((parents ?? []).map((p) => [p.id, p]));

  return deptPages
    .filter((p) => p.college_root_id !== p.id)
    .map((p) => {
      const college = collegeById.get(p.college_root_id as string);
      const section = parentById.get(p.parent_id as string);
      const layoutConfig = readStoredLayoutConfig(
        p.layout_config,
        (p.layout_template as "office_portal" | "college_home" | "standard") ?? "office_portal",
      );
      return {
        id: p.id,
        slug: p.slug,
        title_en: p.title_en,
        college_root_id: p.college_root_id as string,
        college_title: college?.title_en ?? "",
        college_slug: college?.slug ?? "",
        section_slug: section?.slug ?? "",
        sort_order: (p.sort_order as number | null) ?? 0,
        showInDepartmentsMenu: layoutConfig.showInDepartmentsMenu !== false,
      };
    })
    .sort(
      (a, b) =>
        a.college_title.localeCompare(b.college_title) ||
        compareBySortOrderThenTitle(
          { sortOrder: a.sort_order, titleEn: a.title_en },
          { sortOrder: b.sort_order, titleEn: b.title_en },
        ),
    );
}

/** Staff-bearing pages for faculty register: dept office_portals + root when it holds staff (stations). */
export async function listStaffPagesForRegister(
  session: AdminSession,
  collegePageId: string,
): Promise<DepartmentOption[]> {
  const departments = await listDepartmentsForRegister(session, collegePageId);
  const admin = createAdminClient();
  if (!admin) return departments;

  const { data: root } = await admin
    .from(Tables.pages)
    .select("id, slug, title_en, college_root_id, parent_id, layout_template, layout_config, sort_order")
    .eq("id", collegePageId)
    .maybeSingle();
  if (!root || root.layout_template !== "office_portal" || departments.some((d) => d.id === collegePageId)) {
    return departments;
  }

  const { count } = await admin
    .from(Tables.facultyAssignments)
    .select("id", { count: "exact", head: true })
    .eq("page_id", collegePageId)
    .eq("is_active", true);
  if (!count) return departments;

  const { data: college } = await admin
    .from(Tables.pages)
    .select("id, slug, title_en")
    .eq("id", collegePageId)
    .maybeSingle();
  const { data: parent } = root.parent_id
    ? await admin.from(Tables.pages).select("slug").eq("id", root.parent_id).maybeSingle()
    : { data: null };

  const rootOption: DepartmentOption = {
    id: root.id,
    slug: root.slug,
    title_en: root.title_en,
    college_root_id: root.college_root_id as string,
    college_title: college?.title_en ?? root.title_en,
    college_slug: college?.slug ?? root.slug,
    section_slug: parent?.slug ?? "",
    sort_order: (root.sort_order as number | null) ?? 0,
    showInDepartmentsMenu: true,
  };

  return [rootOption, ...departments];
}

export interface FacultyListItem {
  id: string;
  page_id: string;
  person_id: string | null;
  name_en: string;
  email: string | null;
  designation_en: string;
  member_type: "hod" | "faculty";
  staff_slug: string | null;
  detail_href: string | null;
  is_active: boolean;
  sort_order: number;
  department_title: string;
  department_slug: string;
  college_title: string;
  college_slug: string;
  other_departments: string[];
}

export async function listFacultyForRegister(
  session: AdminSession,
  collegePageId?: string,
): Promise<FacultyListItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  if (!collegePageId) {
    const departments = await listDepartmentsForRegister(session);
    if (!departments.length) return [];
    return listFacultyForRegisterFromDepartments(admin, departments);
  }

  const departments = await listStaffPagesForRegister(session, collegePageId);
  if (!departments.length) return [];
  return listFacultyForRegisterFromDepartments(admin, departments);
}

async function listFacultyForRegisterFromDepartments(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  departments: DepartmentOption[],
): Promise<FacultyListItem[]> {
  const deptIds = departments.map((d) => d.id);
  const deptById = new Map(departments.map((d) => [d.id, d]));
  if (!deptIds.length) return [];

  const { data: assignmentRows } = await admin
    .from(Tables.facultyAssignments)
    .select("id, person_id, page_id, designation_en, member_type, staff_slug, is_active, sort_order")
    .in("page_id", deptIds)
    .eq("is_active", true)
    .order("sort_order")
    .order("staff_slug");

  const rows = (assignmentRows ?? []) as Array<{
    id: string;
    person_id: string;
    page_id: string;
    designation_en: string;
    member_type: "hod" | "faculty";
    staff_slug: string | null;
    is_active: boolean;
    sort_order: number;
  }>;
  const personIds = [...new Set(rows.map((row) => row.person_id))];
  if (!personIds.length) return [];

  const [{ data: people }, { data: siblings }] = await Promise.all([
    admin.from(Tables.facultyPeople).select("id, name_en, email").in("id", personIds),
    admin
      .from(Tables.facultyAssignments)
      .select("person_id, page_id")
      .in("person_id", personIds)
      .eq("is_active", true),
  ]);
  const personById = new Map(
    ((people ?? []) as Array<{ id: string; name_en: string; email: string | null }>).map((row) => [row.id, row]),
  );
  const extraPageIds = [...new Set((siblings ?? []).map((row) => row.page_id as string))];
  const { data: extraPages } = extraPageIds.length
    ? await admin.from(Tables.pages).select("id, title_en").in("id", extraPageIds)
    : { data: [] };
  const titleByPage = new Map((extraPages ?? []).map((p) => [p.id, p.title_en as string]));

  return rows
    .slice()
    .sort((a, b) => {
      const aName = personById.get(a.person_id)?.name_en || "";
      const bName = personById.get(b.person_id)?.name_en || "";
      return aName.localeCompare(bName) || a.sort_order - b.sort_order;
    })
    .flatMap((row) => {
      const person = personById.get(row.person_id);
      const dept = deptById.get(row.page_id);
      if (!person || !dept) return [];
      const detailHref =
        dept.college_slug && dept.section_slug && row.staff_slug
          ? `/college/${dept.college_slug}/${dept.section_slug}/${dept.slug}/faculty/${row.staff_slug}`
          : null;
      return [
        {
          id: row.id,
          page_id: row.page_id,
          person_id: row.person_id,
          name_en: person.name_en,
          email: person.email,
          designation_en: row.designation_en,
          member_type: row.member_type ?? "faculty",
          staff_slug: row.staff_slug,
          detail_href: detailHref,
          is_active: row.is_active,
          sort_order: row.sort_order ?? 0,
          department_title: dept.title_en,
          department_slug: dept.slug,
          college_title: dept.college_title,
          college_slug: dept.college_slug,
          other_departments: (siblings ?? [])
            .filter((sib) => sib.person_id === row.person_id && sib.page_id !== row.page_id)
            .map((sib) => titleByPage.get(sib.page_id as string))
            .filter((title): title is string => Boolean(title)),
        },
      ];
    });
}

export async function getOrCreateDepartmentSection(
  admin: ReturnType<typeof createAdminClient>,
  collegePageId: string,
  collegeSlug: string,
): Promise<string> {
  if (!admin) throw new Error("Database not configured.");

  const sectionSlug = `${collegeSlug.split("-").slice(-2).join("-") || collegeSlug}-department`;

  const { data: existing } = await admin
    .from(Tables.pages)
    .select("id")
    .eq("parent_id", collegePageId)
    .ilike("slug", "%department%")
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from(Tables.pages)
    .insert({
      slug: sectionSlug,
      title_en: "Department",
      title_hi: "विभाग",
      excerpt_en: "Academic departments.",
      parent_id: collegePageId,
      page_type: "standard",
      layout_template: "standard",
      status: "published",
      published_at: new Date().toISOString(),
      sort_order: 1,
      office_cta_enabled: true,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Failed to create department section.");
  return created.id;
}

export async function seedDepartmentSidebar(pageId: string) {
  const admin = createAdminClient();
  if (!admin) return;

  const { count } = await admin
    .from(Tables.pageSidebarItems)
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);

  if ((count ?? 0) > 0) return;

  await admin.from(Tables.pageSidebarItems).insert(
    DEFAULT_DEPARTMENT_SIDEBAR.map((item) => ({
      page_id: pageId,
      side: "left",
      label_en: item.labelEn,
      label_hi: item.labelHi,
      sort_order: item.sortOrder,
      is_active: true,
    })),
  );
}

export async function buildFacultyDetailPath(
  departmentPageId: string,
  staffSlug: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: dept } = await admin
    .from(Tables.pages)
    .select("slug, parent_id, college_root_id")
    .eq("id", departmentPageId)
    .maybeSingle();

  if (!dept?.parent_id || !dept.college_root_id) return null;

  const [{ data: section }, { data: college }] = await Promise.all([
    admin.from(Tables.pages).select("slug").eq("id", dept.parent_id).maybeSingle(),
    admin.from(Tables.pages).select("slug").eq("id", dept.college_root_id).maybeSingle(),
  ]);

  if (!section?.slug || !college?.slug) return null;

  return `/college/${college.slug}/${section.slug}/${dept.slug}/faculty/${staffSlug}`;
}

export async function assertRegisterPageAccess(
  session: AdminSession,
  pageId: string,
): Promise<Page> {
  return assertPageAccess(session, pageId);
}

export function departmentInsertRow(
  input: {
    titleEn: string;
    titleHi?: string;
    slug: string;
    excerptEn?: string;
    contentEn?: string;
    sortOrder?: number;
    showInDepartmentsMenu?: boolean;
  },
  parentId: string,
  userId: string,
) {
  return {
    slug: input.slug,
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    excerpt_en: input.excerptEn || `${input.titleEn} department.`,
    excerpt_hi: null,
    content_en: input.contentEn || `<p>About ${input.titleEn}.</p>`,
    content_hi: null,
    parent_id: parentId,
    page_type: "standard" as const,
    layout_template: "office_portal" as const,
    layout_config: {
      ...DEPARTMENT_SUBSECTION_LAYOUT_CONFIG,
      showInDepartmentsMenu: input.showInDepartmentsMenu !== false,
    },
    status: "published" as const,
    published_at: new Date().toISOString(),
    office_cta_enabled: true,
    sort_order: input.sortOrder ?? 0,
    created_by: userId,
    updated_by: userId,
    content_owner_id: userId,
  };
}
