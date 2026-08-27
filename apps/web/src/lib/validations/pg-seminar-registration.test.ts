/**
 * Vitest coverage for pgSeminarRegistrationSchema and yes/no helpers:
 * minimal registration, date range order, foreigner/country rules.
 */
import { describe, expect, it } from "vitest";

import {
  parseYesNo,
  pgSeminarRegistrationSchema,
  yesNoToBoolean,
} from "@/lib/validations/pg-seminar-registration";

// Suite: PG seminar registration form validation.
describe("pgSeminarRegistrationSchema", () => {
  const base = {
    studentName: "Student One",
    admissionNumber: "A-100",
    durationFrom: "2026-01-01",
    durationTo: "2026-01-03",
  };

  // Accepts name, admission number, and ordered date range.
  it("accepts a minimal valid registration", () => {
    expect(pgSeminarRegistrationSchema.safeParse(base).success).toBe(true);
  });

  // Rejects when durationFrom is after durationTo.
  it("rejects inverted date range", () => {
    expect(
      pgSeminarRegistrationSchema.safeParse({
        ...base,
        durationFrom: "2026-01-05",
        durationTo: "2026-01-01",
      }).success,
    ).toBe(false);
  });

  // Foreigner yes requires countryName; with country accepts.
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

// Suite: yes/no parse and boolean conversion helpers.
describe("yes/no helpers", () => {
  // parseYesNo only allows yes/no; yesNoToBoolean maps yes/no/undefined.
  it("parses and converts yes/no values", () => {
    expect(parseYesNo("yes")).toBe("yes");
    expect(parseYesNo("maybe")).toBeUndefined();
    expect(yesNoToBoolean("yes")).toBe(true);
    expect(yesNoToBoolean("no")).toBe(false);
    expect(yesNoToBoolean(undefined)).toBeNull();
  });
});
