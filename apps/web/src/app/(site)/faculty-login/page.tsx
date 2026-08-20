import Link from "next/link";

import { LoginForm } from "@/components/admin/login-form";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { getCaptchaClientConfig } from "@/lib/auth/captcha";
import { getAdminSession } from "@/lib/auth/session";
import { publicCardClass, publicMainClass } from "@/lib/design/public-page-classes";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Faculty Login",
  description: "Faculty and HOD login to update your own profile on the CCS HAU website",
};

export default async function FacultyLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  const captcha = await getCaptchaClientConfig();

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" tabIndex={-1} className={publicMainClass}>
        <div className="gradient-hero pattern-dots px-4 py-10 text-white">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm text-emerald-100">
              <Link href={SELECTED_LAYOUT.homePath} className="hover:text-white hover:underline">
                Home
              </Link>
              {" > "}
              Faculty Login
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold">Faculty Login</h1>
            <p className="mt-2 font-hindi text-emerald-100">संकाय लॉगिन</p>
          </div>
        </div>

        <div className="mx-auto max-w-md px-4 py-12">
          <div className={`${publicCardClass} p-8`}>
            <h2 className="font-display text-xl font-bold text-slate-900">Faculty Login</h2>
            <p className="mt-2 text-sm text-slate-600">
              Faculty and HOD can sign in with university email to update only their own profile
              (name, photo, mobile, specialization, Other Activities).
            </p>
            <div className="mt-6">
              <LoginForm captcha={captcha} nextPath="/admin" submitLabel="Login" />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
