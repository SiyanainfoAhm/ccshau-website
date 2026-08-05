"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  assignCollegeAction,
  revokeCollegeAction,
  type CollegeAssignmentView,
} from "@/actions/users";
import { COLLEGE_ROLE_LABELS } from "@/lib/validations/users";

type CollegeOption = { id: string; slug: string; title_en: string };

export function CollegeAssignmentPanel({
  userId,
  assignment,
  colleges,
}: {
  userId: string;
  assignment: CollegeAssignmentView | null;
  colleges: CollegeOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [collegeRole, setCollegeRole] = useState<keyof typeof COLLEGE_ROLE_LABELS>("college_editor");

  function handleAssign(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await assignCollegeAction(userId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRevoke() {
    if (!confirm("Remove this user's college assignment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await revokeCollegeAction(userId);
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
              <dt className="text-slate-500">College</dt>
              <dd className="font-medium text-slate-900">{assignment.college_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900">{COLLEGE_ROLE_LABELS[assignment.role]}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className="mt-4 text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
          >
            Remove college assignment
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No college assigned. Each user may manage one college microsite.</p>
      )}

      <form
        action={handleAssign}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{assignment ? "Change college" : "Assign college"}</span>
          <select
            name="collegePageId"
            required
            defaultValue={assignment?.college_page_id ?? ""}
            className="mt-1 block w-72 rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Select college</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.title_en}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">College role</span>
          <select
            name="collegeRole"
            value={collegeRole}
            onChange={(e) => setCollegeRole(e.target.value as keyof typeof COLLEGE_ROLE_LABELS)}
            className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2"
          >
            {Object.entries(COLLEGE_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-ccshau-chrome-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : assignment ? "Update assignment" : "Assign college"}
        </button>
      </form>
    </div>
  );
}
