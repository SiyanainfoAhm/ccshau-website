import { describe, expect, it } from "vitest";

import {
  canEditAssignedDepartmentPage,
  hasDepartmentPageAssignment,
  isDepartmentHodOnlyUser,
  sessionCanManageDepartmentHodAssignments,
} from "@/lib/auth/department-hod-scope";
import { mockAdminSession } from "@/lib/auth/test-session";

const hodAssignment = {
  departmentPageId: "dept-page-1",
  departmentTitle: "Agronomy",
  departmentSlug: "agronomy",
  collegePageId: "college-root-1",
  collegeTitle: "College of Agriculture",
  collegeSlug: "college-of-agriculture-hisar",
  role: "dept_hod" as const,
};

describe("department-hod-scope", () => {
  it("detects HOD-only users", () => {
    const hodOnly = mockAdminSession({
      roles: [],
      primaryRole: null,
      departmentPageAssignment: hodAssignment,
    });
    expect(hasDepartmentPageAssignment(hodOnly)).toBe(true);
    expect(isDepartmentHodOnlyUser(hodOnly)).toBe(true);
  });

  it("is not HOD-only when university CMS or college assignment exists", () => {
    const hodPlusEditor = mockAdminSession({
      role: "editor",
      departmentPageAssignment: hodAssignment,
    });
    expect(isDepartmentHodOnlyUser(hodPlusEditor)).toBe(false);

    const hodPlusCollege = mockAdminSession({
      roles: [],
      primaryRole: null,
      departmentPageAssignment: hodAssignment,
      collegeAssignment: {
        collegePageId: "college-root-1",
        collegeName: "COA",
        collegeSlug: "coa",
        role: "college_admin",
      },
    });
    expect(isDepartmentHodOnlyUser(hodPlusCollege)).toBe(false);
  });

  it("allows edit only for the assigned department page", () => {
    const hodOnly = mockAdminSession({
      roles: [],
      primaryRole: null,
      departmentPageAssignment: hodAssignment,
    });
    expect(canEditAssignedDepartmentPage(hodOnly, "dept-page-1")).toBe(true);
    expect(canEditAssignedDepartmentPage(hodOnly, "other-page")).toBe(false);
  });

  it("allows HOD assignment management for super admin and college admin", () => {
    expect(
      sessionCanManageDepartmentHodAssignments(
        mockAdminSession({ role: "super_admin" }),
      ),
    ).toBe(true);

    expect(
      sessionCanManageDepartmentHodAssignments(
        mockAdminSession({
          roles: [],
          primaryRole: null,
          collegeAssignment: {
            collegePageId: "college-root-1",
            collegeName: "COA",
            collegeSlug: "coa",
            role: "college_admin",
          },
        }),
      ),
    ).toBe(true);

    expect(
      sessionCanManageDepartmentHodAssignments(
        mockAdminSession({
          roles: [],
          primaryRole: null,
          collegeAssignment: {
            collegePageId: "college-root-1",
            collegeName: "COA",
            collegeSlug: "coa",
            role: "college_editor",
          },
        }),
      ),
    ).toBe(false);

    expect(
      sessionCanManageDepartmentHodAssignments(
        mockAdminSession({ role: "university_admin" }),
      ),
    ).toBe(false);
  });
});
