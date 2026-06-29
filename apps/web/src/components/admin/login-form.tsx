"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  getRecaptchaToken,
  RecaptchaWidget,
  resetRecaptcha,
} from "@/components/shared/recaptcha-widget";
import { DEV_SUPER_ADMIN, isDevLoginPrefillEnabled } from "@/lib/auth/dev-credentials";
import type { CaptchaClientConfig } from "@/lib/auth/captcha";

const devPrefill = isDevLoginPrefillEnabled();

export function LoginForm({ captcha }: { captcha: CaptchaClientConfig }) {
  const router = useRouter();
  const [email, setEmail] = useState(devPrefill ? DEV_SUPER_ADMIN.email : "");
  const [password, setPassword] = useState(devPrefill ? DEV_SUPER_ADMIN.password : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const captchaToken = captcha.required ? getRecaptchaToken() : undefined;
      if (captcha.required && !captchaToken) {
        setError("Please complete the CAPTCHA.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Login failed");
        if (captcha.required) resetRecaptcha();
        return;
      }

      router.push("/admin");
      router.refresh();
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-emerald-500/0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type={devPrefill ? "text" : "password"}
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {captcha.required && captcha.siteKey && <RecaptchaWidget siteKey={captcha.siteKey} />}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#0b3d2e] px-4 py-3 font-semibold text-white transition hover:bg-[#0d4a38] disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in to CMS"}
      </button>

      {devPrefill && (
        <p className="text-center text-xs text-slate-500">
          Dev mode: super admin credentials pre-filled in the fields above.
        </p>
      )}
    </form>
  );
}
