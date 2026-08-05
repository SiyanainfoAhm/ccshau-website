"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  updateDepartmentModulesAction,
  type DepartmentModuleView,
} from "@/actions/department-modules";
import { ALL_CMS_MODULES } from "@/lib/auth/cms-module-access";
import type { CmsModule } from "@/lib/database/types";

const MODULE_LABELS: Record<CmsModule, string> = {
  pages: "Pages",
  news: "News & notices",
  circulars: "Circulars",
  tenders: "Tenders",
  downloads: "Downloads",
  media: "Media gallery",
  feedback: "Feedback",
};

export function DepartmentModulesPanel({ departments }: { departments: DepartmentModuleView[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedDeptId, setSavedDeptId] = useState<string | null>(null);

  function handleSave(departmentId: string, formData: FormData) {
    setError(null);
    setSavedDeptId(null);
    startTransition(async () => {
      const result = await updateDepartmentModulesAction(departmentId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSavedDeptId(departmentId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <p className="text-sm text-slate-600">
        Restrict which CMS modules each department can access. Leave all modules unchecked for{" "}
        <strong>unrestricted</strong> access (legacy directorates). Computer Section users should
        use the <strong>Super Admin</strong> or <strong>University Admin</strong> role for full
        technical control.
      </p>

      <div className="space-y-4">
        {departments.map((dept) => (
          <form
            key={dept.id}
            action={(formData) => handleSave(dept.id, formData)}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">{dept.name_en}</h2>
                <p className="text-xs text-slate-500">{dept.slug}</p>
                {dept.unrestricted ? (
                  <p className="mt-1 text-xs font-medium text-amber-700">Unrestricted — all content modules</p>
                ) : (
                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    Restricted — {dept.modules.length} module{dept.modules.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-ccshau-chrome-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {ALL_CMS_MODULES.map((module) => (
                <label
                  key={module}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="modules"
                    value={module}
                    defaultChecked={dept.modules.includes(module)}
                    className="rounded border-slate-300"
                  />
                  {MODULE_LABELS[module]}
                </label>
              ))}
            </div>

            {savedDeptId === dept.id && (
              <p className="mt-3 text-sm text-emerald-700">Saved.</p>
            )}
          </form>
        ))}
      </div>
    </div>
  );
}
