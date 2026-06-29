import { getAdminAlertEmail, getPowerAutomateConfig, getPowerAutomateTestEmail } from "@/lib/power-automate/env";
import { isEmailEnabled } from "@/lib/settings/site-settings";

export type EmailTemplate =
  | "login_lockout"
  | "feedback_received"
  | "password_reset"
  | "test_email";

export async function sendPowerAutomateEmail(
  templateType: EmailTemplate,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const enabled = await isEmailEnabled();
  if (!enabled) return false;

  const config = getPowerAutomateConfig();
  if (!config.emailUrl) return false;

  await fetch(config.emailUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.webhookSecret ? { "x-webhook-secret": config.webhookSecret } : {}),
    },
    body: JSON.stringify({
      templateType,
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  }).catch(() => {
    // Non-blocking — caller flows must not fail if email fails
  });

  return true;
}

export async function sendPowerAutomateTestEmail(triggeredByEmail: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const config = getPowerAutomateConfig();
  if (!config.emailUrl) {
    return { ok: false, message: "POWER_AUTOMATE_EMAIL_URL is not configured." };
  }

  const to = getPowerAutomateTestEmail();

  try {
    const res = await fetch(config.emailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.webhookSecret ? { "x-webhook-secret": config.webhookSecret } : {}),
      },
      body: JSON.stringify({
        templateType: "test_email",
        timestamp: new Date().toISOString(),
        to,
        triggeredBy: triggeredByEmail,
        message: "CCSHAU CMS test email from Admin → Settings.",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        message: `Power Automate returned HTTP ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`,
      };
    }

    return { ok: true, message: `Test email request sent to Power Automate (recipient: ${to}).` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reach Power Automate URL.",
    };
  }
}

export async function sendLockoutAlert(email: string, ipAddress?: string): Promise<void> {
  await sendPowerAutomateEmail("login_lockout", {
    to: getAdminAlertEmail(),
    email,
    ipAddress,
  });
}

export async function sendFeedbackReceivedEmail(params: {
  ticketNumber: string;
  submitterName: string;
  email: string;
  subject: string;
  category?: string | null;
  departmentName?: string | null;
}): Promise<void> {
  await sendPowerAutomateEmail("feedback_received", {
    to: getAdminAlertEmail(),
    ticketNumber: params.ticketNumber,
    submitterName: params.submitterName,
    email: params.email,
    subject: params.subject,
    category: params.category ?? null,
    departmentName: params.departmentName ?? null,
  });
}
