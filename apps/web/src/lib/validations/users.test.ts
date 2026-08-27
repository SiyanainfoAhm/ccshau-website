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

describe("inviteUserSchema", () => {
  it("accepts a basic invite", () => {
    const result = inviteUserSchema.safeParse({
      email: "user@ccshau.ac.in",
      displayName: "New User",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

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

describe("assignRoleSchema", () => {
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

describe("updateUserSchema", () => {
  it("requires display name", () => {
    expect(
      updateUserSchema.safeParse({ displayName: "OK" }).success,
    ).toBe(true);
    expect(updateUserSchema.safeParse({ displayName: "A" }).success).toBe(
      false,
    );
  });
});

describe("assignCollegeSchema / assignDepartmentHodSchema", () => {
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
