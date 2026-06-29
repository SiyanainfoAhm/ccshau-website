import { isCaptchaEnabled } from "@/lib/settings/site-settings";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export interface CaptchaClientConfig {
  required: boolean;
  siteKey: string | null;
}

export async function getCaptchaClientConfig(): Promise<CaptchaClientConfig> {
  const enabled = await isCaptchaEnabled();
  const siteKey = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? null;

  return {
    required: enabled && Boolean(siteKey),
    siteKey: enabled ? siteKey : null,
  };
}

export async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  const enabled = await isCaptchaEnabled();
  if (!enabled) return true;

  const secret = process.env.CAPTCHA_SECRET_KEY;
  if (!secret) return false;

  if (!token) return false;

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  return data.success === true;
}

export async function verifyCaptchaTokenForTest(
  token: string | undefined,
): Promise<{ ok: boolean; message: string }> {
  const secret = process.env.CAPTCHA_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;

  if (!secret || !siteKey) {
    return { ok: false, message: "CAPTCHA keys are not configured in the server environment." };
  }

  if (!token) {
    return { ok: false, message: "Complete the CAPTCHA challenge, then click Test Captcha." };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      return { ok: false, message: `Google siteverify returned HTTP ${res.status}.` };
    }

    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) {
      return { ok: true, message: "CAPTCHA verified successfully with Google." };
    }

    const codes = data["error-codes"]?.join(", ") ?? "unknown error";
    return { ok: false, message: `CAPTCHA verification failed: ${codes}` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reach Google CAPTCHA API.",
    };
  }
}
