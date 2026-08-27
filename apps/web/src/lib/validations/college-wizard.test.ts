import { describe, expect, it } from "vitest";

import { collegeWizardSchema } from "@/lib/validations/college-wizard";

describe("collegeWizardSchema", () => {
  const base = {
    titleEn: "College of Agriculture",
    slug: "college-of-agriculture-hisar",
    shortPrefix: "coa",
    addressEn: "CCSHAU Campus, Hisar",
    phone: "01662-123456",
    email: "coa@hau.ac.in",
  };

  it("accepts a valid academic college wizard payload", () => {
    const result = collegeWizardSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.micrositeBlueprint).toBe("academic_college");
      expect(result.data.seedDefaultSections).toBe(true);
    }
  });

  it("rejects bad slug / missing required contact fields", () => {
    expect(
      collegeWizardSchema.safeParse({
        ...base,
        slug: "Bad Slug",
      }).success,
    ).toBe(false);
    expect(
      collegeWizardSchema.safeParse({
        ...base,
        email: "",
      }).success,
    ).toBe(false);
    expect(
      collegeWizardSchema.safeParse({
        ...base,
        mapLat: 120,
      }).success,
    ).toBe(false);
  });
});
