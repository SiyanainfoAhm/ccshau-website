"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  assignDepartmentHodAction,
  revokeDepartmentHodAction,
  type DepartmentHodAssignmentView,
} from "@/actions/users";
import { DEPARTMENT_HOD_ROLE_LABEL } from "@/lib/validations/users";

type DepartmentPageOption = {
  id: string;
  title_en: string;
  slug: string;
  college_title: string;
};

export function DepartmentHodAssignmentPanel({
  userId,
  assignment,
  departmentPages,
}: {
  userId: string;
  assignment: DepartmentHodAssignmentView | null;
  departmentPages: DepartmentPageOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAssign(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await assignDepartmentHodAction(userId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRevoke() {
    if (!confirm("Remove this user's Department HOD assignment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await revokeDepartmentHodAction(userId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {assignment ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Department page</dt>
              <dd className="font-medium text-slate-900">{assignment.department_title}</dd>
            </div>
            <div>
              <dt className="text-slate-500">College</dt>
              <dd className="font-medium text-slate-900">{assignment.college_title ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900">{DEPARTMENT_HOD_ROLE_LABEL}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className="mt-4 text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
          >
            Remove Department HOD assignment
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No department page assigned. HOD can edit only that department&apos;s page and faculty.
        </p>
      )}

      <form
        action={handleAssign}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block min-w-[20rem] flex-1 text-sm">
          <span className="font-medium text-slate-700">
            {assignment ? "Change department page" : "Assign department page"}
          </span>
          <select
            name="departmentPageId"
            required
            defaultValue={assignment?.department_page_id ?? ""}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Select department</option>
            {departmentPages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.college_title ? `${page.college_title} — ` : ""}
                {page.title_en}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending || departmentPages.length === 0}
          className="rounded-lg bg-[#0b3d2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
        >
          {isPending ? "Saving…" : assignment ? "Update HOD assignment" : "Assign Department HOD"}
        </button>
      </form>
    </div>
  );
}
