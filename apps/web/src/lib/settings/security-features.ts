import { getPowerAutomateConfig } from "@/lib/power-automate/env";

export interface CaptchaCredentialsStatus {
  hasSecret: boolean;
  hasSiteKey: boolean;
  isConfigured: boolean;
  siteKey: string | null;
}

export interface EmailCredentialsStatus {
  hasEmailUrl: boolean;
  hasSecret: boolean;
  isConfigured: boolean;
}

export function getCaptchaCredentialsStatus(): CaptchaCredentialsStatus {
  const hasSecret = Boolean(process.env.CAPTCHA_SECRET_KEY);
  const hasSiteKey = Boolean(process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY);
  return {
    hasSecret,
    hasSiteKey,
    isConfigured: hasSecret && hasSiteKey,
    siteKey: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? null,
  };
}

export function getEmailCredentialsStatus(): EmailCredentialsStatus {
  const config = getPowerAutomateConfig();
  const hasEmailUrl = Boolean(config.emailUrl);
  const hasSecret = Boolean(config.webhookSecret);
  return {
    hasEmailUrl,
    hasSecret,
    isConfigured: hasEmailUrl,
  };
}
