import { describe, expect, it } from "vitest";

import {
  parseYesNo,
  pgSeminarRegistrationSchema,
  yesNoToBoolean,
} from "@/lib/validations/pg-seminar-registration";

describe("pgSeminarRegistrationSchema", () => {
  const base = {
    studentName: "Student One",
    admissionNumber: "A-100",
    durationFrom: "2026-01-01",
    durationTo: "2026-01-03",
  };

  it("accepts a minimal valid registration", () => {
    expect(pgSeminarRegistrationSchema.safeParse(base).success).toBe(true);
  });

  it("rejects inverted date range", () => {
    expect(
      pgSeminarRegistrationSchema.safeParse({
        ...base,
        durationFrom: "2026-01-05",
        durationTo: "2026-01-01",
      }).success,
    ).toBe(false);
  });

  it("requires country when foreigner is yes", () => {
    expect(
      pgSeminarRegistrationSchema.safeParse({
        ...base,
        isForeigner: "yes",
      }).success,
    ).toBe(false);
    expect(
      pgSeminarRegistrationSchema.safeParse({
        ...base,
        isForeigner: "yes",
        countryName: "Nepal",
      }).success,
    ).toBe(true);
  });
});

describe("yes/no helpers", () => {
  it("parses and converts yes/no values", () => {
    expect(parseYesNo("yes")).toBe("yes");
    expect(parseYesNo("maybe")).toBeUndefined();
    expect(yesNoToBoolean("yes")).toBe(true);
    expect(yesNoToBoolean("no")).toBe(false);
    expect(yesNoToBoolean(undefined)).toBeNull();
  });
});
