/**
 * Vitest coverage for collegeWizardSchema: academic college bootstrap
 * payload (title/slug/prefix/contact) and map coordinate bounds.
 */
import { describe, expect, it } from "vitest";

import { collegeWizardSchema } from "@/lib/validations/college-wizard";

// Suite: college creation wizard form validation.
describe("collegeWizardSchema", () => {
  const base = {
    titleEn: "College of Agriculture",
    slug: "college-of-agriculture-hisar",
    shortPrefix: "coa",
    addressEn: "CCSHAU Campus, Hisar",
    phone: "01662-123456",
    email: "coa@hau.ac.in",
  };

  // Accepts full payload; defaults blueprint and seedDefaultSections.
  it("accepts a valid academic college wizard payload", () => {
    const result = collegeWizardSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.micrositeBlueprint).toBe("academic_college");
      expect(result.data.seedDefaultSections).toBe(true);
    }
  });

  // Rejects bad slug, empty email, and out-of-range mapLat.
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
