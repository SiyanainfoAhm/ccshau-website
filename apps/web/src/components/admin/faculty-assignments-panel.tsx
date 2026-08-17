"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteFacultyAction, updateFacultyAssignmentAction } from "@/actions/college-register";
import { AssignExistingFacultyForm } from "@/components/admin/assign-existing-faculty-form";
import type { FacultyAssignment } from "@/lib/database/types";

type AssignmentRow = {
  assignment: FacultyAssignment;
  departmentTitle: string;
  collegeTitle: string;
  canEdit: boolean;
};

type DepartmentOption = {
  id: string;
  title_en: string;
  college_title: string;
};

export function FacultyAssignmentsPanel({
  personId,
  personName,
  assignments,
  departments,
  canEdit = true,
}: {
  personId: string;
  personName: string;
  assignments: AssignmentRow[];
  departments: DepartmentOption[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignedPageIds = new Set(assignments.map((row) => row.assignment.page_id));
  const availableDepartments = departments.filter((d) => !assignedPageIds.has(d.id));

  function handleUpdate(assignmentId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateFacultyAssignmentAction(assignmentId, formData);
      if (!result.success) {
        setError(result.error ?? "Save failed.");
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleRemove(staffId: string | null, label: string) {
    if (!staffId) {
      setError("This assignment has no staff row to remove.");
      return;
    }
    if (!confirm(`Remove ${personName} from ${label}? The shared profile is kept.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteFacultyAction(staffId);
      if (!result.success) {
        setError(result.error ?? "Remove failed.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assignments</h2>
          <p className="mt-1 text-xs text-slate-500">
            Designation and HOD/Faculty role are local to each department. Profile content is shared.
          </p>
        </div>
        {canEdit && availableDepartments.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowAssign((open) => !open)}
            className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            {showAssign ? "Close" : "Assign to another department"}
          </button>
        ) : null}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showAssign && canEdit ? (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
          <AssignExistingFacultyForm
            departments={availableDepartments}
            defaultPersonId={personId}
            defaultPersonName={personName}
            inDialog
            onCancel={() => setShowAssign(false)}
            onSuccess={() => {
              setShowAssign(false);
              router.refresh();
            }}
          />
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {assignments.map((row) => {
          const item = row.assignment;
          const editing = editingId === item.id;
          return (
            <li key={item.id} className="rounded-lg border border-slate-100 p-3">
              {editing ? (
                <form
                  action={(formData) => handleUpdate(item.id, formData)}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <p className="text-sm font-medium text-slate-800 md:col-span-2">
                    {row.collegeTitle ? `${row.collegeTitle} → ` : ""}
                    {row.departmentTitle}
                  </p>
                  <label className="block text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Designation</span>
                    <input name="designationEn" required defaultValue={item.designation_en} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Designation (Hindi)</span>
                    <input name="designationHi" defaultValue={item.designation_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Role</span>
                    <select name="memberType" defaultValue={item.member_type} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                      <option value="faculty">Faculty</option>
                      <option value="hod">Head of Department</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Display order</span>
                    <input name="sortOrder" type="number" min={0} defaultValue={item.sort_order} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Specialization override (optional)</span>
                    <textarea name="specializationEn" rows={2} defaultValue={item.specialization_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                  <div className="flex gap-2 md:col-span-2">
                    <button type="submit" disabled={isPending} className="rounded-lg bg-ccshau-chrome-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                      Save assignment
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {row.collegeTitle ? `${row.collegeTitle} → ` : ""}
                      {row.departmentTitle}
                    </p>
                    <p className="text-sm text-slate-600">
                      {item.designation_en}
                      <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.member_type === "hod" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                        {item.member_type === "hod" ? "HOD" : "Faculty"}
                      </span>
                      {!item.is_active ? <span className="ml-2 text-xs text-slate-400">Inactive</span> : null}
                    </p>
                  </div>
                  {row.canEdit && canEdit ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingId(item.id)} className="rounded px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
                        Edit designation
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemove(item.source_staff_id, row.departmentTitle)}
                        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
