"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { assignRoleAction, revokeRoleAction, type RoleAssignmentView } from "@/actions/users";
import type { DepartmentOption } from "@/lib/database/types";
import { ROLE_LABELS } from "@/lib/validations/users";

type UserRoleOption = keyof typeof ROLE_LABELS;

export function UserRolesPanel({
  userId,
  roles,
  departments,
}: {
  userId: string;
  roles: RoleAssignmentView[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRoleOption>("dept_admin");

  function handleAssign(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await assignRoleAction(userId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRevoke(roleId: string) {
    if (!confirm("Revoke this role assignment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await revokeRoleAction(roleId, userId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const showDepartment = selectedRole !== "super_admin";

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No CMS roles assigned yet.
                </td>
              </tr>
            ) : (
              roles.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {ROLE_LABELS[assignment.role]}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {assignment.department_name ?? (assignment.role === "super_admin" ? "All departments" : "—")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRevoke(assignment.id)}
                      disabled={isPending}
                      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form action={handleAssign} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Add role</span>
          <select
            name="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRoleOption)}
            className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {showDepartment && (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Department</span>
            <select
              name="departmentId"
              required
              className="mt-1 block w-56 rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name_en}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Assign role"}
        </button>
      </form>
    </div>
  );
}
