import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { listUsersForAdmin } from "@/actions/users";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { UsersListSearch } from "@/components/admin/users-list-search";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";
import { ROLE_LABELS } from "@/lib/validations/users";

const USERS_SORTS = ["display_name", "email", "is_active", "created_at"] as const;

function formatRoles(
  assignments: { role: keyof typeof ROLE_LABELS; department_name: string | null }[],
) {
  if (assignments.length === 0) return "—";
  return assignments
    .map((a) => {
      const label = ROLE_LABELS[a.role];
      if (a.role === "super_admin") return label;
      return a.department_name ? `${label} (${a.department_name})` : label;
    })
    .join(", ");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "display_name",
    sortOrder: "asc",
    allowedSorts: USERS_SORTS,
  });
  const data = await listUsersForAdmin(listParams);
  const users = data.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Users & roles</h1>
          <p className="text-sm text-slate-500">
            Manage CMS accounts and RBAC assignments (super admin only)
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New user
        </Link>
      </div>

      <Suspense fallback={null}>
        <UsersListSearch listParams={listParams} data={data} />
      </Suspense>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense fallback={<tr><th className="px-4 py-3">Name</th></tr>}>
              <tr>
                <AdminSortableTh label="Name" column="display_name" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Email" column="email" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Roles</th>
                <AdminSortableTh label="Status" column="is_active" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {listParams.search ? (
                    "No users match your search."
                  ) : (
                    <>
                      No CMS users yet.{" "}
                      <Link href="/admin/users/new" className="text-emerald-700 hover:underline">
                        Create the first user
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {user.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{user.department_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatRoles(user.role_assignments)}</td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-red-600">Inactive</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminListFooter data={data} />
      </div>
    </div>
  );
}
