"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

import { AdminDialog } from "@/components/admin/admin-dialog";
import { RegisterFacultyForm } from "@/components/admin/register-faculty-form";
import { AssignExistingFacultyForm } from "@/components/admin/assign-existing-faculty-form";
import { FacultyRegisterList } from "@/components/admin/register-lists";
import { FacultyDuplicateFinder } from "@/components/admin/faculty-duplicate-finder";
import type { CollegeOption, DepartmentOption, FacultyListItem } from "@/lib/pages/college-register-helpers";

export function FacultyRegisterPage({
  college,
  departments,
  faculty,
  canEdit = true,
  canDelete = true,
  backHref,
  backLabel,
  hideDepartmentCta = false,
}: {
  college: CollegeOption;
  departments: DepartmentOption[];
  faculty: FacultyListItem[];
  canEdit?: boolean;
  canDelete?: boolean;
  backHref?: string;
  backLabel?: string;
  hideDepartmentCta?: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const collegeBase = `/admin/register/${college.id}`;
  const resolvedBackHref = backHref ?? collegeBase;
  const resolvedBackLabel = backLabel ?? college.title_en;

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
          <Link href={resolvedBackHref} className="text-sm text-emerald-700 hover:underline">
            ← {resolvedBackLabel}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Faculty</h1>
          <p className="text-sm text-slate-500">
            {hideDepartmentCta
              ? "You can update only your own profile from My profile."
              : canEdit
                ? `One shared profile per person. Add new, or assign an existing person to another department with a local designation.`
                : `View HOD and faculty for ${college.title_en}.`}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              disabled={departments.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add existing
            </button>
            <button
              type="button"
              onClick={openDialog}
              disabled={departments.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add new
            </button>
          </div>
        )}
      </div>

      {canEdit && departments.length === 0 && !hideDepartmentCta && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Register a department first before adding faculty.{" "}
          <Link href={`${collegeBase}/department`} className="font-medium underline">
            Go to Departments
          </Link>
        </p>
      )}

      <FacultyRegisterList
        faculty={faculty}
        departments={departments}
        collegePageId={college.id}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {canEdit ? <FacultyDuplicateFinder collegePageId={college.id} /> : null}

      {canEdit && (
      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add faculty"
        description="Add faculty or Head of Department — both are managed in one list."
      >
        <RegisterFacultyForm
          key={formKey}
          departments={departments}
          returnHref={`${collegeBase}/faculty`}
          inDialog
          onCancel={() => setDialogOpen(false)}
          onSuccess={handleSuccess}
        />
      </AdminDialog>
      )}
      {canEdit && (
      <AdminDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign existing faculty"
        description="Attach a person who already has a profile. Only designation is local to this department."
      >
        <AssignExistingFacultyForm
          departments={departments}
          inDialog
          onCancel={() => setAssignOpen(false)}
          onSuccess={() => {
            setAssignOpen(false);
            router.refresh();
          }}
        />
      </AdminDialog>
      )}
    </div>
  );
}
