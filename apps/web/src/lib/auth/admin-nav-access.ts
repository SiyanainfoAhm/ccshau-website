import { isCollegeOnlyUser, isSuperAdminSession } from "@/lib/auth/college-scope";
import type { AdminSession } from "@/lib/auth/session";

export type AdminNavAccess = {
  isCollegeOnly: boolean;
  isSuperAdmin: boolean;
  isDeptAdmin: boolean;
  isEditor: boolean;
  isViewerOnly: boolean;
};

export function getAdminNavAccess(session: AdminSession): AdminNavAccess {
  const isSuperAdmin = isSuperAdminSession(session);
  const isDeptAdmin = session.roles.some((r) => r.role === "dept_admin");
  const isEditor = session.roles.some((r) => r.role === "editor");
  const isViewerOnly =
    session.roles.some((r) => r.role === "viewer") &&
    !isSuperAdmin &&
    !isDeptAdmin &&
    !isEditor;

  return {
    isCollegeOnly: isCollegeOnlyUser(session),
    isSuperAdmin,
    isDeptAdmin,
    isEditor,
    isViewerOnly,
  };
}

const SUPER_ADMIN_ONLY_PREFIXES = [
  "/admin/users",
  "/admin/audit",
  "/admin/register",
  "/admin/pg-seminar-registrations",
  "/admin/colleges/new",
  "/admin/directorates/new",
] as const;

const DEPT_ADMIN_UP_PREFIXES = ["/admin/redirects", "/admin/settings"] as const;

const VIEWER_LIST_PATHS = [
  "/admin/pages",
  "/admin/news",
  "/admin/circulars",
  "/admin/tenders",
  "/admin/downloads",
  "/admin/feedback",
  "/admin/media",
] as const;

function canViewerAccessPath(pathname: string): boolean {
  if (pathname === "/admin") return true;
  if ((VIEWER_LIST_PATHS as readonly string[]).includes(pathname)) return true;
  if (pathname.startsWith("/admin/pages/") && pathname !== "/admin/pages/new") return true;
  for (const prefix of VIEWER_LIST_PATHS) {
    if (prefix === "/admin/pages") continue;
    if (pathname.startsWith(`${prefix}/`) && !pathname.endsWith("/new")) return true;
  }
  return false;
}

function isCollegeOnlyPathAllowed(pathname: string): boolean {
  if (pathname === "/admin") return true;
  if (pathname.startsWith("/admin/register")) return true;
  return pathname.startsWith("/admin/pages");
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessAdminPath(access: AdminNavAccess, pathname: string): boolean {
  if (access.isCollegeOnly) {
    return isCollegeOnlyPathAllowed(pathname);
  }

  if (access.isSuperAdmin) return true;

  for (const prefix of SUPER_ADMIN_ONLY_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return false;
  }

  if (DEPT_ADMIN_UP_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return access.isDeptAdmin;
  }

  if (access.isViewerOnly) {
    return canViewerAccessPath(pathname);
  }

  return true;
}

export function canSeeAdminNavHref(access: AdminNavAccess, href: string): boolean {
  if (access.isCollegeOnly) {
    return isCollegeOnlyPathAllowed(href);
  }

  if (href === "/admin/redirects" || href === "/admin/settings") {
    return access.isSuperAdmin || access.isDeptAdmin;
  }

  if (href === "/admin/audit") {
    return access.isSuperAdmin;
  }

  if (access.isViewerOnly) {
    return canViewerAccessPath(href);
  }

  return true;
}
