/**
 * Tests for cms-roles: CMS capability helpers (edit, publish, scope) and
 * session role classification (viewer/reviewer/university-wide).
 */
import { describe, expect, it } from "vitest";

import {
  canActOnDepartmentContent,
  canEditContent,
  canPublishContent,
  isReviewerOnlySession,
  isUniversityWideCmsSession,
  isViewerOnlySession,
  resolveScopedDepartmentId,
  sessionHasCmsRole,
} from "@/lib/auth/cms-roles";
import { mockAdminSession } from "@/lib/auth/test-session";

/* Role membership, edit/publish gates, and department content scope. */
describe("cms-roles", () => {
  // Membership check is true only when at least one listed role is present.
  it("detects role membership", () => {
    const editor = mockAdminSession({ role: "editor" });
    expect(sessionHasCmsRole(editor, ["editor", "dept_admin"])).toBe(true);
    expect(sessionHasCmsRole(editor, ["super_admin"])).toBe(false);
  });

  // Editors may draft/edit content but cannot publish.
  it("allows editors to edit but not publish", () => {
    const editor = mockAdminSession({ role: "editor" });
    expect(canEditContent(editor)).toBe(true);
    expect(canPublishContent(editor)).toBe(false);
  });

  // Reviewers publish without edit rights and count as reviewer-only.
  it("allows reviewers to publish but not edit", () => {
    const reviewer = mockAdminSession({ role: "reviewer" });
    expect(canPublishContent(reviewer)).toBe(true);
    expect(canEditContent(reviewer)).toBe(false);
    expect(isReviewerOnlySession(reviewer)).toBe(true);
  });

  // University admin is university-wide and can both edit and publish.
  it("treats university admins as university-wide", () => {
    const uni = mockAdminSession({ role: "university_admin" });
    expect(isUniversityWideCmsSession(uni)).toBe(true);
    expect(canPublishContent(uni)).toBe(true);
    expect(canEditContent(uni)).toBe(true);
  });

  // Dept-scoped editor acts only on own dept; resolve forces scoped id.
  it("scopes department content for dept editors", () => {
    const scoped = mockAdminSession({
      role: "editor",
      departmentId: "dept-a",
      roles: [{ role: "editor", departmentId: "dept-a" }],
    });
    expect(canActOnDepartmentContent(scoped, "dept-a")).toBe(true);
    expect(canActOnDepartmentContent(scoped, "dept-b")).toBe(false);
    expect(resolveScopedDepartmentId(scoped, "dept-b")).toBe("dept-a");
  });

  // Viewer-only sessions cannot edit content.
  it("detects viewer-only sessions", () => {
    const viewer = mockAdminSession({ role: "viewer" });
    expect(isViewerOnlySession(viewer)).toBe(true);
    expect(canEditContent(viewer)).toBe(false);
  });
});
