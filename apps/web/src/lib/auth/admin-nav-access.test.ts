/**
 * Tests for admin-nav-access: which admin routes a session may open
 * based on role, faculty-only status, and CMS module allow-list.
 */
import { describe, expect, it } from "vitest";

import {
  canAccessAdminPath,
  getAdminNavAccess,
} from "@/lib/auth/admin-nav-access";
import { mockAdminSession } from "@/lib/auth/test-session";

/* Role and path gates for getAdminNavAccess / canAccessAdminPath. */
describe("admin-nav-access", () => {
  // Super admin flags and unrestricted path checks both succeed.
  it("gives super admin full path access", () => {
    const session = mockAdminSession({ role: "super_admin" });
    const access = getAdminNavAccess(session);
    expect(access.isSuperAdmin).toBe(true);
    expect(canAccessAdminPath(access, "/admin/users")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/settings")).toBe(true);
  });

  // University admin can manage site content but not user-admin routes.
  it("blocks super-admin-only paths for university admin", () => {
    const session = mockAdminSession({ role: "university_admin" });
    const access = getAdminNavAccess(session);
    expect(access.canManageSiteStructure).toBe(true);
    expect(canAccessAdminPath(access, "/admin/homepage")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/users")).toBe(false);
  });

  // Faculty-only may hit dashboard and self profile; CMS pages stay closed.
  it("limits faculty-only users to dashboard and own profile", () => {
    const session = mockAdminSession({
      roles: [],
      primaryRole: null,
      facultyPerson: {
        id: "fp-1",
        nameEn: "Dr Test",
        email: "dr@ccshau.test",
      },
    });
    const access = getAdminNavAccess(session);
    expect(access.isFacultyOnly).toBe(true);
    expect(canAccessAdminPath(access, "/admin")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/register/faculty/me")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/pages")).toBe(false);
  });

  // Editor with pages-only allow-list can open pages but not tenders.
  it("enforces cms module allow-list on content paths", () => {
    const session = mockAdminSession({ role: "editor" });
    const access = getAdminNavAccess(session, ["pages"]);
    expect(canAccessAdminPath(access, "/admin/pages")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/tenders")).toBe(false);
  });
});
