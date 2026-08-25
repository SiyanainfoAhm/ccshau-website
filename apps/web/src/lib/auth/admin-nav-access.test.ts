import { describe, expect, it } from "vitest";

import {
  canAccessAdminPath,
  getAdminNavAccess,
} from "@/lib/auth/admin-nav-access";
import { mockAdminSession } from "@/lib/auth/test-session";

describe("admin-nav-access", () => {
  it("gives super admin full path access", () => {
    const session = mockAdminSession({ role: "super_admin" });
    const access = getAdminNavAccess(session);
    expect(access.isSuperAdmin).toBe(true);
    expect(canAccessAdminPath(access, "/admin/users")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/settings")).toBe(true);
  });

  it("blocks super-admin-only paths for university admin", () => {
    const session = mockAdminSession({ role: "university_admin" });
    const access = getAdminNavAccess(session);
    expect(access.canManageSiteStructure).toBe(true);
    expect(canAccessAdminPath(access, "/admin/homepage")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/users")).toBe(false);
  });

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

  it("enforces cms module allow-list on content paths", () => {
    const session = mockAdminSession({ role: "editor" });
    const access = getAdminNavAccess(session, ["pages"]);
    expect(canAccessAdminPath(access, "/admin/pages")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/tenders")).toBe(false);
  });
});
