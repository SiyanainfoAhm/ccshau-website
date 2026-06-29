import { Tables } from "@/lib/database/names";
import type { SiteSettings } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

function envDefaults(): SiteSettings {
  return {
    id: 1,
    captcha_enabled: process.env.CAPTCHA_ENABLED === "true",
    email_enabled: process.env.POWER_AUTOMATE_ENABLED === "true",
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const admin = createAdminClient();
  if (!admin) return envDefaults();

  const { data } = await admin.from(Tables.siteSettings).select("*").eq("id", 1).maybeSingle();
  if (!data) return envDefaults();

  return data as SiteSettings;
}

export async function isCaptchaEnabled(): Promise<boolean> {
  const settings = await getSiteSettings();
  return settings.captcha_enabled;
}

export async function isEmailEnabled(): Promise<boolean> {
  const settings = await getSiteSettings();
  return settings.email_enabled;
}
