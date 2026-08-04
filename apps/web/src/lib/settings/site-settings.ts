import { Tables } from "@/lib/database/names";
import type { SiteSettings } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

function envDefaults(): SiteSettings {
  return {
    id: 1,
    captcha_enabled: process.env.CAPTCHA_ENABLED === "true",
    email_enabled: process.env.POWER_AUTOMATE_ENABLED === "true",
    social_twitter_url: null,
    social_facebook_url: null,
    social_youtube_url: null,
    social_blogger_url: null,
    social_instagram_url: null,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const admin = createAdminClient();
  if (!admin) return envDefaults();

  const { data } = await admin.from(Tables.siteSettings).select("*").eq("id", 1).maybeSingle();
  if (!data) return envDefaults();

  const row = data as Partial<SiteSettings>;
  return {
    ...envDefaults(),
    ...row,
    social_twitter_url: row.social_twitter_url ?? null,
    social_facebook_url: row.social_facebook_url ?? null,
    social_youtube_url: row.social_youtube_url ?? null,
    social_blogger_url: row.social_blogger_url ?? null,
    social_instagram_url: row.social_instagram_url ?? null,
  };
}

/** Runtime CAPTCHA on/off — driven by Admin → Settings (DB), not by env kill-switches. */
export async function isCaptchaEnabled(): Promise<boolean> {
  const settings = await getSiteSettings();
  return settings.captcha_enabled === true;
}

export async function isEmailEnabled(): Promise<boolean> {
  const settings = await getSiteSettings();
  return settings.email_enabled;
}
