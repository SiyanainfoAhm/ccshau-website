import type { AdminSession } from "@/lib/auth/session";
import type { CmsModule } from "@/lib/database/types";

import {
  canEditPages,
  hasUniversityCmsRole,
  isCollegeOnlyUser,
  isSuperAdminSession,
  isUniversityAdminSession,
} from "./college-scope";

export type CmsPageAccessTarget = {
  pageId: string;
  collegeRootId: string | null;
  departmentId: string | null;
};

export type CmsPageAccessResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Pure CMS page-access rules used by `assertPageAccess`.
 * Pass `allowedCmsModules` when the session has university CMS roles
 * (null = unrestricted modules; array = department-module allow-list).
 */
export function evaluateCmsPageAccess(
  session: AdminSession,
  page: CmsPageAccessTarget,
  allowedCmsModules: CmsModule[] | null = null,
): CmsPageAccessResult {
  if (session.departmentPageAssignment) {
    if (session.departmentPageAssignment.departmentPageId !== page.pageId) {
      return {
        ok: false,
        reason: "You do not have permission to access this department page.",
      };
    }
    return { ok: true };
  }

  if (isCollegeOnlyUser(session)) {
    if (
      !page.collegeRootId ||
      session.collegeAssignment?.collegePageId !== page.collegeRootId
    ) {
      return {
        ok: false,
        reason: "You do not have permission to access this college page.",
      };
    }
    return { ok: true };
  }

  if (isSuperAdminSession(session) || isUniversityAdminSession(session)) {
    return { ok: true };
  }

  if (hasUniversityCmsRole(session)) {
    const strictDepartmentScope = Boolean(
      session.departmentId && allowedCmsModules !== null,
    );

    if (strictDepartmentScope) {
      if (page.departmentId !== session.departmentId) {
        return {
          ok: false,
          reason: "You do not have permission to access this page.",
        };
      }
      return { ok: true };
    }

    if (page.collegeRootId) return { ok: true };
    if (
      session.departmentId &&
      page.departmentId &&
      page.departmentId !== session.departmentId
    ) {
      return {
        ok: false,
        reason: "You do not have permission to access this page.",
      };
    }
    return { ok: true };
  }

  if (session.collegeAssignment) {
    if (page.collegeRootId !== session.collegeAssignment.collegePageId) {
      return {
        ok: false,
        reason: "You do not have permission to access this college page.",
      };
    }
    return { ok: true };
  }

  return { ok: false, reason: "You do not have permission to access this page." };
}

/** Mirrors createPageAction: HOD assignments cannot create pages. */
export function sessionCanCreateCmsPages(session: AdminSession): boolean {
  if (session.departmentPageAssignment) return false;
  return canEditPages(session);
}

/** College-only users may create only under their assigned college root. */
export function sessionCanCreateUnderCollegeRoot(
  session: AdminSession,
  collegeRootId: string | null,
): boolean {
  if (!isCollegeOnlyUser(session)) return true;
  return Boolean(
    collegeRootId &&
      session.collegeAssignment?.collegePageId === collegeRootId,
  );
}
