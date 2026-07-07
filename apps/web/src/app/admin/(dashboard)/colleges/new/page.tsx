import Link from "next/link";
import { redirect } from "next/navigation";

import { listUsersForAdmin } from "@/actions/users";
import { CollegeWizardForm } from "@/components/admin/college-wizard-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function RegisterCollegePage() {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const users = await listUsersForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/register" className="text-sm text-emerald-700 hover:underline">
          ← Microsite setup
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Register college</h1>
        <p className="text-sm text-slate-500">
          Create a college microsite with default Department and Gallery sections, optional department
          pages, and Academics menu entry on publish.
        </p>
      </div>
      <CollegeWizardForm
        users={users.map((u) => ({
          id: u.id,
          display_name: u.display_name,
          email: u.email,
        }))}
      />
    </div>
  );
}
