import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { isFacultyOnlyUser } from "@/lib/auth/faculty-scope";
import { requireAdminSession } from "@/lib/auth/session";

export default async function SettingsChangePasswordPage() {
  const session = await requireAdminSession();

  // Faculty use their own self-service route, not Settings.
  if (isFacultyOnlyUser(session)) {
    redirect("/admin/register/faculty/change-password");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Change password</h1>
        <p className="mt-1 text-sm text-slate-500">{session.email}</p>
        <p className="mt-2 text-sm text-slate-600">
          Enter your old password, then choose a new one (at least 8 characters) and confirm it.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
