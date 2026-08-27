/**
 * Vitest coverage for college-register schemas: department registration,
 * faculty registration, and assign-existing-faculty payloads.
 */
import { describe, expect, it } from "vitest";

import {
  assignExistingFacultySchema,
  registerDepartmentSchema,
  registerFacultySchema,
} from "@/lib/validations/college-register";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

// Suite: college register department and faculty forms.
describe("college-register schemas", () => {
  // Accepts kebab slug; rejects spaced/invalid slug.
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

  // Accepts new faculty register and existing faculty assignment.
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
