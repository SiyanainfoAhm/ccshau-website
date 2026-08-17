import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getDepartmentsForRegisterForm,
  getFacultyForEdit,
  requireCollegeRegisterAdminOrRedirect,
} from "@/actions/college-register";
import { RegisterFacultyForm } from "@/components/admin/register-faculty-form";
import { canEditPages } from "@/lib/auth/college-scope";

export default async function EditFacultyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCollegeRegisterAdminOrRedirect();
  const canEdit = canEditPages(session);
  const { id } = await params;
  const [facultyData, departments] = await Promise.all([
    getFacultyForEdit(id),
    getDepartmentsForRegisterForm(),
  ]);

  if (!facultyData) notFound();
  if (facultyData.personId) {
    redirect(`/admin/register/faculty/person/${facultyData.personId}`);
  }

  const returnHref = `/admin/register/${facultyData.department.college_root_id}/faculty`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={returnHref} className="text-sm text-emerald-700 hover:underline">
          ← Faculty
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
          {canEdit ? "Edit faculty" : "View faculty"}
        </h1>
        <p className="text-sm text-slate-500">
          {facultyData.staff.name_en} — {facultyData.department.college_title} / {facultyData.department.title_en}
        </p>
        {!canEdit && (
          <p className="mt-2 text-sm text-slate-500">Read-only — you do not have permission to update this profile.</p>
        )}
      </div>
      <RegisterFacultyForm
        departments={departments}
        faculty={facultyData.staff}
        returnHref={returnHref}
        readOnly={!canEdit}
      />
    </div>
  );
}
