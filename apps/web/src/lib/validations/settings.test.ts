import { describe, expect, it } from "vitest";

import {
  securitySettingsSchema,
  socialMediaSettingsSchema,
} from "@/lib/validations/settings";

describe("securitySettingsSchema", () => {
  it("accepts boolean flags (coerce treats non-empty strings as true)", () => {
    const parsed = securitySettingsSchema.safeParse({
      captchaEnabled: true,
      emailEnabled: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        captchaEnabled: true,
        emailEnabled: false,
      });
    }

    // z.coerce.boolean(): Boolean("false") === true
    const coerced = securitySettingsSchema.safeParse({
      captchaEnabled: "true",
      emailEnabled: "false",
    });
    expect(coerced.success).toBe(true);
    if (coerced.success) {
      expect(coerced.data.captchaEnabled).toBe(true);
      expect(coerced.data.emailEnabled).toBe(true);
    }
  });
});

describe("socialMediaSettingsSchema", () => {
  it("accepts empty strings to clear URLs", () => {
    const result = socialMediaSettingsSchema.safeParse({
      twitterUrl: "",
      facebookUrl: "",
      youtubeUrl: "",
      bloggerUrl: "",
      instagramUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid http(s) URLs", () => {
    expect(
      socialMediaSettingsSchema.safeParse({
        twitterUrl: "https://x.com/ccshau",
        facebookUrl: "https://facebook.com/ccshau",
        youtubeUrl: "https://youtube.com/@ccshau",
        bloggerUrl: "",
        instagramUrl: "http://instagram.com/ccshau",
      }).success,
    ).toBe(true);
  });

  it("rejects non-http URLs", () => {
    expect(
      socialMediaSettingsSchema.safeParse({
        twitterUrl: "javascript:alert(1)",
        facebookUrl: "",
        youtubeUrl: "",
        bloggerUrl: "",
        instagramUrl: "",
      }).success,
    ).toBe(false);

    expect(
      socialMediaSettingsSchema.safeParse({
        twitterUrl: "not-a-url",
        facebookUrl: "",
        youtubeUrl: "",
        bloggerUrl: "",
        instagramUrl: "",
      }).success,
    ).toBe(false);
  });
});
