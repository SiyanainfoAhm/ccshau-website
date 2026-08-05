import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { getCaptchaClientConfig } from "@/lib/auth/captcha";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const captcha = await getCaptchaClientConfig();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ccshau-chrome-900 via-ccshau-chrome-800 to-[#1a5c40] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-bold text-ccshau-chrome-900">CCSHAU CMS</p>
          <p className="mt-1 text-sm text-slate-500">Choose a new password</p>
        </div>
        <ResetPasswordForm captcha={captcha} />
      </div>
    </div>
  );
}
