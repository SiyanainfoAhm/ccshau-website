import { cache } from "react";

import type { AdminSession } from "@/lib/auth/session";
import { isSuperAdminSession } from "@/lib/auth/college-scope";
import type { DepartmentPageAssignment } from "@/lib/auth/department-hod-scope";
import { Tables } from "@/lib/database/names";
import type { DepartmentPageRole } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type { DepartmentPageAssignment };

export const getDepartmentPageAssignmentForUser = cache(
  async (userId: string): Promise<DepartmentPageAssignment | null> => {
    const admin = createAdminClient();
    if (!admin) return null;

    const { data } = await admin
      .from(Tables.userDepartmentPages)
      .select(
        "department_page_id, role, page:department_page_id (title_en, slug, college_root_id)",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) return null;

    const page = data.page as unknown as {
      title_en: string;
      slug: string;
      college_root_id: string | null;
    } | null;
    if (!page) return null;

    let collegeTitle: string | null = null;
    let collegeSlug: string | null = null;
    if (page.college_root_id) {
      const { data: college } = await admin
        .from(Tables.pages)
        .select("title_en, slug")
        .eq("id", page.college_root_id)
        .maybeSingle();
      collegeTitle = college?.title_en ?? null;
      collegeSlug = college?.slug ?? null;
    }

    return {
      departmentPageId: data.department_page_id,
      departmentTitle: page.title_en,
      departmentSlug: page.slug,
      collegePageId: page.college_root_id,
      collegeTitle,
      collegeSlug,
      role: data.role as DepartmentPageRole,
    };
  },
);

/** College department pages (office_portal under a college) available for HOD assignment. */
export async function listDepartmentPagesForHodAssignment(
  session: AdminSession,
): Promise<
  {
    id: string;
    title_en: string;
    slug: string;
    college_root_id: string;
    college_title: string;
  }[]
> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.pages)
    .select("id, slug, title_en, college_root_id")
    .eq("layout_template", "office_portal")
    .not("college_root_id", "is", null);

  if (!isSuperAdminSession(session) && session.collegeAssignment) {
    query = query.eq("college_root_id", session.collegeAssignment.collegePageId);
  } else if (!isSuperAdminSession(session)) {
    return [];
  }

  const { data: pages } = await query.order("title_en");
  if (!pages?.length) return [];

  const filtered = pages.filter((p) => p.college_root_id && p.college_root_id !== p.id);
  const collegeIds = [...new Set(filtered.map((p) => p.college_root_id as string))];
  const { data: colleges } = await admin
    .from(Tables.pages)
    .select("id, title_en")
    .in("id", collegeIds);
  const collegeById = new Map((colleges ?? []).map((c) => [c.id, c.title_en]));

  return filtered
    .map((p) => ({
      id: p.id,
      title_en: p.title_en,
      slug: p.slug,
      college_root_id: p.college_root_id as string,
      college_title: collegeById.get(p.college_root_id as string) ?? "",
    }))
    .sort(
      (a, b) =>
        a.college_title.localeCompare(b.college_title) || a.title_en.localeCompare(b.title_en),
    );
}
