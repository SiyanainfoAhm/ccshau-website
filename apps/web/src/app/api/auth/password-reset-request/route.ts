import { NextResponse } from "next/server";

import { verifyCaptcha } from "@/lib/auth/captcha";
import { writeAuditLog } from "@/lib/auth/audit";
import { Tables } from "@/lib/database/names";
import { sendPasswordResetEmail } from "@/lib/power-automate/send";
import {
  checkRateLimit,
  PASSWORD_RESET_EMAIL_RATE,
  PASSWORD_RESET_IP_RATE,
} from "@/lib/security/rate-limit";
import { isEmailEnabled } from "@/lib/settings/site-settings";
import { getPowerAutomateConfig } from "@/lib/power-automate/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/env";
import { passwordResetRequestSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Generic success — never reveal whether the email exists. */
const GENERIC_OK = {
  success: true as const,
  message:
    "If an account exists for that email, a password reset link has been sent. Check your inbox.",
};

export async function POST(request: Request) {
  const ip = clientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const ipRate = checkRateLimit(
    `password-reset:ip:${ip}`,
    PASSWORD_RESET_IP_RATE.limit,
    PASSWORD_RESET_IP_RATE.windowMs,
  );
  if (!ipRate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many reset requests. Try again in ${ipRate.retryAfterSec} seconds.`,
      },
      { status: 429 },
    );
  }

  const emailRate = checkRateLimit(
    `password-reset:email:${email}`,
    PASSWORD_RESET_EMAIL_RATE.limit,
    PASSWORD_RESET_EMAIL_RATE.windowMs,
  );
  if (!emailRate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many reset requests for this email. Try again in ${emailRate.retryAfterSec} seconds.`,
      },
      { status: 429 },
    );
  }

  if (!(await verifyCaptcha(parsed.data.captchaToken))) {
    return NextResponse.json({ success: false, error: "CAPTCHA verification failed" }, { status: 400 });
  }

  const emailEnabled = await isEmailEnabled();
  const pa = getPowerAutomateConfig();
  if (!emailEnabled || !pa.emailUrl) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Password reset email is not configured. Contact Computer Section / your Super Admin.",
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Auth service is temporarily unavailable." },
      { status: 503 },
    );
  }

  // Only send for known CMS users (profiles). Still return GENERIC_OK either way.
  const { data: profile } = await admin
    .from(Tables.profiles)
    .select("id, display_name, email")
    .ilike("email", email)
    .maybeSingle();

  if (profile) {
    const redirectTo = `${getSiteUrl()}/admin/reset-password`;
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
      options: { redirectTo },
    });

    if (!error && linkData?.properties?.action_link) {
      await sendPasswordResetEmail({
        toEmail: profile.email,
        toName: profile.display_name,
        resetLink: linkData.properties.action_link,
        ipAddress: ip === "unknown" ? null : ip,
      });

      await writeAuditLog({
        userId: profile.id,
        action: "update",
        entityType: "auth",
        details: { email: profile.email, stage: "password_reset_request" },
        ipAddress: ip === "unknown" ? undefined : ip,
      });
    } else if (process.env.NODE_ENV === "development") {
      console.warn("[password-reset] generateLink failed:", error?.message ?? "no action_link");
    }
  }

  return NextResponse.json(GENERIC_OK);
}
