"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { inviteUserAction } from "@/actions/users";
import type { DepartmentOption } from "@/lib/database/types";
import { isUniversityWideRole, requiresDepartmentForRole } from "@/lib/auth/cms-roles";
import { COLLEGE_ROLE_LABELS, ROLE_LABELS } from "@/lib/validations/users";

type CollegeOption = { id: string; title_en: string };

export function InviteUserForm({
  departments,
  colleges,
}: {
  departments: DepartmentOption[];
  colleges: CollegeOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [initialRole, setInitialRole] = useState("");
  const [collegeRole, setCollegeRole] = useState("");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await inviteUserAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/admin/users/${result.data.id}`);
      router.refresh();
    });
  }

  const showDeptForRole = initialRole && !isUniversityWideRole(initialRole as keyof typeof ROLE_LABELS);
  const departmentRequired = initialRole
    ? requiresDepartmentForRole(initialRole as keyof typeof ROLE_LABELS)
    : false;

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Display name</span>
        <input
          name="displayName"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Initial password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Minimum 8 characters. Share securely with the user.
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Home department (profile)</span>
        <select
          name="departmentId"
          required={departmentRequired}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">— None —</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name_en}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-800">University CMS role (optional)</legend>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Initial CMS role</span>
          <select
            name="initialRole"
            value={initialRole}
            onChange={(e) => setInitialRole(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">— Assign later —</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {showDeptForRole && (
            <span className="mt-1 block text-xs text-slate-500">
              Department-scoped roles use the home department above when set.
            </span>
          )}
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-800">College scope (optional)</legend>
        <p className="text-xs text-slate-500">One user manages exactly one college microsite.</p>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">College</span>
          <select name="collegePageId" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">— None —</option>
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
            onChange={(e) => setCollegeRole(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">— Select if college chosen —</option>
            {Object.entries(COLLEGE_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create user"}
        </button>
        <Link href="/admin/users" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
