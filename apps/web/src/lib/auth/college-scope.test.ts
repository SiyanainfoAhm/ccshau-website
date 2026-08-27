/**
 * Tests for college-scope: college vs university session classification and
 * page/content capability gates tied to college assignment.
 */
import { describe, expect, it } from "vitest";

import {
  canAccessAdmin,
  canCreateCollegeRoot,
  canDeletePages,
  canEditPages,
  canManageUniversityContent,
  canPublishPages,
  hasUniversityCmsRole,
  isCollegeOnlyUser,
  isCollegeScopedUser,
  isSuperAdminSession,
  isUniversityAdminSession,
  sessionCanAccessCollegeRoot,
  universityCmsPageListOrFilter,
} from "@/lib/auth/college-scope";
import { mockAdminSession } from "@/lib/auth/test-session";

const collegeAssignment = {
  collegePageId: "college-root-1",
  collegeName: "College of Agriculture",
  collegeSlug: "college-of-agriculture-hisar",
  role: "college_admin" as const,
};

const collegeEditorAssignment = {
  ...collegeAssignment,
  role: "college_editor" as const,
};

/* Session classifiers and college/university capability gates. */
describe("college-scope", () => {
  // Super/uni admin flags and university CMS role detection.
  it("detects super and university admin sessions", () => {
    const superAdmin = mockAdminSession({ role: "super_admin" });
    const uniAdmin = mockAdminSession({ role: "university_admin" });
    const editor = mockAdminSession({ role: "editor" });

    expect(isSuperAdminSession(superAdmin)).toBe(true);
    expect(isUniversityAdminSession(uniAdmin)).toBe(true);
    expect(isUniversityAdminSession(editor)).toBe(false);
    expect(hasUniversityCmsRole(editor)).toBe(true);
  });

  // College assignment alone is college-only; adding university role clears that.
  it("detects college-only users without university CMS roles", () => {
    const collegeOnly = mockAdminSession({
      roles: [],
      primaryRole: null,
      collegeAssignment,
    });
    expect(isCollegeScopedUser(collegeOnly)).toBe(true);
    expect(isCollegeOnlyUser(collegeOnly)).toBe(true);

    const collegePlusEditor = mockAdminSession({
      role: "editor",
      collegeAssignment,
    });
    expect(isCollegeOnlyUser(collegePlusEditor)).toBe(false);
  });

  // CMS, college, HOD, or faculty sessions enter admin; empty session does not.
  it("allows admin access for CMS, college, HOD, or faculty sessions", () => {
    expect(canAccessAdmin(mockAdminSession({ role: "viewer" }))).toBe(true);
    expect(
      canAccessAdmin(
        mockAdminSession({
          roles: [],
          primaryRole: null,
          collegeAssignment,
        }),
      ),
    ).toBe(true);
    expect(
      canAccessAdmin(
        mockAdminSession({
          roles: [],
          primaryRole: null,
          departmentPageAssignment: {
            departmentPageId: "dept-page-1",
            departmentTitle: "Agronomy",
            departmentSlug: "agronomy",
            collegePageId: "college-root-1",
            collegeTitle: "COA",
            collegeSlug: "coa",
            role: "dept_hod",
          },
        }),
      ),
    ).toBe(true);
    expect(
      canAccessAdmin(
        mockAdminSession({
          roles: [],
          primaryRole: null,
          facultyPerson: {
            id: "fp-1",
            nameEn: "Dr Test",
            email: "dr@ccshau.test",
          },
        }),
      ),
    ).toBe(true);
    expect(
      canAccessAdmin(
        mockAdminSession({ roles: [], primaryRole: null }),
      ),
    ).toBe(false);
  });

  // Per-role matrix for edit, publish, delete, and university content.
  it("gates edit / publish / delete / university content by role", () => {
    const editor = mockAdminSession({ role: "editor" });
    const reviewer = mockAdminSession({ role: "reviewer" });
    const viewer = mockAdminSession({ role: "viewer" });
    const collegeAdmin = mockAdminSession({
      roles: [],
      primaryRole: null,
      collegeAssignment,
    });
    const collegeEditor = mockAdminSession({
      roles: [],
      primaryRole: null,
      collegeAssignment: collegeEditorAssignment,
    });

    expect(canEditPages(editor)).toBe(true);
    expect(canPublishPages(editor)).toBe(false);
    expect(canDeletePages(editor)).toBe(false);
    expect(canManageUniversityContent(editor)).toBe(true);

    expect(canEditPages(reviewer)).toBe(false);
    expect(canPublishPages(reviewer)).toBe(true);
    expect(canManageUniversityContent(reviewer)).toBe(false);

    expect(canEditPages(viewer)).toBe(false);
    expect(canPublishPages(viewer)).toBe(false);

    expect(canEditPages(collegeAdmin)).toBe(true);
    expect(canPublishPages(collegeAdmin)).toBe(true);
    expect(canDeletePages(collegeAdmin)).toBe(true);
    expect(canManageUniversityContent(collegeAdmin)).toBe(false);

    expect(canEditPages(collegeEditor)).toBe(true);
    expect(canPublishPages(collegeEditor)).toBe(false);
    expect(canDeletePages(collegeEditor)).toBe(false);
  });

  // Only super admin may create a new college root page.
  it("restricts college root creation to super admins", () => {
    expect(canCreateCollegeRoot(mockAdminSession({ role: "super_admin" }))).toBe(
      true,
    );
    expect(
      canCreateCollegeRoot(mockAdminSession({ role: "university_admin" })),
    ).toBe(false);
  });

  // College-only limited to assigned root; university editor unrestricted.
  it("scopes college root access to assigned college for college-only users", () => {
    const collegeOnly = mockAdminSession({
      roles: [],
      primaryRole: null,
      collegeAssignment,
    });
    expect(sessionCanAccessCollegeRoot(collegeOnly, "college-root-1")).toBe(
      true,
    );
    expect(sessionCanAccessCollegeRoot(collegeOnly, "other-college")).toBe(
      false,
    );

    const uniEditor = mockAdminSession({ role: "editor" });
    expect(sessionCanAccessCollegeRoot(uniEditor, "any-college")).toBe(true);
    expect(sessionCanAccessCollegeRoot(uniEditor, null)).toBe(true);

    const noRole = mockAdminSession({ roles: [], primaryRole: null });
    expect(sessionCanAccessCollegeRoot(noRole, null)).toBe(false);
  });

  // Filter string covers assigned dept, null dept, and any college root.
  it("builds university CMS page list OR filter", () => {
    expect(universityCmsPageListOrFilter("dept-a")).toBe(
      "department_id.eq.dept-a,department_id.is.null,college_root_id.not.is.null",
    );
  });
});
