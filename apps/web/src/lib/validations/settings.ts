import { z } from "zod";

export const securitySettingsSchema = z.object({
  captchaEnabled: z.coerce.boolean(),
  emailEnabled: z.coerce.boolean(),
});

/** Empty string clears the URL; otherwise must be http(s). */
const optionalSocialUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? "")
  .refine(
    (value) => value === "" || /^https?:\/\//i.test(value),
    "Enter a full URL starting with https://",
  )
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    "Enter a valid URL",
  );

export const socialMediaSettingsSchema = z.object({
  twitterUrl: optionalSocialUrl,
  facebookUrl: optionalSocialUrl,
  youtubeUrl: optionalSocialUrl,
  bloggerUrl: optionalSocialUrl,
  instagramUrl: optionalSocialUrl,
});

export const headerBrandingSchema = z.object({
  taglineEn: z.string().trim().min(1, "English motto is required").max(80),
  taglineHi: z.string().trim().max(80),
  shortName: z.string().trim().min(1, "Short name is required").max(40),
  nameEn: z.string().trim().min(1, "English university name is required").max(160),
  nameHi: z.string().trim().max(160),
  accreditationEn: z.string().trim().min(1, "English accreditation text is required").max(80),
  accreditationHi: z.string().trim().max(80),
});

export type HeaderBrandingInput = z.infer<typeof headerBrandingSchema>;
