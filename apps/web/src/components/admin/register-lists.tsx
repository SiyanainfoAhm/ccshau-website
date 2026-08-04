"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { deleteDepartmentAction, deleteFacultyAction } from "@/actions/college-register";
import type { DepartmentOption, FacultyListItem } from "@/lib/pages/college-register-helpers";

function DeleteRowButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      title={`Delete ${label}`}
      onClick={() => {
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
        startTransition(async () => {
          const result = await onConfirm();
          if (!result.success) {
            alert(result.error ?? "Delete failed.");
            return;
          }
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      Delete
    </button>
  );
}

export function DepartmentRegisterList({
  departments,
  collegePageId,
  canEdit = true,
  canDelete = true,
}: {
  departments: DepartmentOption[];
  collegePageId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const showCollege = !collegePageId;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-display text-lg font-bold text-slate-900">Registered departments</h2>
        <p className="text-xs text-slate-500">{departments.length} department{departments.length === 1 ? "" : "s"}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {showCollege && (
                <th className="px-4 py-3 text-left font-semibold text-slate-700">College</th>
              )}
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Slug</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={showCollege ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                  No departments registered yet.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/80">
                  {showCollege && <td className="px-4 py-3 text-slate-600">{dept.college_title}</td>}
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={`/admin/register/department/${dept.id}`}
                      className="hover:text-emerald-800 hover:underline"
                    >
                      {dept.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{dept.sort_order}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{dept.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit ? (
                        <Link
                          href={`/admin/register/department/${dept.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/register/department/${dept.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          View
                        </Link>
                      )}
                      {canDelete && (
                        <DeleteRowButton
                          label={dept.title_en}
                          onConfirm={() => deleteDepartmentAction(dept.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FacultyRegisterList({
  faculty,
  collegePageId,
  canEdit = true,
  canDelete = true,
}: {
  faculty: FacultyListItem[];
  collegePageId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const showCollege = !collegePageId;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-display text-lg font-bold text-slate-900">Registered faculty</h2>
        <p className="text-xs text-slate-500">{faculty.length} member{faculty.length === 1 ? "" : "s"}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {showCollege ? (
                <th className="px-4 py-3 text-left font-semibold text-slate-700">College / Department</th>
              ) : (
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              )}
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Designation</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {faculty.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No faculty registered yet.
                </td>
              </tr>
            ) : (
              faculty.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-600">
                    {showCollege ? (
                      <>
                        <span className="block text-slate-500">{member.college_title}</span>
                        <span>{member.department_title}</span>
                      </>
                    ) : (
                      member.department_title
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={`/admin/register/faculty/${member.id}`}
                      className="hover:text-emerald-800 hover:underline"
                    >
                      {member.name_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        member.member_type === "hod"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {member.member_type === "hod" ? "HOD" : "Faculty"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{member.sort_order}</td>
                  <td className="px-4 py-3 text-slate-600">{member.designation_en}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {member.detail_href && (
                        <a
                          href={member.detail_href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          Public
                        </a>
                      )}
                      {canEdit ? (
                        <Link
                          href={`/admin/register/faculty/${member.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/register/faculty/${member.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          View
                        </Link>
                      )}
                      {canDelete && (
                        <DeleteRowButton
                          label={member.name_en}
                          onConfirm={() => deleteFacultyAction(member.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
