/**
 * Vitest coverage for auth schemas: login, password reset request/confirm,
 * and change-password (match + differ-from-current rules).
 */
import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/lib/validations/auth";

// Suite: login email and password shape.
describe("loginSchema", () => {
  // Accepts well-formed email and password length.
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@ccshau.ac.in",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

  // Rejects invalid email and too-short password.
  it("rejects invalid email and short password", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

// Suite: password reset request email-only payload.
describe("passwordResetRequestSchema", () => {
  // Accepts valid email; rejects malformed email.
  it("requires a valid email", () => {
    expect(
      passwordResetRequestSchema.safeParse({ email: "ok@ccshau.ac.in" })
        .success,
    ).toBe(true);
    expect(
      passwordResetRequestSchema.safeParse({ email: "bad" }).success,
    ).toBe(false);
  });
});

// Suite: password reset confirm match rule.
describe("passwordResetConfirmSchema", () => {
  // Accepts matching pair; rejects mismatched confirm.
  it("requires matching passwords", () => {
    expect(
      passwordResetConfirmSchema.safeParse({
        password: "password1",
        confirmPassword: "password1",
      }).success,
    ).toBe(true);
    expect(
      passwordResetConfirmSchema.safeParse({
        password: "password1",
        confirmPassword: "password2",
      }).success,
    ).toBe(false);
  });
});

// Suite: change password match and not-same-as-current rules.
describe("changePasswordSchema", () => {
  // Accepts new!=current with match; rejects same-as-current or mismatch.
  it("requires match and different new password", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "password1",
        newPassword: "password2",
        confirmPassword: "password2",
      }).success,
    ).toBe(true);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: "password1",
        newPassword: "password1",
        confirmPassword: "password1",
      }).success,
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: "password1",
        newPassword: "password2",
        confirmPassword: "password3",
      }).success,
    ).toBe(false);
  });
});
