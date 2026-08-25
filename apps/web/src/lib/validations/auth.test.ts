import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@ccshau.ac.in",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email and short password", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordResetRequestSchema", () => {
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

describe("passwordResetConfirmSchema", () => {
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

describe("changePasswordSchema", () => {
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
