"use server";

import { revalidatePath } from "next/cache";

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
import { securitySettingsSchema } from "@/lib/validations/settings";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_ROLES = ["super_admin"] as const;

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

function parseSecuritySettingsForm(formData: FormData) {
  return securitySettingsSchema.safeParse({
    captchaEnabled: formData.get("captchaEnabled") === "on",
    emailEnabled: formData.get("emailEnabled") === "on",
  });
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
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update settings.");
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
