import {
  isReviewerOnlySession,
  isUniversityAdminSession,
  isViewerOnlySession,
  SETTINGS_ACCESS_ROLES,
  SITE_STRUCTURE_ACCESS_ROLES,
  sessionHasCmsRole,
} from "@/lib/auth/cms-roles";
import {
  cmsModuleForAdminPath,
  sessionCanAccessAdminPathModules,
  sessionCanAccessCmsModule,
} from "@/lib/auth/cms-module-access";
import { isCollegeOnlyUser, isSuperAdminSession } from "@/lib/auth/college-scope";
import { isDepartmentHodOnlyUser } from "@/lib/auth/department-hod-scope";
import { isFacultyOnlyUser } from "@/lib/auth/faculty-scope";
import type { AdminSession } from "@/lib/auth/session";
import type { CmsModule } from "@/lib/database/types";

export type AdminNavAccess = {
  isCollegeOnly: boolean;
  isDepartmentHodOnly: boolean;
  isFacultyOnly: boolean;
  hasFacultyPerson: boolean;
  isSuperAdmin: boolean;
  isUniversityAdmin: boolean;
  isDeptAdmin: boolean;
  isEditor: boolean;
  isReviewerOnly: boolean;
  isViewerOnly: boolean;
  canManageSiteStructure: boolean;
  /** `null` = all content modules; array = section-restricted allow-list. */
  allowedCmsModules: CmsModule[] | null;
};

export function getAdminNavAccess(
  session: AdminSession,
  allowedCmsModules: CmsModule[] | null = null,
): AdminNavAccess {
  const isSuperAdmin = isSuperAdminSession(session);
  const isUniversityAdmin = isUniversityAdminSession(session);
  const isDeptAdmin = session.roles.some((r) => r.role === "dept_admin");
  const isEditor = session.roles.some((r) => r.role === "editor");
  const isReviewerOnly = isReviewerOnlySession(session);
  const isViewerOnly = isViewerOnlySession(session);
  const canManageSiteStructure = sessionHasCmsRole(session, SITE_STRUCTURE_ACCESS_ROLES);

  return {
    isCollegeOnly: isCollegeOnlyUser(session),
    isDepartmentHodOnly: isDepartmentHodOnlyUser(session),
    isFacultyOnly: isFacultyOnlyUser(session),
    hasFacultyPerson: Boolean(session.facultyPerson),
    isSuperAdmin,
    isUniversityAdmin,
    isDeptAdmin,
    isEditor,
    isReviewerOnly,
    isViewerOnly,
    canManageSiteStructure,
    allowedCmsModules,
  };
}

const SUPER_ADMIN_ONLY_PREFIXES = [
  "/admin/users",
  "/admin/audit",
  "/admin/register",
  "/admin/pg-seminar-registrations",
  "/admin/colleges/new",
  "/admin/directorates/new",
  "/admin/settings/department-modules",
] as const;

const SETTINGS_PREFIXES = ["/admin/redirects", "/admin/settings"] as const;

const SITE_STRUCTURE_PREFIXES = [
  "/admin/banners",
  "/admin/homepage",
  "/admin/menus",
  "/admin/related-links",
] as const;

const READ_ONLY_LIST_PATHS = [
  "/admin",
  "/admin/reports",
  "/admin/pages",
  "/admin/news",
  "/admin/circulars",
  "/admin/tenders",
  "/admin/downloads",
  "/admin/feedback",
  "/admin/media",
] as const;

function canReadOnlyAccessPath(access: AdminNavAccess, pathname: string): boolean {
  if (pathname === "/admin") return true;
  if (pathname === "/admin/reports") return true;

  const cmsModule = cmsModuleForAdminPath(pathname);
  if (cmsModule && !sessionCanAccessCmsModule(access.allowedCmsModules, cmsModule)) {
    return false;
  }

  if ((READ_ONLY_LIST_PATHS as readonly string[]).includes(pathname)) return true;
  if (pathname.startsWith("/admin/pages/") && pathname !== "/admin/pages/new") return true;
  for (const prefix of READ_ONLY_LIST_PATHS) {
    if (prefix === "/admin/pages" || prefix === "/admin") continue;
    if (pathname.startsWith(`${prefix}/`) && !pathname.endsWith("/new")) return true;
  }
  return false;
}

function isCollegeOnlyPathAllowed(pathname: string): boolean {
  if (pathname === "/admin") return true;
  if (pathname.startsWith("/admin/register")) return true;
  return pathname.startsWith("/admin/pages");
}

/** Faculty: dashboard (redirects to profile) and own My profile page only. */
function isFacultyOnlyPathAllowed(pathname: string): boolean {
  if (pathname === "/admin") return true;
  if (pathname === "/admin/register/faculty/me") return true;
  return false;
}

/** Department HOD: dashboard, own department page, and own faculty profile only. */
function isDepartmentHodOnlyPathAllowed(pathname: string): boolean {
  if (pathname === "/admin") return true;
  if (pathname === "/admin/pages") return true;
  if (pathname.startsWith("/admin/pages/") && pathname !== "/admin/pages/new") return true;
  if (pathname === "/admin/register/faculty/me") return true;
  return false;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessAdminPath(access: AdminNavAccess, pathname: string): boolean {
  if (access.isFacultyOnly) {
    return isFacultyOnlyPathAllowed(pathname);
  }

  if (access.isDepartmentHodOnly) {
    return isDepartmentHodOnlyPathAllowed(pathname);
  }

  if (access.isCollegeOnly) {
    return isCollegeOnlyPathAllowed(pathname);
  }

  if (access.isSuperAdmin) return true;

  if (access.hasFacultyPerson && pathname === "/admin/register/faculty/me") {
    return true;
  }

  for (const prefix of SUPER_ADMIN_ONLY_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return false;
  }

  if (SETTINGS_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return access.isUniversityAdmin || access.isDeptAdmin;
  }

  if (!access.canManageSiteStructure) {
    for (const prefix of SITE_STRUCTURE_PREFIXES) {
      if (matchesPrefix(pathname, prefix)) return false;
    }
  }

  if (!sessionCanAccessAdminPathModules(access.allowedCmsModules, pathname)) {
    return false;
  }

  if (access.isReviewerOnly || access.isViewerOnly) {
    return canReadOnlyAccessPath(access, pathname);
  }

  if (matchesPrefix(pathname, "/admin/reports")) {
    return false;
  }

  return true;
}

export function canSeeAdminNavHref(access: AdminNavAccess, href: string): boolean {
  if (access.isFacultyOnly) {
    return isFacultyOnlyPathAllowed(href);
  }

  if (access.isDepartmentHodOnly) {
    return isDepartmentHodOnlyPathAllowed(href);
  }

  if (access.isCollegeOnly) {
    return isCollegeOnlyPathAllowed(href);
  }

  if (href === "/admin/redirects" || href === "/admin/settings") {
    return access.isSuperAdmin || access.isUniversityAdmin || access.isDeptAdmin;
  }

  if (href === "/admin/audit") {
    return access.isSuperAdmin;
  }

  if (!access.canManageSiteStructure) {
    for (const prefix of SITE_STRUCTURE_PREFIXES) {
      if (matchesPrefix(href, prefix)) return false;
    }
  }

  const cmsModule = cmsModuleForAdminPath(href);
  if (cmsModule && !sessionCanAccessCmsModule(access.allowedCmsModules, cmsModule)) {
    return false;
  }

  if (href === "/admin/reports") {
    return access.isReviewerOnly || access.isViewerOnly;
  }

  if (access.isReviewerOnly || access.isViewerOnly) {
    return canReadOnlyAccessPath(access, href);
  }

  return true;
}

export function sessionCanAccessSettings(session: AdminSession): boolean {
  return sessionHasCmsRole(session, SETTINGS_ACCESS_ROLES);
}
