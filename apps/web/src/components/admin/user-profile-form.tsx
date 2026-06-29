"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateUserAction, type AdminUserDetail } from "@/actions/users";
import type { DepartmentOption } from "@/lib/database/types";

export function UserProfileForm({
  user,
  departments,
}: {
  user: AdminUserDetail;
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateUserAction(user.id, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span className="font-medium text-slate-700">Email:</span> {user.email}
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Display name</span>
        <input
          name="displayName"
          required
          defaultValue={user.display_name}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Home department</span>
        <select
          name="departmentId"
          defaultValue={user.department_id ?? ""}
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={user.is_active}
          className="rounded"
        />
        Active (can sign in to CMS)
      </label>

      {user.last_login_at && (
        <p className="text-sm text-slate-500">
          Last login: {new Date(user.last_login_at).toLocaleString("en-IN")}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save profile"}
        </button>
        <Link href="/admin/users" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Back to users
        </Link>
      </div>
    </form>
  );
}
