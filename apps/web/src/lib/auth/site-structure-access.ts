import { SITE_STRUCTURE_ACCESS_ROLES } from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export async function requireSiteStructureOrRedirect() {
  return requireAdminWithRolesOrRedirect([...SITE_STRUCTURE_ACCESS_ROLES]);
}
