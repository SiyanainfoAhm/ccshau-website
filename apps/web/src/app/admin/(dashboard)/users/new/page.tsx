import Link from "next/link";
import { redirect } from "next/navigation";

import { listDepartments } from "@/actions/pages";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewUserPage() {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const departments = await listDepartments();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-emerald-700 hover:underline">
          ← All users
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New CMS user</h1>
        <p className="text-sm text-slate-500">
          Creates an auth account, profile, and optional initial role
        </p>
      </div>
      <InviteUserForm departments={departments} />
    </div>
  );
}
