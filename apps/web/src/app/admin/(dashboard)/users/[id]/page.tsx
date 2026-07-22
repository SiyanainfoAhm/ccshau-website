import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getUserById } from "@/actions/users";
import { listCollegesForAdmin } from "@/lib/auth/college-scope-server";
import { listDepartmentPagesForHodAssignment } from "@/lib/auth/department-hod-scope-server";
import { listDepartments } from "@/actions/pages";
import { CollegeAssignmentPanel } from "@/components/admin/college-assignment-panel";
import { DepartmentHodAssignmentPanel } from "@/components/admin/department-hod-assignment-panel";
import { UserProfileForm } from "@/components/admin/user-profile-form";
import { UserRolesPanel } from "@/components/admin/user-roles-panel";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const { id } = await params;
  const [user, departments, colleges, departmentPages] = await Promise.all([
    getUserById(id),
    listDepartments(),
    listCollegesForAdmin(),
    listDepartmentPagesForHodAssignment(session),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="text-sm text-emerald-700 hover:underline">
          ← All users
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">{user.display_name}</h1>
        <p className="text-sm text-slate-500">Profile and role assignments</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <UserProfileForm user={user} departments={departments} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">CMS roles</h2>
        <UserRolesPanel userId={user.id} roles={user.role_assignments} departments={departments} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">College assignment</h2>
        <CollegeAssignmentPanel
          userId={user.id}
          assignment={user.college_assignment}
          colleges={colleges}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Department HOD assignment</h2>
        <p className="text-sm text-slate-500">
          Grants login access to edit one college department page (content + faculty). Does not use
          Home department (profile).
        </p>
        <DepartmentHodAssignmentPanel
          userId={user.id}
          assignment={user.department_hod_assignment}
          departmentPages={departmentPages}
        />
      </section>
    </div>
  );
}
