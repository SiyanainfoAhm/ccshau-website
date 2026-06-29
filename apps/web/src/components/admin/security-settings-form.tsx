"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  testCaptchaAction,
  testEmailAction,
  updateSecuritySettingsAction,
  type SecuritySettingsView,
} from "@/actions/settings";
import {
  getRecaptchaToken,
  RecaptchaWidget,
  resetRecaptcha,
} from "@/components/shared/recaptcha-widget";

export function SecuritySettingsForm({ view }: { view: SecuritySettingsView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCaptchaTesting, startCaptchaTest] = useTransition();
  const [isEmailTesting, startEmailTest] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [captchaTestMessage, setCaptchaTestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [emailTestMessage, setEmailTestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSecuritySettingsAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function handleTestCaptcha() {
    setCaptchaTestMessage(null);
    startCaptchaTest(async () => {
      const token = getRecaptchaToken();
      const result = await testCaptchaAction(token ?? "");
      if (!result.success) {
        setCaptchaTestMessage({ type: "error", text: result.error });
        resetRecaptcha();
        return;
      }
      setCaptchaTestMessage({ type: "success", text: result.data });
      resetRecaptcha();
    });
  }

  function handleTestEmail() {
    setEmailTestMessage(null);
    startEmailTest(async () => {
      const result = await testEmailAction();
      if (!result.success) {
        setEmailTestMessage({ type: "error", text: result.error });
        return;
      }
      setEmailTestMessage({ type: "success", text: result.data });
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Security & notifications</h2>
        <p className="mt-1 text-sm text-slate-500">
          When disabled, CAPTCHA verification and Power Automate emails are bypassed (useful until IT
          provides production keys).
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Settings saved.</p>
      )}

      <div className="space-y-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="captchaEnabled"
              defaultChecked={view.settings.captcha_enabled}
              disabled={!view.captcha.isConfigured}
              className="mt-1 rounded"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">Enable CAPTCHA</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Require Google reCAPTCHA on admin login and public feedback when enabled.
              </span>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  view.captcha.isConfigured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {view.captcha.isConfigured
                  ? "Keys configured"
                  : "Set CAPTCHA_SECRET_KEY and NEXT_PUBLIC_CAPTCHA_SITE_KEY in environment"}
              </span>
            </span>
          </label>

          {view.captcha.isConfigured && view.captcha.siteKey && (
            <div className="ml-7 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">
                Complete the challenge below to verify keys with Google (works even when CAPTCHA is
                disabled).
              </p>
              <RecaptchaWidget siteKey={view.captcha.siteKey} />
              {captchaTestMessage && (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    captchaTestMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {captchaTestMessage.text}
                </p>
              )}
              <button
                type="button"
                onClick={handleTestCaptcha}
                disabled={isCaptchaTesting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isCaptchaTesting ? "Testing…" : "Test Captcha"}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="emailEnabled"
              defaultChecked={view.settings.email_enabled}
              disabled={!view.email.isConfigured}
              className="mt-1 rounded"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">Enable Power Automate email</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Send lockout alerts and feedback notifications via Microsoft Power Automate when enabled.
              </span>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  view.email.isConfigured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {view.email.isConfigured
                  ? `Email URL configured${view.email.hasSecret ? " (with secret)" : ""}`
                  : "Set POWER_AUTOMATE_EMAIL_URL in environment"}
              </span>
            </span>
          </label>

          {view.email.isConfigured && (
            <div className="ml-7 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">
                Sends a test payload to Power Automate (works even when email notifications are
                disabled).
              </p>
              {emailTestMessage && (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    emailTestMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {emailTestMessage.text}
                </p>
              )}
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isEmailTesting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isEmailTesting ? "Sending…" : "Test Email"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          Environment fallbacks when the database row is missing:{" "}
          <code className="rounded bg-slate-100 px-1">CAPTCHA_ENABLED</code>,{" "}
          <code className="rounded bg-slate-100 px-1">POWER_AUTOMATE_ENABLED</code>
        </p>
        {view.settings.updated_at && (
          <p className="mt-2">
            Last updated: {new Date(view.settings.updated_at).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save security settings"}
      </button>
    </form>
  );
}
