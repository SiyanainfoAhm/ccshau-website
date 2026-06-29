export function getPowerAutomateConfig() {
  const emailUrl = process.env.POWER_AUTOMATE_EMAIL_URL;
  const webhookSecret = process.env.POWER_AUTOMATE_WEBHOOK_SECRET;
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
  const testEmail = process.env.POWER_AUTOMATE_TEST_EMAIL;

  return {
    emailUrl,
    webhookSecret,
    adminAlertEmail,
    testEmail,
    isConfigured: Boolean(emailUrl),
  };
}

export function getAdminAlertEmail(): string {
  return process.env.ADMIN_ALERT_EMAIL ?? "computer.section@hau.ac.in";
}

export function getPowerAutomateTestEmail(): string {
  return process.env.POWER_AUTOMATE_TEST_EMAIL ?? getAdminAlertEmail();
}
