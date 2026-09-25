"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { verifyCaptchaTokenForTest } from "@/lib/auth/captcha";
import { requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { SiteSettings } from "@/lib/database/types";
import {
  getCaptchaCredentialsStatus,
  getEmailCredentialsStatus,
} from "@/lib/settings/security-features";
import { getSiteSettings } from "@/lib/settings/site-settings";
import { sendPowerAutomateTestEmail } from "@/lib/power-automate/send";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { securitySettingsSchema, socialMediaSettingsSchema, headerBrandingSchema } from "@/lib/validations/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadHeaderImage } from "@/lib/storage/upload";

const SETTINGS_ROLES = ["super_admin"] as const;
const HEADER_ROLES = ["super_admin", "university_admin"] as const;

export interface SecuritySettingsView {
  settings: SiteSettings;
  captcha: ReturnType<typeof getCaptchaCredentialsStatus>;
  email: ReturnType<typeof getEmailCredentialsStatus>;
}

export async function getSecuritySettingsForAdmin(): Promise<SecuritySettingsView> {
  await requireAdminWithRoles([...SETTINGS_ROLES]);

  return {
    settings: await getSiteSettings(),
    captcha: getCaptchaCredentialsStatus(),
    email: getEmailCredentialsStatus(),
  };
}

export async function getSocialMediaSettingsForAdmin(): Promise<SiteSettings> {
  await requireAdminWithRoles([...SETTINGS_ROLES]);
  return getSiteSettings();
}

function parseSecuritySettingsForm(formData: FormData) {
  return securitySettingsSchema.safeParse({
    captchaEnabled: formData.get("captchaEnabled") === "on",
    emailEnabled: formData.get("emailEnabled") === "on",
  });
}

function parseSocialMediaSettingsForm(formData: FormData) {
  return socialMediaSettingsSchema.safeParse({
    twitterUrl: formData.get("twitterUrl") ?? "",
    facebookUrl: formData.get("facebookUrl") ?? "",
    youtubeUrl: formData.get("youtubeUrl") ?? "",
    bloggerUrl: formData.get("bloggerUrl") ?? "",
    instagramUrl: formData.get("instagramUrl") ?? "",
  });
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function updateSecuritySettingsAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...SETTINGS_ROLES]);
    const parsed = parseSecuritySettingsForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const captchaCreds = getCaptchaCredentialsStatus();
    const emailCreds = getEmailCredentialsStatus();

    if (parsed.data.captchaEnabled && !captchaCreds.isConfigured) {
      return fail(
        "CAPTCHA cannot be enabled until CAPTCHA_SECRET_KEY and NEXT_PUBLIC_CAPTCHA_SITE_KEY are set in the server environment.",
      );
    }

    if (parsed.data.emailEnabled && !emailCreds.isConfigured) {
      return fail(
        "Email cannot be enabled until POWER_AUTOMATE_EMAIL_URL is set in the server environment.",
      );
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin
      .from(Tables.siteSettings)
      .update({
        captcha_enabled: parsed.data.captchaEnabled,
        email_enabled: parsed.data.emailEnabled,
        updated_by: session.userId,
      })
      .eq("id", 1);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "site_settings",
      entityId: "1",
      details: {
        captcha_enabled: parsed.data.captchaEnabled,
        email_enabled: parsed.data.emailEnabled,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/login");
    revalidatePath("/contact");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update settings.");
  }
}

export async function updateSocialMediaSettingsAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...SETTINGS_ROLES]);
    const parsed = parseSocialMediaSettingsForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const row = {
      social_twitter_url: blankToNull(parsed.data.twitterUrl),
      social_facebook_url: blankToNull(parsed.data.facebookUrl),
      social_youtube_url: blankToNull(parsed.data.youtubeUrl),
      social_blogger_url: blankToNull(parsed.data.bloggerUrl),
      social_instagram_url: blankToNull(parsed.data.instagramUrl),
      updated_by: session.userId,
    };

    const { error } = await admin.from(Tables.siteSettings).update(row).eq("id", 1);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "site_settings",
      entityId: "1",
      details: { social_media: true, ...row },
    });

    revalidateTag("public-chrome", "max");
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update social media settings.");
  }
}

function imageFile(formData: FormData, name: string): File | null {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

export async function updateHeaderBrandingAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HEADER_ROLES]);
    const parsed = headerBrandingSchema.safeParse({
      taglineEn: formData.get("taglineEn") ?? "",
      taglineHi: formData.get("taglineHi") ?? "",
      shortName: formData.get("shortName") ?? "",
      nameEn: formData.get("nameEn") ?? "",
      nameHi: formData.get("nameHi") ?? "",
      accreditationEn: formData.get("accreditationEn") ?? "",
      accreditationHi: formData.get("accreditationHi") ?? "",
    });
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const current = await getSiteSettings();
    let logoPath = formData.get("resetLogo") === "on" ? null : current.header_logo_path;
    let portraitPath = formData.get("resetPortrait") === "on" ? null : current.header_portrait_path;

    const logo = imageFile(formData, "logo");
    if (logo) {
      const uploaded = await uploadHeaderImage(admin, "logo", logo);
      if (!uploaded.success) return uploaded;
      logoPath = uploaded.data;
    }

    const portrait = imageFile(formData, "portrait");
    if (portrait) {
      const uploaded = await uploadHeaderImage(admin, "portrait", portrait);
      if (!uploaded.success) return uploaded;
      portraitPath = uploaded.data;
    }

    const row = {
      header_tagline_en: parsed.data.taglineEn,
      header_tagline_hi: blankToNull(parsed.data.taglineHi),
      header_short_name: parsed.data.shortName,
      header_name_en: parsed.data.nameEn,
      header_name_hi: blankToNull(parsed.data.nameHi),
      header_accreditation_en: parsed.data.accreditationEn,
      header_accreditation_hi: blankToNull(parsed.data.accreditationHi),
      header_logo_path: logoPath,
      header_portrait_path: portraitPath,
      updated_by: session.userId,
    };

    const { error } = await admin.from(Tables.siteSettings).update(row).eq("id", 1);
    if (error) {
      if (/header_tagline|header_logo|header_portrait|header_short_name|header_name|header_accreditation/i.test(error.message)) {
        return fail(
          "Header settings are not in the database yet. Run supabase/migrations/20260925140000_site_settings_header_branding.sql in the Supabase SQL editor, then save again.",
        );
      }
      return fail(error.message);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "site_settings",
      entityId: "1",
      details: { header_branding: true, ...row },
    });

    revalidateTag("public-chrome", "max");
    revalidatePath("/admin/homepage");
    revalidatePath("/");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update header settings.");
  }
}

export async function testCaptchaAction(token: string): Promise<ActionResult<string>> {
  try {
    await requireAdminWithRoles([...SETTINGS_ROLES]);

    const result = await verifyCaptchaTokenForTest(token);
    if (!result.ok) {
      return fail(result.message);
    }

    return ok(result.message);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "CAPTCHA test failed.");
  }
}

export async function testEmailAction(): Promise<ActionResult<string>> {
  try {
    const session = await requireAdminWithRoles([...SETTINGS_ROLES]);

    const result = await sendPowerAutomateTestEmail(session.email);
    if (!result.ok) {
      return fail(result.message);
    }

    return ok(result.message);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Email test failed.");
  }
}
