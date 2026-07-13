import type { AdminSession } from "@/lib/auth/session";
import type { CmsModule } from "@/lib/database/types";

export const ALL_CMS_MODULES = [
  "pages",
  "news",
  "circulars",
  "tenders",
  "downloads",
  "media",
  "feedback",
] as const satisfies readonly CmsModule[];

/** Admin nav href → CMS module (content areas only). */
export const ADMIN_HREF_CMS_MODULE: Record<string, CmsModule> = {
  "/admin/pages": "pages",
  "/admin/news": "news",
  "/admin/circulars": "circulars",
  "/admin/tenders": "tenders",
  "/admin/downloads": "downloads",
  "/admin/media": "media",
  "/admin/feedback": "feedback",
};

export function cmsModuleForAdminPath(pathname: string): CmsModule | null {
  for (const [prefix, cmsModule] of Object.entries(ADMIN_HREF_CMS_MODULE)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return cmsModule;
    }
  }
  return null;
}

export function resolveSessionDepartmentId(session: AdminSession): string | null {
  if (session.departmentId) return session.departmentId;
  const scoped = session.roles.find((r) => r.departmentId);
  return scoped?.departmentId ?? null;
}

export function sessionCanAccessCmsModule(
  allowedModules: CmsModule[] | null,
  cmsModule: CmsModule,
): boolean {
  if (allowedModules === null) return true;
  return allowedModules.includes(cmsModule);
}

export function sessionCanAccessAdminPathModules(
  allowedModules: CmsModule[] | null,
  pathname: string,
): boolean {
  const cmsModule = cmsModuleForAdminPath(pathname);
  if (!cmsModule) return true;
  return sessionCanAccessCmsModule(allowedModules, cmsModule);
}
