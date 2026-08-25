import { describe, expect, it } from "vitest";

import { publicFeedbackSchema } from "@/lib/validations/public-feedback";

const deptId = "11111111-1111-4111-8111-111111111111";

const baseFeedback = {
  submitterName: "Ravi Kumar",
  email: "ravi@example.com",
  departmentId: deptId,
  subject: "Website feedback",
  message: "Please update the contact number on the page.",
};

describe("publicFeedbackSchema", () => {
  it("accepts valid public feedback", () => {
    expect(publicFeedbackSchema.safeParse(baseFeedback).success).toBe(true);
  });

  it("requires name, email, department, subject, and message length", () => {
    expect(
      publicFeedbackSchema.safeParse({ ...baseFeedback, submitterName: "A" })
        .success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({ ...baseFeedback, email: "bad" }).success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({
        ...baseFeedback,
        departmentId: "not-uuid",
      }).success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({ ...baseFeedback, subject: "Hi" }).success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({ ...baseFeedback, message: "Too short" })
        .success,
    ).toBe(false);
  });
});
