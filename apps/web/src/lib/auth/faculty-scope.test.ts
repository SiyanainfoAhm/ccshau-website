/**
 * Tests for faculty-scope: faculty-only session detection and whether
 * a user may edit their own faculty person record.
 */
import { describe, expect, it } from "vitest";

import {
  canEditOwnFacultyPerson,
  isFacultyOnlyUser,
  isOwnFacultyProfileOnlyUser,
} from "@/lib/auth/faculty-scope";
import { mockAdminSession } from "@/lib/auth/test-session";

/* Faculty-only flags and own-person edit checks. */
describe("faculty-scope", () => {
  // Faculty person with no CMS roles is faculty-only and may edit only self.
  it("detects faculty-only users", () => {
    const faculty = mockAdminSession({
      roles: [],
      primaryRole: null,
      facultyPerson: {
        id: "fp-1",
        nameEn: "Dr Test",
        email: "dr@ccshau.test",
      },
    });
    expect(isFacultyOnlyUser(faculty)).toBe(true);
    expect(isOwnFacultyProfileOnlyUser(faculty)).toBe(true);
    expect(canEditOwnFacultyPerson(faculty, "fp-1")).toBe(true);
    expect(canEditOwnFacultyPerson(faculty, "fp-other")).toBe(false);
  });

  // University CMS role alongside faculty person clears faculty-only.
  it("is not faculty-only when university cms role exists", () => {
    const editorFaculty = mockAdminSession({
      role: "editor",
      facultyPerson: {
        id: "fp-1",
        nameEn: "Dr Test",
        email: "dr@ccshau.test",
      },
    });
    expect(isFacultyOnlyUser(editorFaculty)).toBe(false);
  });
});
