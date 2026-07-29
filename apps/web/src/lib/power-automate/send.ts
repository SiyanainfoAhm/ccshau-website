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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPasswordResetHtml(params: {
  greeting: string;
  resetLink: string;
}): string {
  const safeGreeting = escapeHtml(params.greeting);
  const safeLink = escapeHtml(params.resetLink);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f4;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #d8e5df;">
          <tr>
            <td style="background:#0b3d2e;padding:20px 28px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">CCSHAU CMS</p>
              <p style="margin:6px 0 0;font-size:13px;color:#c5ddd2;">Password reset</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#1e293b;">${safeGreeting}</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#334155;">
                We received a request to reset your CCSHAU CMS password. Click the button below to choose a new password. This link expires soon.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                <tr>
                  <td align="center" bgcolor="#0b3d2e" style="border-radius:8px;">
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background:#0b3d2e;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#64748b;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 22px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${safeLink}" style="color:#0b3d2e;">${safeLink}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
                If you did not request this, you can ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px 20px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">— CCSHAU Website CMS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(params: {
  toEmail: string;
  toName?: string | null;
  resetLink: string;
  ipAddress?: string | null;
}): Promise<boolean> {
  const greeting = params.toName?.trim() ? `Hello ${params.toName.trim()},` : "Hello,";
  const plainMessage = [
    greeting,
    "",
    "We received a request to reset your CCSHAU CMS password.",
    "Open this link to choose a new password (link expires soon):",
    "",
    params.resetLink,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "— CCSHAU Website CMS",
  ].join("\n");

  const htmlBody = buildPasswordResetHtml({
    greeting,
    resetLink: params.resetLink,
  });

  return sendPowerAutomateEmail("password_reset", {
    to: params.toEmail,
    toEmail: params.toEmail,
    toName: params.toName ?? null,
    subject: "CCSHAU Website — Password Reset",
    resetLink: params.resetLink,
    link: params.resetLink,
    url: params.resetLink,
    // Prefer HTML so Outlook shows the Reset Password button
    message: htmlBody,
    body: htmlBody,
    htmlBody,
    textBody: plainMessage,
    ipAddress: params.ipAddress ?? null,
    requestedAt: new Date().toISOString(),
  });
}
