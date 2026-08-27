import { cache } from "react";

import { getAllowedCmsModulesForSession } from "@/lib/auth/cms-module-access-server";
import type { AdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { CollegeScopeRole, Page } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  hasUniversityCmsRole,
  isCollegeOnlyUser,
  isSuperAdminSession,
  isUniversityAdminSession,
  type CollegeAssignment,
} from "./college-scope";
import { evaluateCmsPageAccess } from "./cms-page-access";

export type { CollegeAssignment };

export const getCollegeAssignmentForUser = cache(
  async (userId: string): Promise<CollegeAssignment | null> => {
    const admin = createAdminClient();
    if (!admin) return null;

    const { data } = await admin
      .from(Tables.userColleges)
      .select("college_page_id, role, college:college_page_id (title_en, slug)")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) return null;

    const college = data.college as unknown as { title_en: string; slug: string } | null;
    if (!college) return null;

    return {
      collegePageId: data.college_page_id,
      collegeName: college.title_en,
      collegeSlug: college.slug,
      role: data.role as CollegeScopeRole,
    };
  },
);

export async function getPageCollegeRootId(page: Pick<Page, "id" | "college_root_id">): Promise<string | null> {
  if (page.college_root_id) return page.college_root_id;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.rpc("ccshau_resolve_college_root_id", { p_page_id: page.id });
  return (data as string | null) ?? null;
}

export async function assertPageAccess(
  session: AdminSession,
  pageId: string,
): Promise<Page> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Database not configured.");

  const { data, error } = await admin.from(Tables.pages).select("*").eq("id", pageId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Page not found.");

  const page = data as Page;
  const collegeRootId = page.college_root_id ?? (await getPageCollegeRootId(page));

  let allowedCmsModules: Awaited<ReturnType<typeof getAllowedCmsModulesForSession>> = null;
  if (
    !session.departmentPageAssignment &&
    !isCollegeOnlyUser(session) &&
    !isSuperAdminSession(session) &&
    !isUniversityAdminSession(session) &&
    hasUniversityCmsRole(session)
  ) {
    allowedCmsModules = await getAllowedCmsModulesForSession(session);
  }

  const access = evaluateCmsPageAccess(
    session,
    {
      pageId: page.id,
      collegeRootId,
      departmentId: page.department_id,
    },
    allowedCmsModules,
  );

  if (!access.ok) {
    throw new Error(access.reason);
  }

  return page;
}

export async function listCollegesForAdmin(): Promise<
  { id: string; slug: string; title_en: string; title_hi: string | null }[]
> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: container } = await admin
    .from(Tables.pages)
    .select("id")
    .eq("slug", "colleges")
    .maybeSingle();

  if (!container) return [];

  const { data } = await admin
    .from(Tables.pages)
    .select("id, slug, title_en, title_hi")
    .eq("parent_id", container.id)
    .eq("page_type", "college")
    .order("title_en");

  return data ?? [];
}
