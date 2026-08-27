/**
 * Vitest coverage for user admin schemas: invite, role assignment,
 * profile update, college assignment, and department HOD assignment.
 */
import { describe, expect, it } from "vitest";

import {
  assignCollegeSchema,
  assignDepartmentHodSchema,
  assignRoleSchema,
  inviteUserSchema,
  updateUserSchema,
} from "@/lib/validations/users";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

// Suite: invite-user form validation.
describe("inviteUserSchema", () => {
  // Accepts email, display name, and password without college fields.
  it("accepts a basic invite", () => {
    const result = inviteUserSchema.safeParse({
      email: "user@ccshau.ac.in",
      displayName: "New User",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

  // College page and college role must be provided together.
  it("requires college role and college together", () => {
    expect(
      inviteUserSchema.safeParse({
        email: "user@ccshau.ac.in",
        displayName: "New User",
        password: "password1",
        collegePageId: UUID,
      }).success,
    ).toBe(false);

    expect(
      inviteUserSchema.safeParse({
        email: "user@ccshau.ac.in",
        displayName: "New User",
        password: "password1",
        collegeRole: "college_admin",
      }).success,
    ).toBe(false);

    expect(
      inviteUserSchema.safeParse({
        email: "user@ccshau.ac.in",
        displayName: "New User",
        password: "password1",
        collegePageId: UUID,
        collegeRole: "college_editor",
      }).success,
    ).toBe(true);
  });
});

// Suite: role assignment department scoping rules.
describe("assignRoleSchema", () => {
  // Scoped roles require departmentId.
  it("requires department for scoped roles", () => {
    expect(
      assignRoleSchema.safeParse({ role: "editor" }).success,
    ).toBe(false);
    expect(
      assignRoleSchema.safeParse({
        role: "editor",
        departmentId: UUID,
      }).success,
    ).toBe(true);
  });

  // University-wide roles reject departmentId.
  it("rejects department on university-wide roles", () => {
    expect(
      assignRoleSchema.safeParse({
        role: "super_admin",
        departmentId: UUID,
      }).success,
    ).toBe(false);
    expect(
      assignRoleSchema.safeParse({ role: "university_admin" }).success,
    ).toBe(true);
  });
});

// Suite: user profile update display-name rules.
describe("updateUserSchema", () => {
  // Accepts sufficient displayName; rejects too-short name.
  it("requires display name", () => {
    expect(
      updateUserSchema.safeParse({ displayName: "OK" }).success,
    ).toBe(true);
    expect(updateUserSchema.safeParse({ displayName: "A" }).success).toBe(
      false,
    );
  });
});

// Suite: college and HOD assignment UUID requirements.
describe("assignCollegeSchema / assignDepartmentHodSchema", () => {
  // Accepts valid UUIDs; rejects non-UUID or empty department page id.
  it("requires valid uuids", () => {
    expect(
      assignCollegeSchema.safeParse({
        collegePageId: UUID,
        collegeRole: "college_admin",
      }).success,
    ).toBe(true);
    expect(
      assignCollegeSchema.safeParse({
        collegePageId: "not-a-uuid",
        collegeRole: "college_admin",
      }).success,
    ).toBe(false);

    expect(
      assignDepartmentHodSchema.safeParse({
        departmentPageId: UUID_B,
      }).success,
    ).toBe(true);
    expect(
      assignDepartmentHodSchema.safeParse({ departmentPageId: "" }).success,
    ).toBe(false);
  });
});
