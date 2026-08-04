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

export type SocialMediaSettingsInput = z.infer<typeof socialMediaSettingsSchema>;
