"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getRecaptchaToken,
  RecaptchaWidget,
  resetRecaptcha,
} from "@/components/shared/recaptcha-widget";
import type { CaptchaClientConfig } from "@/lib/auth/captcha";
import { createClient } from "@/lib/supabase/client";

type SessionState = "loading" | "ready" | "invalid";

export function ResetPasswordForm({ captcha }: { captcha: CaptchaClientConfig }) {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      try {
        const supabase = createClient();
        const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(window.location.search);

        const hashError = hashParams.get("error_description") ?? searchParams.get("error_description");
        if (hashError) {
          if (!cancelled) {
            setError(decodeURIComponent(hashError.replace(/\+/g, " ")));
            setSessionState("invalid");
          }
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            if (!cancelled) {
              setError(sessionError.message);
              setSessionState("invalid");
            }
            return;
          }
          window.history.replaceState(null, "", "/admin/reset-password");
          if (type === "recovery") {
            document.cookie = "ccshau_recovery=1; Path=/; Max-Age=3600; SameSite=Lax";
          }
          if (!cancelled) setSessionState("ready");
          return;
        }

        // PKCE / code exchange (if redirect used query params)
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) {
              setError(exchangeError.message);
              setSessionState("invalid");
            }
            return;
          }
          window.history.replaceState(null, "", "/admin/reset-password");
          document.cookie = "ccshau_recovery=1; Path=/; Max-Age=3600; SameSite=Lax";
          if (!cancelled) setSessionState("ready");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          if (!cancelled) setSessionState("ready");
          return;
        }

        if (!cancelled) {
          setError("Reset link is invalid or expired. Request a new password reset email.");
          setSessionState("invalid");
        }
      } catch {
        if (!cancelled) {
          setError("Could not verify reset link. Please try again.");
          setSessionState("invalid");
        }
      }
    }

    void establishRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const captchaToken = captcha.required ? getRecaptchaToken() : undefined;
      if (captcha.required && !captchaToken) {
        setError("Please complete the CAPTCHA.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/password-reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword, captchaToken }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; message?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not update password.");
        if (captcha.required) resetRecaptcha();
        return;
      }

      setSuccess(data.message ?? "Password updated. You can sign in now.");
      document.cookie = "ccshau_recovery=; Path=/; Max-Age=0; SameSite=Lax";
      setTimeout(() => {
        router.push("/admin/login");
        router.refresh();
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
      if (captcha.required) resetRecaptcha();
    } finally {
      setLoading(false);
    }
  }

  if (sessionState === "loading") {
    return <p className="text-center text-sm text-slate-600">Verifying reset link…</p>;
  }

  if (sessionState === "invalid") {
    return (
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <p className="text-center text-sm text-slate-600">
          <Link href="/admin/forgot-password" className="font-medium text-ccshau-chrome-900 hover:underline">
            Request a new reset link
          </Link>
          {" · "}
          <Link href="/admin/login" className="font-medium text-ccshau-chrome-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
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
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {captcha.required && captcha.siteKey && <RecaptchaWidget siteKey={captcha.siteKey} />}

      <button
        type="submit"
        disabled={loading || Boolean(success)}
        className="w-full rounded-lg bg-ccshau-chrome-900 px-4 py-3 font-semibold text-white transition hover:bg-ccshau-chrome-800 disabled:opacity-60"
      >
        {loading ? "Updating…" : "Update password"}
      </button>

      <p className="text-center text-sm text-slate-600">
        <Link href="/admin/login" className="font-medium text-ccshau-chrome-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
