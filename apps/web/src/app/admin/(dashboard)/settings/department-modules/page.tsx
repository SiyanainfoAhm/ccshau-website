import Link from "next/link";
import { redirect } from "next/navigation";

import { listDepartmentModulesForAdmin } from "@/actions/department-modules";
import { DepartmentModulesPanel } from "@/components/admin/department-modules-panel";
import { requireAdminSession } from "@/lib/auth/session";

export default async function DepartmentModulesSettingsPage() {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin/settings");
  }

  const departments = await listDepartmentModulesForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-emerald-700 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
          Department module access
        </h1>
        <p className="text-sm text-slate-500">
          Configure which CMS areas each department login can manage
        </p>
      </div>

      <DepartmentModulesPanel departments={departments} />
    </div>
  );
}
