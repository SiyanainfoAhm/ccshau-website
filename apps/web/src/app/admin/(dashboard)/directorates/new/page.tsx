import Link from "next/link";
import { redirect } from "next/navigation";

import { listAllUsersForAdmin } from "@/actions/users";
import { CollegeWizardForm } from "@/components/admin/college-wizard-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function RegisterDirectoratePage() {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const users = await listAllUsersForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/register" className="text-sm text-emerald-700 hover:underline">
          ← Microsite setup
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Register directorate</h1>
        <p className="text-sm text-slate-500">
          Create a Type B directorate microsite with Department section, optional division pages, and
          faculty register support. Public URL: /college/your-slug
        </p>
      </div>
      <CollegeWizardForm
        defaultBlueprint="directorate"
        users={users.map((u) => ({
          id: u.id,
          display_name: u.display_name,
          email: u.email,
        }))}
      />
    </div>
  );
}
