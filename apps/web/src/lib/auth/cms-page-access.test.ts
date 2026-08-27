/**
 * Smoke tests for cms-page-access (and related nav gates): who may open,
 * create, or navigate to CMS pages under college / HOD / university scope.
 */
import { describe, expect, it } from "vitest";

import {
  canAccessAdminPath,
  getAdminNavAccess,
} from "@/lib/auth/admin-nav-access";
import {
  evaluateCmsPageAccess,
  sessionCanCreateCmsPages,
  sessionCanCreateUnderCollegeRoot,
} from "@/lib/auth/cms-page-access";
import { mockAdminSession } from "@/lib/auth/test-session";

const COLLEGE_A = "college-root-a";
const COLLEGE_B = "college-root-b";
const DEPT_PAGE = "dept-page-1";
const OTHER_PAGE = "other-page";
const DEPT_A = "dept-a";
const DEPT_B = "dept-b";

const collegeAssignmentA = {
  collegePageId: COLLEGE_A,
  collegeName: "College A",
  collegeSlug: "college-a",
  role: "college_admin" as const,
};

const hodAssignment = {
  departmentPageId: DEPT_PAGE,
  departmentTitle: "Agronomy",
  departmentSlug: "agronomy",
  collegePageId: COLLEGE_A,
  collegeTitle: "College A",
  collegeSlug: "college-a",
  role: "dept_hod" as const,
};

function page(
  overrides: Partial<{
    pageId: string;
    collegeRootId: string | null;
    departmentId: string | null;
  }> = {},
) {
  return {
    pageId: OTHER_PAGE,
    collegeRootId: null as string | null,
    departmentId: null as string | null,
    ...overrides,
  };
}

/* evaluateCmsPageAccess for HOD, college-only, editor, and elevated roles. */
describe("CMS scope smoke — page access", () => {
  // HOD may open assigned dept page only; sibling pages in same college fail.
  it("HOD can only open assigned department page", () => {
    const hod = mockAdminSession({
      roles: [],
      primaryRole: null,
      departmentPageAssignment: hodAssignment,
    });

    expect(
      evaluateCmsPageAccess(hod, page({ pageId: DEPT_PAGE, collegeRootId: COLLEGE_A }))
        .ok,
    ).toBe(true);
    expect(
      evaluateCmsPageAccess(
        hod,
        page({ pageId: OTHER_PAGE, collegeRootId: COLLEGE_A }),
      ).ok,
    ).toBe(false);
  });

  // College-only: assigned college OK; other college and university pages denied.
  it("college-only admin can only open pages in assigned college", () => {
    const collegeOnly = mockAdminSession({
      roles: [],
      primaryRole: null,
      collegeAssignment: collegeAssignmentA,
    });

    expect(
      evaluateCmsPageAccess(
        collegeOnly,
        page({ pageId: "section-1", collegeRootId: COLLEGE_A }),
      ).ok,
    ).toBe(true);
    expect(
      evaluateCmsPageAccess(
        collegeOnly,
        page({ pageId: "section-2", collegeRootId: COLLEGE_B }),
      ).ok,
    ).toBe(false);
    expect(
      evaluateCmsPageAccess(
        collegeOnly,
        page({ pageId: "uni-page", collegeRootId: null }),
      ).ok,
    ).toBe(false);
  });

  // University editor reaches college pages; strict dept allow-list blocks other depts.
  it("university editor can open college pages; strict dept scope blocks other depts", () => {
    const editor = mockAdminSession({
      role: "editor",
      departmentId: DEPT_A,
    });

    expect(
      evaluateCmsPageAccess(
        editor,
        page({ pageId: "coa-about", collegeRootId: COLLEGE_A }),
      ).ok,
    ).toBe(true);

    expect(
      evaluateCmsPageAccess(
        editor,
        page({ pageId: "dept-page", departmentId: DEPT_B }),
        ["pages"],
      ).ok,
    ).toBe(false);

    expect(
      evaluateCmsPageAccess(
        editor,
        page({ pageId: "dept-page", departmentId: DEPT_A }),
        ["pages"],
      ).ok,
    ).toBe(true);
  });

  // Elevated university roles bypass college/department page scope.
  it("super admin and university admin can open any page", () => {
    const target = page({
      pageId: "any",
      collegeRootId: COLLEGE_B,
      departmentId: DEPT_B,
    });
    expect(
      evaluateCmsPageAccess(mockAdminSession({ role: "super_admin" }), target)
        .ok,
    ).toBe(true);
    expect(
      evaluateCmsPageAccess(
        mockAdminSession({ role: "university_admin" }),
        target,
      ).ok,
    ).toBe(true);
  });

  // Faculty person alone without CMS roles cannot open CMS pages.
  it("faculty-only session without page roles is denied", () => {
    const faculty = mockAdminSession({
      roles: [],
      primaryRole: null,
      facultyPerson: {
        id: "fp-1",
        nameEn: "Dr Test",
        email: "dr@ccshau.test",
      },
    });
    expect(
      evaluateCmsPageAccess(faculty, page({ pageId: DEPT_PAGE })).ok,
    ).toBe(false);
  });
});

/* sessionCanCreateCmsPages and college-root create constraints. */
describe("CMS scope smoke — create pages", () => {
  // HOD and viewer cannot create; college editor can.
  it("blocks HOD from creating pages; allows college editor", () => {
    const hod = mockAdminSession({
      roles: [],
      primaryRole: null,
      departmentPageAssignment: hodAssignment,
    });
    expect(sessionCanCreateCmsPages(hod)).toBe(false);

    const collegeEditor = mockAdminSession({
      roles: [],
      primaryRole: null,
      collegeAssignment: {
        ...collegeAssignmentA,
        role: "college_editor",
      },
    });
    expect(sessionCanCreateCmsPages(collegeEditor)).toBe(true);
    expect(sessionCanCreateCmsPages(mockAdminSession({ role: "viewer" }))).toBe(
      false,
    );
  });

  // College-only create locked to assigned root; university editor may use any root.
  it("college-only create must stay under assigned college root", () => {
    const collegeOnly = mockAdminSession({
      roles: [],
      primaryRole: null,
      collegeAssignment: collegeAssignmentA,
    });
    expect(sessionCanCreateUnderCollegeRoot(collegeOnly, COLLEGE_A)).toBe(true);
    expect(sessionCanCreateUnderCollegeRoot(collegeOnly, COLLEGE_B)).toBe(
      false,
    );
    expect(sessionCanCreateUnderCollegeRoot(collegeOnly, null)).toBe(false);

    const uniEditor = mockAdminSession({ role: "editor" });
    expect(sessionCanCreateUnderCollegeRoot(uniEditor, COLLEGE_B)).toBe(true);
  });
});

/* Admin nav path limits for college-only and HOD-only sessions. */
describe("CMS scope smoke — admin nav paths", () => {
  // College-only: pages and register open; tenders and users stay closed.
  it("limits college-only users to pages + register", () => {
    const access = getAdminNavAccess(
      mockAdminSession({
        roles: [],
        primaryRole: null,
        collegeAssignment: collegeAssignmentA,
      }),
    );
    expect(access.isCollegeOnly).toBe(true);
    expect(canAccessAdminPath(access, "/admin/pages")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/pages/new")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/register")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/tenders")).toBe(false);
    expect(canAccessAdminPath(access, "/admin/users")).toBe(false);
  });

  // HOD-only: list/edit assigned page and self faculty; no new page or news.
  it("limits HOD-only users to pages list/edit and own faculty profile", () => {
    const access = getAdminNavAccess(
      mockAdminSession({
        roles: [],
        primaryRole: null,
        departmentPageAssignment: hodAssignment,
      }),
    );
    expect(access.isDepartmentHodOnly).toBe(true);
    expect(canAccessAdminPath(access, "/admin/pages")).toBe(true);
    expect(canAccessAdminPath(access, `/admin/pages/${DEPT_PAGE}`)).toBe(true);
    expect(canAccessAdminPath(access, "/admin/pages/new")).toBe(false);
    expect(canAccessAdminPath(access, "/admin/register/faculty/me")).toBe(true);
    expect(canAccessAdminPath(access, "/admin/register")).toBe(false);
    expect(canAccessAdminPath(access, "/admin/news")).toBe(false);
  });
});
