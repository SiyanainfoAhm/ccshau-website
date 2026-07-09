"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

import { AdminDialog } from "@/components/admin/admin-dialog";
import { RegisterDepartmentForm } from "@/components/admin/register-forms";
import { DepartmentRegisterList } from "@/components/admin/register-lists";
import type { CollegeOption, DepartmentOption } from "@/lib/pages/college-register-helpers";

export function DepartmentRegisterPage({
  college,
  colleges,
  departments,
  canEdit = true,
  canDelete = true,
}: {
  college: CollegeOption;
  colleges: CollegeOption[];
  departments: DepartmentOption[];
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const collegeBase = `/admin/register/${college.id}`;

  function openDialog() {
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleSuccess() {
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={collegeBase} className="text-sm text-emerald-700 hover:underline">
            ← {college.title_en}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500">
            {canEdit
              ? `View, edit, or delete departments for ${college.title_en}.`
              : `View departments for ${college.title_en}.`}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openDialog}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add new
          </button>
        )}
      </div>

      <DepartmentRegisterList
        departments={departments}
        collegePageId={college.id}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {canEdit && (
      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add department"
        description={`Create a new department under ${college.title_en}.`}
      >
        <RegisterDepartmentForm
          key={formKey}
          colleges={colleges}
          defaultCollegeId={college.id}
          returnHref={`${collegeBase}/department`}
          inDialog
          onCancel={() => setDialogOpen(false)}
          onSuccess={handleSuccess}
        />
      </AdminDialog>
      )}
    </div>
  );
}
