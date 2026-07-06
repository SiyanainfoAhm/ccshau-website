import type { AdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { CollegeScopeRole, Page, UserRole } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CollegeAssignment {
  collegePageId: string;
  collegeName: string;
  collegeSlug: string;
  role: CollegeScopeRole;
}

const UNIVERSITY_CMS_ROLES: UserRole[] = ["super_admin", "dept_admin", "editor", "viewer"];
const COLLEGE_EDIT_ROLES: CollegeScopeRole[] = ["college_admin", "college_editor"];
const COLLEGE_PUBLISH_ROLES: CollegeScopeRole[] = ["college_admin"];

export function isSuperAdminSession(session: AdminSession): boolean {
  return session.roles.some((r) => r.role === "super_admin");
}

export function hasUniversityCmsRole(session: AdminSession): boolean {
  return session.roles.some((r) => UNIVERSITY_CMS_ROLES.includes(r.role));
}

export function isCollegeScopedUser(session: AdminSession): boolean {
  return Boolean(session.collegeAssignment);
}

export function isCollegeOnlyUser(session: AdminSession): boolean {
  return isCollegeScopedUser(session) && !isSuperAdminSession(session) && !hasUniversityCmsRole(session);
}

export function canAccessAdmin(session: AdminSession): boolean {
  return isSuperAdminSession(session) || hasUniversityCmsRole(session) || isCollegeScopedUser(session);
}

export function canEditPages(session: AdminSession): boolean {
  if (isSuperAdminSession(session)) return true;
  if (session.roles.some((r) => ["dept_admin", "editor"].includes(r.role))) return true;
  if (session.collegeAssignment && COLLEGE_EDIT_ROLES.includes(session.collegeAssignment.role)) {
    return true;
  }
  return false;
}

export function canPublishPages(session: AdminSession): boolean {
  if (isSuperAdminSession(session)) return true;
  if (session.roles.some((r) => r.role === "dept_admin")) return true;
  if (
    session.collegeAssignment &&
    COLLEGE_PUBLISH_ROLES.includes(session.collegeAssignment.role)
  ) {
    return true;
  }
  return false;
}

export function canDeletePages(session: AdminSession): boolean {
  if (isSuperAdminSession(session)) return true;
  if (session.roles.some((r) => r.role === "dept_admin")) return true;
  if (session.collegeAssignment?.role === "college_admin") return true;
  return false;
}

export function canCreateCollegeRoot(session: AdminSession): boolean {
  return isSuperAdminSession(session);
}

export async function getCollegeAssignmentForUser(
  userId: string,
): Promise<CollegeAssignment | null> {
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
}

export async function getPageCollegeRootId(page: Pick<Page, "id" | "college_root_id">): Promise<string | null> {
  if (page.college_root_id) return page.college_root_id;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.rpc("ccshau_resolve_college_root_id", { p_page_id: page.id });
  return (data as string | null) ?? null;
}

export function sessionCanAccessCollegeRoot(session: AdminSession, collegeRootId: string | null): boolean {
  if (!collegeRootId) return isSuperAdminSession(session) || hasUniversityCmsRole(session);
  if (isSuperAdminSession(session)) return true;
  if (hasUniversityCmsRole(session) && !isCollegeOnlyUser(session)) return true;
  return session.collegeAssignment?.collegePageId === collegeRootId;
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

  if (isCollegeOnlyUser(session)) {
    if (!collegeRootId || session.collegeAssignment?.collegePageId !== collegeRootId) {
      throw new Error("You do not have permission to access this college page.");
    }
    return page;
  }

  if (isSuperAdminSession(session)) return page;

  if (hasUniversityCmsRole(session)) {
    if (collegeRootId) return page;
    if (session.departmentId && page.department_id && page.department_id !== session.departmentId) {
      throw new Error("You do not have permission to access this page.");
    }
    return page;
  }

  if (session.collegeAssignment) {
    if (collegeRootId !== session.collegeAssignment.collegePageId) {
      throw new Error("You do not have permission to access this college page.");
    }
    return page;
  }

  throw new Error("You do not have permission to access this page.");
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
