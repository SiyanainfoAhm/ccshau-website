import { describe, expect, it } from "vitest";

import {
  assignExistingFacultySchema,
  registerDepartmentSchema,
  registerFacultySchema,
} from "@/lib/validations/college-register";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

describe("college-register schemas", () => {
  it("validates department registration", () => {
    expect(
      registerDepartmentSchema.safeParse({
        collegePageId: UUID,
        titleEn: "Agronomy",
        slug: "agronomy",
      }).success,
    ).toBe(true);
    expect(
      registerDepartmentSchema.safeParse({
        collegePageId: UUID,
        titleEn: "Agronomy",
        slug: "Bad Slug",
      }).success,
    ).toBe(false);
  });

  it("validates faculty registration and assignment", () => {
    expect(
      registerFacultySchema.safeParse({
        departmentPageId: UUID,
        memberType: "faculty",
        nameEn: "Dr Test",
        designationEn: "Professor",
        staffSlug: "dr-test",
      }).success,
    ).toBe(true);

    expect(
      assignExistingFacultySchema.safeParse({
        personId: UUID,
        departmentPageId: UUID_B,
        memberType: "hod",
        designationEn: "Head",
      }).success,
    ).toBe(true);
  });
});
