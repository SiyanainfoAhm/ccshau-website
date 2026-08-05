import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { getCaptchaClientConfig } from "@/lib/auth/captcha";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  const captcha = await getCaptchaClientConfig();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ccshau-chrome-900 via-ccshau-chrome-800 to-[#1a5c40] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-bold text-ccshau-chrome-900">CCSHAU CMS</p>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage website content</p>
        </div>
        <LoginForm captcha={captcha} />
      </div>
    </div>
  );
}
