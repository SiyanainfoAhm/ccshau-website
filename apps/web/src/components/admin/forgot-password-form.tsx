"use client";

import Link from "next/link";
import { useState } from "react";

import {
  getRecaptchaToken,
  RecaptchaWidget,
  resetRecaptcha,
} from "@/components/shared/recaptcha-widget";
import type { CaptchaClientConfig } from "@/lib/auth/captcha";

export function ForgotPasswordForm({ captcha }: { captcha: CaptchaClientConfig }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const captchaToken = captcha.required ? getRecaptchaToken() : undefined;
      if (captcha.required && !captchaToken) {
        setError("Please complete the CAPTCHA.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; message?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not send reset email.");
        if (captcha.required) resetRecaptcha();
        return;
      }

      setSuccess(data.message ?? "If an account exists for that email, a reset link has been sent.");
      setEmail("");
      if (captcha.required) resetRecaptcha();
    } catch {
      setError("Network error. Please try again.");
      if (captcha.required) resetRecaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {captcha.required && captcha.siteKey && <RecaptchaWidget siteKey={captcha.siteKey} />}

      <button
        type="submit"
        disabled={loading || Boolean(success)}
        className="w-full rounded-lg bg-ccshau-chrome-900 px-4 py-3 font-semibold text-white transition hover:bg-ccshau-chrome-800 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-slate-600">
        <Link href="/admin/login" className="font-medium text-ccshau-chrome-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
